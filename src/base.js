// Fictional air-defence site "AEGIS RIDGE": terrain, concrete apron, command
// shelter, radar installation and all of the support clutter that makes the
// place read as a real emplacement. Everything is procedural and merged per
// material to keep the draw-call count low.

import * as THREE from 'three';
import { WORLD, PLAYER } from './config.js';
import { noise } from './util/noise.js';
import { RNG } from './util/rng.js';
import { materials, std, lamp, applyAtmosphere } from './util/materials.js';
import {
  chamferBox,
  corrugatedPanel,
  cylinder,
  mergeParts,
  transform,
  trussSegment,
  ladder,
  handrail,
  wheel,
  cableGeometry,
  pathTube,
  ribbedTube,
  greebleField,
  latheProfile,
  boltRow,
} from './util/geom.js';
import {
  padMarkingsDecal,
  stencilDecal,
  warningStripes,
  chainLinkTexture,
  wornTrackTexture,
  softSprite,
  hardstandConcreteMaps,
  dryConcreteMaps,
  desertGroundMaps,
  apronWearTexture,
  apronJointTexture,
  groundStainAtlas,
  hardcoreMaps,
  burlapMaps,
  fabricMaps,
  gabionTexture,
  camoNetTexture,
  signBoardTexture,
  helipadDecal,
  plywoodMaps,
  unitFlagTexture,
} from './util/textures.js';

/**
 * World size of one `hardcoreMaps` tile, in metres. The generator draws stones
 * that read as 2–7 cm chippings at this scale; stretched over the 6 m tiles the
 * surfacing used to run at, the same stones came out half a metre across and
 * the roads and hardstanding turned into leopard print.
 */
const GRAVEL_TILE = 1.4;

const smoothstep = (a, b, x) => {
  const t = THREE.MathUtils.clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

/**
 * Meander line of the dry wash that runs north–south across the approach road
 * east of the gate. Returns how deep the channel is cut at (x, z), in metres.
 */
export function washDepth(x, z) {
  const cx = 296 + Math.sin(z * 0.0037) * 52 + Math.sin(z * 0.0011 + 1.3) * 86;
  const halfW = 22 + Math.sin(z * 0.0026 + 0.7) * 6;
  const d = Math.abs(x - cx);
  if (d > halfW) return 0;
  const t = 1 - d / halfW;
  // Flat scoured bed with steep cut banks, plus a little braiding.
  const bed = Math.pow(t, 0.55);
  return bed * (3.2 + Math.sin(z * 0.017) * 0.55) * (0.9 + noise.fbm2(x * 0.02, z * 0.02, 2) * 0.2);
}

function terrainBase(x, z, r) {
  // The regional elevation field swings tens of metres inside half a kilometre
  // of the site. Run straight up against the dead-flat pad that builds a smooth
  // rim just outside the apron, which walls the low horizon off from the
  // operating area — and the pad has to keep a clear view of descending targets
  // and rising rounds. So the large scales are held back and only reach full
  // strength kilometres out, where the same relief stays under a degree.
  const macro = smoothstep(300, 5200, r);
  let h = 0;
  h += noise.fbm2(x * 0.00085, z * 0.00085, 4) * 13 * macro;
  h += noise.fbm2(x * 0.00019, z * 0.00019, 4) * 82 * macro;
  // Low dunes over the graded plain, so the near desert is not a flat sheet.
  // Amplitude is tied to range and capped, which keeps a crest below the
  // skyline no matter which bearing the player faces.
  const open = smoothstep(WORLD.baseRadius + 20, WORLD.baseRadius + 150, r);
  h += noise.fbm2(x * 0.0021 + 11, z * 0.0021 - 5, 3) * Math.min(7.5, r * 0.0055) * open;
  // dune ripples
  h += Math.sin(x * 0.0043 + noise.simplex2(x * 0.0006, z * 0.0006) * 2.4) * 1.6 * smoothstep(200, 900, r);
  // erosion gullies on the mid-distance apron slopes
  const gully = Math.max(0, noise.ridged2(x * 0.0049 + 3.1, z * 0.0049 - 7.4, 3, 2.1, 0.55));
  h -= Math.pow(gully, 3.1) * 6.5 * smoothstep(320, 900, r) * (1 - smoothstep(2400, 4400, r));
  const mt = smoothstep(4600, 12000, r) * (1 - smoothstep(29000, 44000, r));
  if (mt > 0) {
    const ridge = Math.pow(Math.max(0, noise.ridged2(x * 0.000058, z * 0.000058, 6, 2.07, 0.52)), 1.35);
    const ridge2 = Math.pow(Math.max(0, noise.ridged2(x * 0.000021 + 9, z * 0.000021 - 4, 4, 2.1, 0.55)), 1.2);
    h += mt * (ridge * 2150 + ridge2 * 1500);
  }
  return h;
}

/** Single source of truth for ground elevation, shared by placement + collision. */
export function terrainHeight(x, z) {
  const r = Math.hypot(x, z);
  // The graded pad is dead flat, then blends into rolling desert.
  const blend = smoothstep(WORLD.baseRadius + 18, WORLD.baseRadius + 190, r);
  if (blend <= 0) return 0;
  return (terrainBase(x, z, r) - washDepth(x, z)) * blend;
}

/** Ground level ignoring the wash — the level the road embankment is carried at. */
function terrainHeightUncut(x, z) {
  const r = Math.hypot(x, z);
  const blend = smoothstep(WORLD.baseRadius + 18, WORLD.baseRadius + 190, r);
  if (blend <= 0) return 0;
  return terrainBase(x, z, r) * blend;
}

function terrainNormalY(x, z, e = 6) {
  const hL = terrainHeight(x - e, z);
  const hR = terrainHeight(x + e, z);
  const hD = terrainHeight(x, z - e);
  const hU = terrainHeight(x, z + e);
  const n = new THREE.Vector3(hL - hR, 2 * e, hD - hU).normalize();
  return n;
}

/* --------------------------------------------------------------- terrain */

/**
 * Hardpan albedo. The ground sheet is seen almost edge-on from the pad, where
 * a saturated tint stacks up into a solid orange wall on the horizon; a
 * desaturated tan holds up both underfoot and at that grazing angle.
 */
const GROUND_TINT = '#a89578';

/**
 * Radius inside which the desert sheet is cut away entirely.
 *
 * The sheet used to run on under the whole site five centimetres below the
 * apron pour, and at that separation the two traded depth-buffer wins: the sand
 * took the first few metres in front of the player and the concrete took
 * everything beyond, meeting on a hard line across the pad. Nothing under the
 * surfacing is ever seen, so the cheapest way to settle it is to not build it.
 * The cut stops short of the apron edge by less than one cell, and the gravel
 * skirt runs thirty metres past that, so no hole is ever exposed.
 */
const PAD_CUT = WORLD.baseRadius + 9;

function buildTerrain(quality) {
  const group = new THREE.Group();

  const nearSize = 1300;
  const nearSeg = Math.max(64, Math.round(quality.terrainSegments));
  const near = new THREE.PlaneGeometry(nearSize, nearSize, nearSeg, nearSeg);
  near.rotateX(-Math.PI / 2);
  displace(near, 0);
  cutPad(near);
  {
    // World-space UVs: one texture tile every 18 m.
    const p = near.attributes.position;
    const uv = near.attributes.uv;
    for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / 18, p.getZ(i) / 18);
  }
  // The shared sand mix is tuned for mid-distance, where its dark gravel layer
  // mips into an even brown. The player walks on this sheet, and from two
  // metres away that layer is a hard orange-and-black rash, so the ground gets
  // its own low-contrast hardpan instead.
  const groundMat = std({
    ...tiled(desertGroundMaps(512, GROUND_TINT), 1, 1),
    color: 0xffffff,
    roughness: 1,
    metalness: 0,
    envMapIntensity: 0.28,
    normalScale: new THREE.Vector2(0.3, 0.3),
    vertexColors: true,
  });
  const nearMesh = new THREE.Mesh(near, groundMat);
  nearMesh.receiveShadow = true;
  nearMesh.name = 'terrain.near';
  group.add(nearMesh);

  // Polar far field: dense near the site, coarse toward the mountain ring.
  const rings = Math.max(80, Math.round(quality.terrainSegments * 0.8));
  const sectors = 168;
  const r0 = 560;
  const r1 = WORLD.terrainOuter;
  const pos = [];
  const idx = [];
  const uv = [];
  for (let i = 0; i <= rings; i++) {
    const t = i / rings;
    const r = r0 + (r1 - r0) * Math.pow(t, 2.35);
    for (let j = 0; j <= sectors; j++) {
      const a = (j / sectors) * Math.PI * 2;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      pos.push(x, terrainHeight(x, z) - 0.2, z);
      // Coarser tiling far out where texel density no longer matters.
      uv.push(x / 60, z / 60);
    }
  }
  for (let i = 0; i < rings; i++) {
    for (let j = 0; j < sectors; j++) {
      const a = i * (sectors + 1) + j;
      const b = a + sectors + 1;
      idx.push(a, b, a + 1, a + 1, b, b + 1);
    }
  }
  const far = new THREE.BufferGeometry();
  far.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  far.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  far.setIndex(idx);
  far.computeVertexNormals();
  colorize(far);
  // Same hardpan at a coarser tile so the two sheets never show a tone seam
  // where they overlap.
  const farMat = std({
    ...tiled(desertGroundMaps(512, GROUND_TINT), 1, 1),
    color: 0xffffff,
    roughness: 1,
    metalness: 0,
    envMapIntensity: 0.28,
    normalScale: new THREE.Vector2(0.25, 0.25),
    vertexColors: true,
  });
  const farMesh = new THREE.Mesh(far, farMat);
  // Starts at 560 m, well outside the sun's 260 m shadow volume, so it is left
  // out of the receive path; `terrain.near` covers everything shadows reach.
  farMesh.receiveShadow = false;
  farMesh.name = 'terrain.far';
  group.add(farMesh);

  function displace(geo, yOff) {
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i);
      const z = p.getZ(i);
      p.setY(i, terrainHeight(x, z) + yOff);
    }
    geo.computeVertexNormals();
    colorize(geo);
  }

  /** Drop every triangle that lies wholly under the surfaced site. */
  function cutPad(geo) {
    const p = geo.attributes.position;
    const idx = geo.index;
    const kept = [];
    for (let i = 0; i < idx.count; i += 3) {
      let outside = false;
      for (let k = 0; k < 3 && !outside; k++) {
        const v = idx.getX(i + k);
        if (Math.hypot(p.getX(v), p.getZ(v)) >= PAD_CUT) outside = true;
      }
      if (outside) kept.push(idx.getX(i), idx.getX(i + 1), idx.getX(i + 2));
    }
    geo.setIndex(kept);
  }

  /**
   * Vertex colours are tint multipliers around 1.0, not absolute albedo — the
   * sand map already carries the base colour.
   */
  function colorize(geo) {
    const p = geo.attributes.position;
    const n = geo.attributes.normal;
    const col = new Float32Array(p.count * 3);
    const rock = new THREE.Color(1.02, 1.0, 0.98);
    const scrub = new THREE.Color(0.9, 0.93, 0.83);
    const high = new THREE.Color(0.74, 0.73, 0.76);
    const c = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i);
      const y = p.getY(i);
      const z = p.getZ(i);
      const slope = 1 - THREE.MathUtils.clamp(n.getY(i), 0, 1);
      const alt = THREE.MathUtils.clamp(y / 1600, 0, 1);
      const v = noise.fbm2(x * 0.0012, z * 0.0012, 3) * 0.5 + 0.5;
      const w = noise.fbm2(x * 0.012 + 40, z * 0.012 - 20, 2) * 0.5 + 0.5;
      c.setRGB(1, 1, 1).lerp(scrub, v * 0.4);
      c.lerp(rock, THREE.MathUtils.clamp(slope * 2.6, 0, 1));
      c.lerp(high, alt * 0.7);
      c.multiplyScalar(0.9 + w * 0.2);
      col[i * 3] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  }

  return group;
}

/* --------------------------------------------------- site material library */

/** Clone a generator's map set so each surface can carry its own UV tiling. */
function tiled(maps, rx, ry = rx) {
  const out = {};
  for (const [k, v] of Object.entries(maps)) {
    const t = v.clone();
    t.needsUpdate = true;
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(rx, ry);
    out[k] = t;
  }
  return out;
}

let siteLib = null;

/**
 * Materials introduced by the environment pass. Kept in one shared table so
 * every surfacing mesh that uses a given mix merges into a single draw call.
 * Albedo always lives in the map, so `color` stays white.
 */
function siteMaterials() {
  if (siteLib) return siteLib;
  const net = camoNetTexture(512).clone();
  net.needsUpdate = true;
  net.wrapS = THREE.RepeatWrapping;
  net.wrapT = THREE.RepeatWrapping;
  const track = wornTrackTexture(256).clone();
  track.needsUpdate = true;
  track.wrapS = THREE.ClampToEdgeWrapping;
  track.wrapT = THREE.RepeatWrapping;
  const joint = apronJointTexture(256).clone();
  joint.needsUpdate = true;
  joint.wrapS = THREE.RepeatWrapping;
  joint.wrapT = THREE.RepeatWrapping;

  const groundDecal = (map, offset) =>
    applyAtmosphere(
      new THREE.MeshStandardMaterial({
        map,
        color: 0xffffff,
        transparent: true,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: offset,
        polygonOffsetUnits: offset,
        roughness: 1,
        metalness: 0,
        envMapIntensity: 0.12,
      })
    );

  siteLib = {
    // Main apron pour: dry, sun-bleached, matte. The shared `concretePad` mix
    // bakes a wide-range roughness map, which let the sky probe turn the low
    // patches into a wet-looking sheen across the whole pad.
    apron: std({
      ...tiled(dryConcreteMaps(512, '#b3ab99', 11), 1, 1),
      color: 0xffffff,
      roughness: 1,
      metalness: 0,
      envMapIntensity: 0.08,
      normalScale: new THREE.Vector2(0.28, 0.28),
    }),
    // Battery hardstands: a later, greyer pour than the surrounding apron.
    hardstand: std({
      ...tiled(dryConcreteMaps(512, '#a49d8e', 23), 1, 1),
      color: 0xffffff,
      roughness: 1,
      metalness: 0,
      envMapIntensity: 0.08,
      normalScale: new THREE.Vector2(0.3, 0.3),
    }),
    // Structural concrete — plinths, kerbs, headwalls, bunds. Same dry mix as
    // the apron at a 5 m tile, which stops small members reading as masonry.
    concrete: std({
      ...tiled(dryConcreteMaps(512, '#b6ae9d', 17), 1 / 5, 1 / 5),
      color: 0xffffff,
      roughness: 1,
      metalness: 0,
      envMapIntensity: 0.12,
      normalScale: new THREE.Vector2(0.4, 0.4),
    }),
    // A third pour for the helipad and generator slabs, so the site does not
    // look like it was all poured on the same morning. Its baked roughness map
    // dips low enough to catch a sheen, so the scalar takes over instead.
    pourLate: (() => {
      const m = std({
        ...tiled(hardstandConcreteMaps(512), 1, 1),
        color: 0xffffff,
        roughness: 1,
        metalness: 0,
        envMapIntensity: 0.08,
        normalScale: new THREE.Vector2(0.26, 0.26),
      });
      m.roughnessMap = null;
      return m;
    })(),
    // The aggregate surfacing carries as much sky fill as the terrain it runs
    // over (0.28). Starved of it the same tint comes back pure warm sun and the
    // roads and hardstanding read a much stronger ochre than the sand around
    // them, as if they were a different material entirely.
    gravel: std({
      ...tiled(hardcoreMaps(512, '#aca596'), 1, 1),
      color: 0xffffff,
      roughness: 1,
      metalness: 0,
      envMapIntensity: 0.3,
      normalScale: new THREE.Vector2(0.6, 0.6),
    }),
    // Bulldozed spoil for the bunker berm and the drifts: warmer and less
    // graded than the running surfaces, so a mound reads as pushed-up earth.
    spoil: std({
      ...tiled(hardcoreMaps(512, '#a08e6e'), 1, 1),
      color: 0xffffff,
      roughness: 1,
      metalness: 0,
      envMapIntensity: 0.26,
      normalScale: new THREE.Vector2(0.5, 0.5),
    }),
    gravelDark: std({
      ...tiled(hardcoreMaps(512, '#8e887a'), 1, 1),
      color: 0xffffff,
      roughness: 1,
      metalness: 0,
      envMapIntensity: 0.3,
      normalScale: new THREE.Vector2(0.6, 0.6),
    }),
    burlap: std({ ...tiled(burlapMaps(256, '#9c8862'), 1, 1), color: 0xffffff, roughness: 1, metalness: 0, envMapIntensity: 0.14 }),
    canvas: std({
      ...tiled(fabricMaps(512, '#7d7458'), 1, 1),
      color: 0xffffff,
      roughness: 1,
      metalness: 0,
      envMapIntensity: 0.2,
      side: THREE.DoubleSide,
    }),
    canvasTan: std({
      ...tiled(fabricMaps(512, '#9d8b63'), 1, 1),
      color: 0xffffff,
      roughness: 1,
      metalness: 0,
      envMapIntensity: 0.2,
      side: THREE.DoubleSide,
    }),
    gabion: std({ ...tiled(gabionTexture(256), 1, 1), color: 0xffffff, roughness: 1, metalness: 0.05, envMapIntensity: 0.2 }),
    timber: std({ ...tiled(plywoodMaps(256), 1, 1), color: 0xffffff, roughness: 0.94, metalness: 0, envMapIntensity: 0.25 }),
    camoNet: applyAtmosphere(
      new THREE.MeshStandardMaterial({
        map: net,
        color: 0xffffff,
        transparent: true,
        alphaTest: 0.32,
        side: THREE.DoubleSide,
        roughness: 1,
        metalness: 0,
        envMapIntensity: 0.2,
      })
    ),
    stain: groundDecal(groundStainAtlas(512), -6),
    wear: groundDecal(apronWearTexture(512), -3),
    // Held well back from full strength: at grazing angles a 380 m grid of
    // hard black lines aliases into a moire across the whole pad.
    joints: (() => {
      const m = groundDecal(joint, -4);
      m.opacity = 0.55;
      return m;
    })(),
    tracks: groundDecal(track, -5),
    netTexture: net,
  };
  return siteLib;
}

/* ------------------------------------------------------------------- pad */

/** Atlas quadrant offsets for `groundStainAtlas` (UVs are flipped in Y). */
const STAIN = { dust: [0, 0], rubber: [0.5, 0], oil: [0, 0.5], patch: [0.5, 0.5] };

/** Ground-hugging quad carrying one quadrant of the stain atlas. */
function stainQuad(x, z, w, d, rot, quad) {
  const g = new THREE.PlaneGeometry(w, d);
  g.rotateX(-Math.PI / 2);
  g.rotateY(rot);
  g.translate(x, 0, z);
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, quad[0] + uv.getX(i) * 0.5, quad[1] + uv.getY(i) * 0.5);
  return g;
}

/**
 * Flat disc lying on the pad, tessellated into rings, with world-space UVs.
 *
 * `CircleGeometry` fans every triangle off one centre vertex, so the apron is
 * 96 slivers each 190 m long. Seen from standing height those are almost
 * edge-on, the UV gradient across one runs off the end of the mip chain, and
 * the concrete under the player collapses into flat wedges of colour with the
 * desert sheet cutting across them. Rings hold every triangle to a few metres
 * for a few thousand more of them.
 */
function discGeometry(radius, uvScale, opts = {}) {
  const { cell = 4, sectors = 96, uvOffset = [0, 0] } = opts;
  const rings = Math.max(1, Math.round(radius / cell));
  const step = radius / rings;
  // A few geometric steps first: the innermost band is directly under the
  // player's feet, where a whole cell's worth of sliver would still smear.
  const radii = [step * 0.12, step * 0.3, step * 0.58];
  for (let i = 1; i <= rings; i++) radii.push(step * i);

  const pos = [0, 0, 0];
  const nrm = [0, 1, 0];
  const uv = [uvOffset[0], uvOffset[1]];
  for (const r of radii) {
    for (let j = 0; j < sectors; j++) {
      const a = (j / sectors) * Math.PI * 2;
      const x = Math.cos(a) * r;
      const z = -Math.sin(a) * r;
      pos.push(x, 0, z);
      nrm.push(0, 1, 0);
      uv.push(x / uvScale + uvOffset[0], z / uvScale + uvOffset[1]);
    }
  }
  const at = (ring, j) => 1 + ring * sectors + (j % sectors);
  const idx = [];
  for (let j = 0; j < sectors; j++) idx.push(at(0, j), at(0, j + 1), 0);
  for (let i = 0; i < radii.length - 1; i++) {
    for (let j = 0; j < sectors; j++) {
      const a = at(i, j);
      const b = at(i, j + 1);
      const c = at(i + 1, j);
      const d = at(i + 1, j + 1);
      idx.push(c, d, a, a, d, b);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  return g;
}

/** Chamfered rectangular slab lying on the pad, with world-space UVs. */
function slabGeometry(cx, cz, w, d, yaw, uvScale, chamfer = 1.6) {
  const shape = new THREE.Shape();
  const hw = w / 2;
  const hd = d / 2;
  const c = chamfer;
  shape.moveTo(-hw + c, -hd);
  shape.lineTo(hw - c, -hd);
  shape.lineTo(hw, -hd + c);
  shape.lineTo(hw, hd - c);
  shape.lineTo(hw - c, hd);
  shape.lineTo(-hw + c, hd);
  shape.lineTo(-hw, hd - c);
  shape.lineTo(-hw, -hd + c);
  shape.closePath();
  const g = new THREE.ShapeGeometry(shape, 1);
  g.rotateX(-Math.PI / 2);
  g.rotateY(yaw);
  g.translate(cx, 0, cz);
  const pos = g.attributes.position;
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, pos.getX(i) / uvScale, pos.getZ(i) / uvScale);
  return g;
}

/** Battery hardstand slabs, each big enough to hold its pair of vehicles. */
const HARDSTANDS = [
  { pos: [-64, 3], size: [36, 68], yaw: 0.03 },
  { pos: [66, -11], size: [42, 76], yaw: -0.08 },
  { pos: [4, -96], size: [50, 44], yaw: 0.05 },
];

function buildPad(rng) {
  const g = new THREE.Group();
  g.name = 'pad';
  const mats = materials();
  const site = siteMaterials();
  const R = WORLD.baseRadius;

  // ---- main apron ----------------------------------------------------
  // One texture tile every 24 m; the joint decal below runs on an 8 m grid, so
  // three bays fit a tile and the two never beat against each other.
  const apron = discGeometry(R, 24);
  const apronMesh = new THREE.Mesh(apron, site.apron);
  apronMesh.position.y = 0.05;
  apronMesh.receiveShadow = true;
  g.add(apronMesh);

  // ---- expansion-joint grid -------------------------------------------
  const jointGeo = discGeometry(R - 0.6, 8);
  const joints = new THREE.Mesh(jointGeo, site.joints);
  joints.position.y = 0.056;
  // Ground decals sit over the apron, so they have to be shadowed with it or
  // they punch bright patches through anything the sun puts on the concrete.
  joints.receiveShadow = true;
  g.add(joints);

  // ---- large-scale grime ------------------------------------------------
  // Without this the pad is one flat tone from 150 m up. Tiled at 96 m so it
  // drifts slowly and never lines up with the concrete or the joint grid.
  // Tiled at 96 m, so it can carry a coarser mesh than the concrete under it.
  const wearGeo = discGeometry(R - 0.2, 96, { cell: 8, sectors: 64, uvOffset: [0.13, 0.41] });
  const wear = new THREE.Mesh(wearGeo, site.wear);
  wear.position.y = 0.058;
  wear.receiveShadow = true;
  g.add(wear);

  // ---- battery hardstands ---------------------------------------------
  const slabParts = [];
  const kerbParts = [];
  for (const hs of HARDSTANDS) {
    slabParts.push({ geometry: slabGeometry(hs.pos[0], hs.pos[1], hs.size[0], hs.size[1], hs.yaw, 16, 2.2) });
    // Low kerb down the two long flanks, broken so vehicles can drive off.
    const hw = hs.size[0] / 2;
    const hd = hs.size[1] / 2;
    const long = hs.size[1] > hs.size[0];
    const runLen = (long ? hd : hw) * 0.78;
    for (const s of [-1, 1]) {
      const kerb = chamferBox(long ? 0.4 : runLen * 2, 0.26, long ? runLen * 2 : 0.4, 0.06);
      kerbParts.push({
        geometry: kerb,
        matrix: transform({
          pos: [
            hs.pos[0] + (long ? s * hw * Math.cos(hs.yaw) : 0),
            0.16,
            hs.pos[1] + (long ? -s * hw * Math.sin(hs.yaw) : s * hd),
          ],
          rot: [0, hs.yaw, 0],
        }),
      });
      kerb.dispose();
    }
  }
  const slabs = new THREE.Mesh(mergeParts(slabParts), site.hardstand);
  slabs.position.y = 0.062;
  slabs.receiveShadow = true;
  g.add(slabs);
  slabParts.forEach((p) => p.geometry.dispose());

  // ---- drainage channels ------------------------------------------------
  const drainParts = [];
  const grateParts = [];
  const drains = [
    { az: 2.356, from: 24, to: 186 },
    { az: 4.363, from: 22, to: 186 },
    { az: 6.109, from: 26, to: 184 },
  ];
  for (const d of drains) {
    const dx = Math.cos(d.az);
    const dz = Math.sin(d.az);
    const len = d.to - d.from;
    const mid = (d.from + d.to) / 2;
    const yaw = Math.atan2(dx, dz);
    // Surround band with a dark slot down the middle.
    const band = chamferBox(1.05, 0.07, len, 0.02);
    drainParts.push({ geometry: band, matrix: transform({ pos: [dx * mid, 0.05, dz * mid], rot: [0, yaw, 0] }) });
    band.dispose();
    const slot = new THREE.BoxGeometry(0.46, 0.05, len);
    drainParts.push({ geometry: slot, matrix: transform({ pos: [dx * mid, 0.048, dz * mid], rot: [0, yaw, 0] }) });
    slot.dispose();
    // Grated sections and a gully pot at the inner end.
    const bar = new THREE.BoxGeometry(0.44, 0.035, 0.045);
    for (let s = d.from + 6; s < d.to - 10; s += 31 + rng.range(-4, 4)) {
      const n = 20;
      for (let i = 0; i < n; i++) {
        const along = s + i * 0.11;
        grateParts.push({
          geometry: bar,
          matrix: transform({ pos: [dx * along, 0.088, dz * along], rot: [0, yaw, 0] }),
        });
      }
      const rail = new THREE.BoxGeometry(0.05, 0.05, n * 0.11);
      for (const o of [-0.22, 0.22]) {
        grateParts.push({
          geometry: rail,
          matrix: transform({
            pos: [dx * (s + n * 0.055) - dz * o, 0.085, dz * (s + n * 0.055) + dx * o],
            rot: [0, yaw, 0],
          }),
        });
      }
      rail.dispose();
    }
    bar.dispose();
    const pot = cylinder(0.44, 0.44, 0.08, 12);
    grateParts.push({ geometry: pot, matrix: transform({ pos: [dx * (d.from - 0.6), 0.075, dz * (d.from - 0.6)] }) });
    pot.dispose();
  }
  const drainBand = new THREE.Mesh(mergeParts(drainParts), site.concrete);
  drainBand.receiveShadow = true;
  g.add(drainBand);
  drainParts.forEach((p) => p.geometry.dispose());
  const grates = new THREE.Mesh(mergeParts(grateParts), mats.darkMetal);
  // Ground furniture this shallow contributes nothing to the shadow map but
  // costs a draw call per shadow cascade, so it stays out of the depth pass.
  grates.castShadow = false;
  g.add(grates);
  grateParts.forEach((p) => p.geometry.dispose());

  // ---- kerbs ------------------------------------------------------------
  const kerb = new THREE.TorusGeometry(R, 0.16, 6, 96);
  kerb.rotateX(Math.PI / 2);
  kerbParts.push({ geometry: kerb, matrix: transform({ pos: [0, 0.12, 0] }) });
  kerb.dispose();
  const kerbMesh = new THREE.Mesh(mergeParts(kerbParts), site.concrete);
  kerbMesh.castShadow = false;
  kerbMesh.receiveShadow = true;
  g.add(kerbMesh);
  kerbParts.forEach((p) => p.geometry.dispose());

  // ---- graded gravel skirt ---------------------------------------------
  const skirt = new THREE.RingGeometry(R - 0.4, R + 30, 110, 2);
  skirt.rotateX(-Math.PI / 2);
  {
    const su = skirt.attributes.uv;
    const sp = skirt.attributes.position;
    for (let i = 0; i < su.count; i++) su.setXY(i, sp.getX(i) / GRAVEL_TILE, sp.getZ(i) / GRAVEL_TILE);
    // Feather the outer edge down so it beds into the desert instead of
    // finishing on a hard lip.
    for (let i = 0; i < sp.count; i++) {
      const r = Math.hypot(sp.getX(i), sp.getZ(i));
      sp.setY(i, -smoothstep(R + 4, R + 30, r) * 0.35);
    }
    skirt.computeVertexNormals();
  }
  const skirtMesh = new THREE.Mesh(skirt, site.gravel);
  skirtMesh.position.y = 0.035;
  skirtMesh.receiveShadow = true;
  g.add(skirtMesh);

  return g;
}

/**
 * Everything painted or smeared on to the finished surfaces: oil pools under
 * vehicles, patched repairs, wind-blown dust and rubber scuffs. One merged
 * decal sheet, one draw call.
 */
function buildGroundStains(rng, extraSpots = []) {
  const parts = [];
  const site = siteMaterials();
  const add = (x, z, w, d, quad) => parts.push({ geometry: stainQuad(x, z, w, d, rng.range(0, Math.PI * 2), quad) });

  // Oil and fuel under everything that parks or runs.
  const dirty = [
    [-64, -18], [-64, 24], [58, -34], [72, 12], [4, -96],
    [42, 74], [50, 62], [-46, 70], [96, 44], [96, 26], [-96, 52], [-26, -58],
    ...extraSpots,
  ];
  for (const [x, z] of dirty) {
    const n = 2 + Math.floor(rng.next() * 3);
    for (let i = 0; i < n; i++) {
      const a = rng.range(0, Math.PI * 2);
      const r = rng.range(0.5, 6.5);
      add(x + Math.cos(a) * r, z + Math.sin(a) * r, rng.range(1.6, 5.2), rng.range(1.6, 4.4), STAIN.oil);
    }
    for (let i = 0; i < 2; i++) {
      const a = rng.range(0, Math.PI * 2);
      const r = rng.range(3, 12);
      add(x + Math.cos(a) * r, z + Math.sin(a) * r, rng.range(3, 9), rng.range(3, 8), STAIN.rubber);
    }
  }

  // Concrete patch repairs scattered over the apron.
  for (let i = 0; i < 26; i++) {
    const a = rng.range(0, Math.PI * 2);
    const r = Math.sqrt(rng.next()) * (WORLD.baseRadius - 20);
    add(Math.cos(a) * r, Math.sin(a) * r, rng.range(3, 11), rng.range(3, 9), STAIN.patch);
  }

  // Wind-blown sand: heaviest near the pad edge, where the drift comes in.
  for (let i = 0; i < 46; i++) {
    const a = rng.range(0, Math.PI * 2);
    const r = WORLD.baseRadius * (0.42 + Math.pow(rng.next(), 0.5) * 0.56);
    add(Math.cos(a) * r, Math.sin(a) * r, rng.range(14, 44), rng.range(12, 34), STAIN.dust);
  }

  const mesh = new THREE.Mesh(mergeParts(parts), site.stain);
  mesh.position.y = 0.072;
  mesh.receiveShadow = true;
  mesh.renderOrder = 2;
  parts.forEach((p) => p.geometry.dispose());
  return mesh;
}

/* ----------------------------------------------------------------- roads */

/**
 * Flat ribbon following a poly-line. Used for roads, tracks and tyre marks.
 *
 * U runs across the ribbon and V along it. `uSpan` is how many times the map
 * repeats across the width: a surfacing texture wants it set so the tile stays
 * near a metre in both directions, while a decal that has to line up with the
 * ribbon edges (tyre marks) leaves it at 1.
 */
function ribbonGeometry(points, width, { uvRepeat = null, uvPerMetre = null, halfWidths = null, uSpan = 1 } = {}) {
  const pos = [];
  const uv = [];
  const idx = [];
  const up = new THREE.Vector3(0, 1, 0);
  const tan = new THREE.Vector3();
  const side = new THREE.Vector3();
  let run = 0;
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    const a = points[Math.max(0, i - 1)];
    const b = points[Math.min(points.length - 1, i + 1)];
    if (i > 0) run += p.distanceTo(points[i - 1]);
    tan.subVectors(b, a).normalize();
    const hw = halfWidths ? halfWidths[i] : width / 2;
    side.crossVectors(tan, up).normalize().multiplyScalar(hw);
    pos.push(p.x - side.x, p.y, p.z - side.z);
    pos.push(p.x + side.x, p.y, p.z + side.z);
    const t = uvPerMetre != null ? run * uvPerMetre : (i / (points.length - 1)) * (uvRepeat || 1);
    uv.push(0, t, uSpan, t);
    if (i < points.length - 1) {
      const k = i * 2;
      idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return faceUp(geo);
}

/**
 * Point a ground strip's faces at the sky.
 *
 * Strip winding depends on which way its path happens to run, so about half of
 * them come out wound the wrong way. Single-sided, that means the strip is
 * back-face culled and never appears at all; correcting the shading normals
 * alone leaves it just as invisible. Rewinding each triangle instead fixes both
 * the culling and the lighting, and works on merged sheets whose triangles
 * disagree with one another.
 */
function faceUp(geo) {
  let idx = geo.getIndex();
  if (!idx) {
    const n = geo.attributes.position.count;
    geo.setIndex(Array.from({ length: n }, (_, i) => i));
    idx = geo.getIndex();
  }
  const pos = geo.attributes.position;
  let flipped = false;
  for (let t = 0; t < idx.count; t += 3) {
    const a = idx.getX(t);
    const b = idx.getX(t + 1);
    const c = idx.getX(t + 2);
    const ux = pos.getX(b) - pos.getX(a);
    const uz = pos.getZ(b) - pos.getZ(a);
    const vx = pos.getX(c) - pos.getX(a);
    const vz = pos.getZ(c) - pos.getZ(a);
    // +Y component of the right-hand-rule face normal.
    if (uz * vx - ux * vz < 0) {
      idx.setX(t + 1, c);
      idx.setX(t + 2, b);
      flipped = true;
    }
  }
  if (flipped) {
    idx.needsUpdate = true;
    geo.computeVertexNormals();
  }
  return geo;
}

/** Resample a set of 2D control points into a smooth ground-following path. */
function roadPath(controls, samples, heightFn, lift = 0.07) {
  const curve = new THREE.CatmullRomCurve3(
    controls.map(([x, z]) => new THREE.Vector3(x, 0, z)),
    false,
    'catmullrom',
    0.5
  );
  const out = [];
  for (let i = 0; i <= samples; i++) {
    const p = curve.getPoint(i / samples);
    p.y = heightFn(p.x, p.z) + lift;
    out.push(p);
  }
  return out;
}

const APPROACH_CONTROLS = [
  [1120, -430], [860, -352], [640, -262], [470, -170], [372, -108],
  [300, -60], [252, -28], [224, -12], [205, 4], [193, 8], [176, 10],
];

/**
 * Approach road from the desert to the gate, the graded perimeter track just
 * inside the fence, and the tyre-track decals worn on to the apron.
 */
function buildRoads(rng) {
  const g = new THREE.Group();
  g.name = 'roads';
  const mats = materials();
  const site = siteMaterials();

  // ---- approach road ---------------------------------------------------
  // Carried across the dry wash on a low embankment rather than dipping into
  // it, so the crossing needs a culvert.
  // Compacted gravel rather than asphalt: a sealed surface out here would be a
  // black stripe across a bleached plain, and a graded haul road is what a
  // remote site of this size would actually get.
  const road = roadPath(APPROACH_CONTROLS, 110, terrainHeightUncut, 0.09);
  const roadMesh = new THREE.Mesh(ribbonGeometry(road, 9, { uvPerMetre: 1 / GRAVEL_TILE, uSpan: 9 / GRAVEL_TILE }), site.gravelDark);
  roadMesh.receiveShadow = true;
  g.add(roadMesh);

  // Gravel shoulders either side, wider where the fill is deepest.
  const shoulderParts = [];
  for (const s of [-1, 1]) {
    const line = [];
    for (let i = 0; i < road.length; i++) {
      const p = road[i];
      const a = road[Math.max(0, i - 1)];
      const b = road[Math.min(road.length - 1, i + 1)];
      const t = new THREE.Vector3().subVectors(b, a).normalize();
      const n = new THREE.Vector3().crossVectors(t, new THREE.Vector3(0, 1, 0)).multiplyScalar(s * 6.2);
      const q = p.clone().add(n);
      q.y = Math.max(terrainHeight(q.x, q.z), p.y - 1.4) + 0.03;
      line.push(q);
    }
    shoulderParts.push({ geometry: ribbonGeometry(line, 5.4, { uvPerMetre: 1 / GRAVEL_TILE, uSpan: 5.4 / GRAVEL_TILE }) });
  }
  const shoulders = new THREE.Mesh(mergeParts(shoulderParts), site.spoil);
  shoulders.receiveShadow = true;
  g.add(shoulders);
  shoulderParts.forEach((p) => p.geometry.dispose());

  // ---- embankment across the wash + culvert ----------------------------
  let crossing = null;
  for (const p of road) {
    const d = washDepth(p.x, p.z);
    if (!crossing || d > crossing.d) crossing = { p, d };
  }
  if (crossing && crossing.d > 0.8) {
    const fillParts = [];
    for (const s of [-1, 1]) {
      const strip = [];
      const bottom = [];
      for (const p of road) {
        const gd = terrainHeightUncut(p.x, p.z) - terrainHeight(p.x, p.z);
        if (gd < 0.25) continue;
        strip.push(p);
        bottom.push(gd);
      }
      if (strip.length < 3) continue;
      let run = 0;
      for (let i = 0; i < strip.length - 1; i++) {
        const p0 = strip[i];
        const p1 = strip[i + 1];
        const t = new THREE.Vector3().subVectors(p1, p0).normalize();
        const n = new THREE.Vector3().crossVectors(t, new THREE.Vector3(0, 1, 0)).multiplyScalar(s);
        const inner0 = p0.clone().addScaledVector(n, 8.6);
        const inner1 = p1.clone().addScaledVector(n, 8.6);
        const outer0 = p0.clone().addScaledVector(n, 8.6 + bottom[i] * 2.1);
        const outer1 = p1.clone().addScaledVector(n, 8.6 + bottom[i + 1] * 2.1);
        outer0.y = terrainHeight(outer0.x, outer0.z);
        outer1.y = terrainHeight(outer1.x, outer1.z);
        inner0.y = p0.y - 0.1;
        inner1.y = p1.y - 0.1;
        const geo = new THREE.BufferGeometry();
        geo.setAttribute(
          'position',
          new THREE.Float32BufferAttribute(
            [inner0.x, inner0.y, inner0.z, outer0.x, outer0.y, outer0.z, inner1.x, inner1.y, inner1.z, outer1.x, outer1.y, outer1.z],
            3
          )
        );
        // Metre-ish tile in both directions, or the spoil reads as boulders.
        const u0 = inner0.distanceTo(outer0) / GRAVEL_TILE;
        const u1 = inner1.distanceTo(outer1) / GRAVEL_TILE;
        const v0 = run / GRAVEL_TILE;
        run += p0.distanceTo(p1);
        const v1 = run / GRAVEL_TILE;
        geo.setAttribute('uv', new THREE.Float32BufferAttribute([0, v0, u0, v0, 0, v1, u1, v1], 2));
        geo.setIndex(s > 0 ? [0, 2, 1, 1, 2, 3] : [0, 1, 2, 1, 3, 2]);
        geo.computeVertexNormals();
        fillParts.push({ geometry: faceUp(geo) });
      }
    }
    if (fillParts.length) {
      const fill = new THREE.Mesh(mergeParts(fillParts), site.spoil);
      fill.receiveShadow = true;
      g.add(fill);
      fillParts.forEach((p) => p.geometry.dispose());
    }

    // Culvert: pipe through the fill with a headwall at each end.
    const c = crossing.p;
    const invert = terrainHeight(c.x, c.z) + 0.55;
    const cul = new THREE.Group();
    cul.position.set(c.x, 0, c.z);
    // Open-ended barrel, so it needs its own two-sided copy of the mix. The
    // clone carries `userData.__atm`, which would make applyAtmosphere skip it.
    const pipeMat = site.concrete.clone();
    pipeMat.side = THREE.DoubleSide;
    pipeMat.userData = {};
    applyAtmosphere(pipeMat);
    const pipe = new THREE.Mesh(cylinder(0.95, 0.95, 24, 14, true), pipeMat);
    pipe.rotation.x = Math.PI / 2;
    pipe.position.y = invert;
    cul.add(pipe);
    const headParts = [];
    for (const s of [-1, 1]) {
      headParts.push({ geometry: chamferBox(6.5, 2.6, 0.5, 0.06), matrix: transform({ pos: [0, invert + 0.55, s * 11.5] }) });
      headParts.push({ geometry: chamferBox(0.45, 2.0, 3.4, 0.06), matrix: transform({ pos: [-3.0, invert + 0.3, s * 13.2], rot: [0, s * 0.42, 0] }) });
      headParts.push({ geometry: chamferBox(0.45, 2.0, 3.4, 0.06), matrix: transform({ pos: [3.0, invert + 0.3, s * 13.2], rot: [0, -s * 0.42, 0] }) });
    }
    const heads = new THREE.Mesh(mergeParts(headParts), site.concrete);
    heads.castShadow = true;
    heads.receiveShadow = true;
    cul.add(heads);
    headParts.forEach((p) => p.geometry.dispose());
    // Marker posts so the crossing reads at a distance.
    const postParts = [];
    for (const [px, pz] of [[-5.4, -12], [5.4, -12], [-5.4, 12], [5.4, 12]]) {
      postParts.push({ geometry: cylinder(0.08, 0.08, 1.5, 6), matrix: transform({ pos: [px, terrainHeight(c.x + px, c.z + pz) + 0.75, pz] }) });
    }
    const posts = new THREE.Mesh(mergeParts(postParts), mats.galv);
    posts.castShadow = true;
    cul.add(posts);
    postParts.forEach((p) => p.geometry.dispose());
    g.add(cul);
    g.userData.culvert = [c.x, c.z];
  }

  // ---- graded perimeter track ------------------------------------------
  const trackR = 196.5;
  const ring = [];
  for (let i = 0; i <= 128; i++) {
    const a = (i / 128) * Math.PI * 2;
    ring.push(new THREE.Vector3(Math.cos(a) * trackR, 0.055, Math.sin(a) * trackR));
  }
  const perim = new THREE.Mesh(ribbonGeometry(ring, 6.4, { uvPerMetre: 1 / GRAVEL_TILE, uSpan: 6.4 / GRAVEL_TILE }), site.gravelDark);
  perim.receiveShadow = true;
  g.add(perim);

  return g;
}

/**
 * Worn tyre tracks: the routes vehicles actually take across the apron, plus
 * short arcs where they manoeuvre into their parking spots.
 */
function buildTyreTracks(rng) {
  const parts = [];
  const site = siteMaterials();
  const routes = [
    [[186, 8], [150, 12], [116, 20], [88, 30], [62, 40], [42, 50], [32, 60]],
    [[150, 12], [120, 6], [96, -4], [80, -18], [72, -30], [66, -44]],
    [[116, 20], [92, 30], [96, 40]],
    [[88, 30], [64, 30], [40, 26], [14, 18], [-14, 12], [-40, 10], [-58, 8], [-64, -6]],
    [[40, 26], [26, 0], [12, -30], [6, -58], [4, -80]],
    [[14, 18], [-2, -6], [-16, -34], [-24, -52]],
    [[62, 40], [56, 58], [50, 68], [44, 76]],
    [[32, 60], [12, 72], [-12, 84], [-30, 90]],
    [[-40, 10], [-58, 22], [-72, 36], [-88, 48]],
    [[42, 50], [70, 62], [96, 70], [112, 76]],
  ];
  for (const r of routes) {
    const pts = roadPath(r, Math.max(12, r.length * 5), () => 0.05, 0.028);
    parts.push({ geometry: ribbonGeometry(pts, 3.4, { uvPerMetre: 1 / 3.4 }) });
  }
  // Manoeuvring arcs beside the parked vehicles.
  for (const [cx, cz, rad] of [
    [-64, -18, 13], [-64, 24, 12], [58, -34, 14], [72, 12, 13], [4, -96, 15],
    [96, 35, 10], [-96, 52, 10], [46, 68, 11],
  ]) {
    const a0 = rng.range(0, Math.PI * 2);
    const sweep = rng.range(1.4, 2.6) * (rng.next() > 0.5 ? 1 : -1);
    const arc = [];
    for (let i = 0; i <= 14; i++) {
      const a = a0 + (i / 14) * sweep;
      arc.push(new THREE.Vector3(cx + Math.cos(a) * rad, 0.078, cz + Math.sin(a) * rad));
    }
    parts.push({ geometry: ribbonGeometry(arc, 3.2, { uvPerMetre: 1 / 3.4 }) });
  }
  const mesh = new THREE.Mesh(mergeParts(parts), site.tracks);
  mesh.receiveShadow = true;
  mesh.renderOrder = 1;
  parts.forEach((p) => p.geometry.dispose());
  return mesh;
}

function decalPlane(texture, size, opts = {}) {
  const geo = new THREE.PlaneGeometry(size[0], size[1]);
  geo.rotateX(-Math.PI / 2);
  const mat = applyAtmosphere(
    new THREE.MeshStandardMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -3,
      polygonOffsetUnits: -3,
      roughness: 0.95,
      metalness: 0,
      ...opts,
    })
  );
  const m = new THREE.Mesh(geo, mat);
  // Painted markings lie on the apron; they have to darken with it.
  m.receiveShadow = true;
  return m;
}

/* ------------------------------------------------- command shelter (C2) */

function buildShelter(rng) {
  const g = new THREE.Group();
  g.name = 'shelter';
  const mats = materials();
  const site = siteMaterials();
  const W = 13.5;
  const D = 8.4;
  const H = 3.5;

  // The shelter carries a lot of small galvanised fit-out. It all collects
  // here and ships as one mesh, otherwise the ducting, conduit, cable trays,
  // antennas and net poles alone cost a dozen draw calls per shadow pass.
  const galvParts = [];
  const addGalv = (geometry, matrix) => galvParts.push({ geometry, matrix });

  // Concrete plinth and, later, the entry steps.
  const concreteParts = [{ geometry: chamferBox(W + 1.6, 0.42, D + 1.6, 0.06), matrix: transform({ pos: [0, 0.21, 0] }) }];

  // Corrugated shell: three walls, open front (-Z) with a canopy for sky view.
  const wallParts = [];
  const back = corrugatedPanel(W, H, 22, 0.045);
  wallParts.push({ geometry: back, matrix: transform({ pos: [0, H / 2 + 0.42, D / 2], rot: [0, Math.PI, 0] }) });
  const side = corrugatedPanel(D, H, 14, 0.045);
  wallParts.push({ geometry: side, matrix: transform({ pos: [-W / 2, H / 2 + 0.42, 0], rot: [0, -Math.PI / 2, 0] }) });
  wallParts.push({ geometry: side, matrix: transform({ pos: [W / 2, H / 2 + 0.42, 0], rot: [0, Math.PI / 2, 0] }) });
  // front bulkheads flanking the opening
  const front = corrugatedPanel(3.1, H, 6, 0.045);
  wallParts.push({ geometry: front, matrix: transform({ pos: [-W / 2 + 1.55, H / 2 + 0.42, -D / 2] }) });
  wallParts.push({ geometry: front, matrix: transform({ pos: [W / 2 - 1.55, H / 2 + 0.42, -D / 2] }) });
  const header = chamferBox(W - 6.2, 0.85, 0.16, 0.03);
  wallParts.push({ geometry: header, matrix: transform({ pos: [0, H + 0.42 - 0.42, -D / 2] }) });

  // Roof deck and its ribs, in the same sand paint as the walls.
  wallParts.push({ geometry: chamferBox(W + 0.7, 0.22, D + 0.7, 0.05), matrix: transform({ pos: [0, H + 0.52, 0] }) });
  const rib = chamferBox(W + 0.7, 0.1, 0.14, 0.02);
  for (let i = 0; i < 7; i++) {
    wallParts.push({ geometry: rib, matrix: transform({ pos: [0, H + 0.68, -D / 2 + (i + 0.5) * (D / 7)] }) });
  }
  const shell = new THREE.Mesh(mergeParts(wallParts), mats.sandMetal);
  shell.castShadow = true;
  shell.receiveShadow = true;
  g.add(shell);
  wallParts.forEach((p) => p.geometry.dispose());

  // canopy over the open front
  const canopyParts = [];
  canopyParts.push({ geometry: chamferBox(W - 1.0, 0.1, 3.2, 0.04), matrix: transform({ pos: [0, H + 0.34, -D / 2 - 1.6], rot: [0.09, 0, 0] }) });
  const strut = cylinder(0.06, 0.06, 3.0, 8);
  canopyParts.push({ geometry: strut, matrix: transform({ pos: [-W / 2 + 1.0, H - 0.9, -D / 2 - 1.2], rot: [0.7, 0, 0] }) });
  canopyParts.push({ geometry: strut, matrix: transform({ pos: [W / 2 - 1.0, H - 0.9, -D / 2 - 1.2], rot: [0.7, 0, 0] }) });
  const canopy = new THREE.Mesh(mergeParts(canopyParts), mats.tarp);
  canopy.castShadow = true;
  g.add(canopy);
  canopyParts.forEach((p) => p.geometry.dispose());

  // Equipment on the roof
  addGalv(chamferBox(1.9, 0.9, 1.5, 0.05), transform({ pos: [-3.4, H + 1.08, 1.2] }));
  addGalv(chamferBox(1.2, 0.6, 1.0, 0.04), transform({ pos: [3.9, H + 0.94, 1.6] }));
  addGalv(greebleField(1.7, 0.7, rng, { count: 9, maxSize: 0.2, depth: 0.06 }), transform({ pos: [-3.4, H + 1.08, 0.44] }));

  const fan = new THREE.Mesh(fanBlades(0.42), mats.steel);
  fan.position.set(-3.4, H + 1.54, 1.2);
  fan.rotation.x = -Math.PI / 2;
  fan.userData.spin = 6.2;
  g.add(fan);

  // Interior floor, rear equipment racks and the side door all share the dark
  // painted-metal mix, so they ship together.
  const darkParts = [];
  {
    const floorGeo = new THREE.PlaneGeometry(W - 0.4, D - 0.4);
    floorGeo.rotateX(-Math.PI / 2);
    darkParts.push({ geometry: floorGeo, matrix: transform({ pos: [0, 0.44, 0] }) });
  }
  for (let i = 0; i < 4; i++) {
    const x = -W / 2 + 1.6 + i * 1.5;
    darkParts.push({ geometry: chamferBox(1.3, 2.0, 0.75, 0.03), matrix: transform({ pos: [x, 1.44, D / 2 - 0.7] }) });
  }

  // rack indicator strips
  const stripGeo = new THREE.PlaneGeometry(1.1, 0.06);
  const stripMat = lamp(0x66ff9a, 3.0);
  const strips = new THREE.InstancedMesh(stripGeo, stripMat, 16);
  let si = 0;
  const m4 = new THREE.Matrix4();
  for (let i = 0; i < 4; i++) {
    for (let k = 0; k < 4; k++) {
      m4.makeTranslation(-W / 2 + 1.6 + i * 1.5, 0.75 + k * 0.42, D / 2 - 1.09);
      strips.setMatrixAt(si++, m4);
    }
  }
  strips.instanceMatrix.needsUpdate = true;
  g.add(strips);

  // cable trays along the walls
  addGalv(chamferBox(W - 1, 0.1, 0.34, 0.02), transform({ pos: [0, 2.9, D / 2 - 0.3] }));
  addGalv(chamferBox(0.34, 0.1, D - 1, 0.02), transform({ pos: [-W / 2 + 0.35, 2.9, 0] }));

  // ceiling strip lights
  const ceilParts = [];
  for (const x of [-4, 0, 4]) {
    const strip = new THREE.PlaneGeometry(2.6, 0.22);
    strip.rotateX(Math.PI / 2);
    strip.translate(x, H + 0.3, 0.4);
    ceilParts.push({ geometry: strip });
  }
  g.add(new THREE.Mesh(mergeParts(ceilParts), lamp(0xdfe8ff, 2.4, { side: THREE.DoubleSide })));
  ceilParts.forEach((p) => p.geometry.dispose());
  const inner = new THREE.PointLight(0xbfd2ff, 6, 16, 2);
  inner.position.set(0, H - 0.4, 0.6);
  g.add(inner);
  g.userData.interiorLight = inner;

  // door on the side wall
  darkParts.push({ geometry: chamferBox(0.95, 2.1, 0.1, 0.03), matrix: transform({ pos: [W / 2 + 0.02, 1.5, 2.2], rot: [0, Math.PI / 2, 0] }) });
  const darkMesh = new THREE.Mesh(mergeParts(darkParts), mats.darkMetal);
  darkMesh.castShadow = true;
  darkMesh.receiveShadow = true;
  g.add(darkMesh);
  darkParts.forEach((p) => p.geometry.dispose());

  // stencils
  const sign = decalPlane(stencilDecal(['C2 SHELTER 01', 'AEGIS RIDGE'], { w: 512, h: 160, color: '#e6e0cd', font: 'bold 62px "Arial Narrow", Impact, sans-serif' }), [4.4, 1.4]);
  sign.rotation.x = 0;
  sign.rotation.set(Math.PI / 2, 0, 0);
  sign.position.set(-W / 2 + 3.2, 2.55, -D / 2 - 0.06);
  g.add(sign);

  const hazard = decalPlane(warningStripes(512, 96), [W - 6.2, 0.42], { transparent: false });
  hazard.rotation.set(Math.PI / 2, 0, 0);
  hazard.position.set(0, H + 0.02, -D / 2 - 0.05);
  g.add(hazard);

  /* ---------------------------------------------------- exterior fit-out */

  // Skid base under the plinth: the shelter is a transportable body dropped on
  // to a poured slab, so the skids and lifting eyes stay visible.
  const skidParts = [];
  for (const s of [-1, 1]) {
    skidParts.push({ geometry: chamferBox(W + 2.2, 0.26, 0.3, 0.04), matrix: transform({ pos: [0, 0.13, s * (D / 2 + 0.55)] }) });
    for (let i = 0; i < 5; i++) {
      const x = -W / 2 + 0.4 + i * ((W - 0.8) / 4);
      skidParts.push({ geometry: chamferBox(0.22, 0.22, 0.22, 0.03), matrix: transform({ pos: [x, 0.5, s * (D / 2 + 0.62)] }) });
    }
    const eye = new THREE.TorusGeometry(0.16, 0.045, 5, 10);
    for (const ex of [-W / 2 - 0.55, W / 2 + 0.55]) {
      skidParts.push({ geometry: eye, matrix: transform({ pos: [ex, 0.62, s * (D / 2 + 0.2)], rot: [0, Math.PI / 2, 0] }) });
    }
    eye.dispose();
  }
  const skids = new THREE.Mesh(mergeParts(skidParts), mats.steel);
  skids.castShadow = true;
  skids.receiveShadow = true;
  g.add(skids);
  skidParts.forEach((p) => p.geometry.dispose());

  // Entry steps at the side door, with a handrail on the open side.
  concreteParts.push({ geometry: chamferBox(2.0, 0.44, 2.4, 0.04), matrix: transform({ pos: [W / 2 + 1.7, 0.22, 2.2] }) });
  concreteParts.push({ geometry: chamferBox(1.5, 0.30, 2.0, 0.04), matrix: transform({ pos: [W / 2 + 3.1, 0.15, 2.2] }) });
  concreteParts.push({ geometry: chamferBox(1.2, 0.16, 1.8, 0.03), matrix: transform({ pos: [W / 2 + 4.2, 0.08, 2.2] }) });
  const concreteMesh = new THREE.Mesh(mergeParts(concreteParts), site.concrete);
  concreteMesh.castShadow = true;
  concreteMesh.receiveShadow = true;
  g.add(concreteMesh);
  concreteParts.forEach((p) => p.geometry.dispose());

  const railPts = [
    new THREE.Vector3(W / 2 + 0.75, 0.4, 3.35),
    new THREE.Vector3(W / 2 + 2.6, 0.4, 3.35),
    new THREE.Vector3(W / 2 + 4.5, 0.4, 3.2),
  ];
  addGalv(handrail(railPts, 1.0), null);

  // Cable entry panel, external junction boxes and the conduit that leaves the
  // building for the radar and generator runs.
  addGalv(chamferBox(2.4, 1.1, 0.14, 0.03), transform({ pos: [3.2, 1.5, D / 2 + 0.14] }));
  const gland = cylinder(0.09, 0.09, 0.26, 8);
  for (let i = 0; i < 8; i++) {
    addGalv(gland, transform({ pos: [2.3 + (i % 4) * 0.6, 1.22 + Math.floor(i / 4) * 0.55, D / 2 + 0.28], rot: [Math.PI / 2, 0, 0] }));
  }
  for (const [bx, by] of [[-2.2, 1.7], [-3.6, 1.4], [-1.0, 2.3]]) {
    addGalv(chamferBox(0.6, 0.75, 0.32, 0.03), transform({ pos: [bx, by, D / 2 + 0.22] }));
    addGalv(chamferBox(0.24, 0.1, 0.1, 0.02), transform({ pos: [bx, by - 0.45, D / 2 + 0.2] }));
  }
  // Vertical conduit drops behind the panel.
  const conduit = cylinder(0.055, 0.055, 1.2, 7);
  for (let i = 0; i < 5; i++) {
    addGalv(conduit, transform({ pos: [2.4 + i * 0.42, 0.72, D / 2 + 0.3] }));
  }

  // Air-conditioning ducting: roof plant down the west wall to a floor plenum.
  addGalv(ribbedTube(2.9, 0.26, 7, 1.14, 12), transform({ pos: [-W / 2 - 0.42, 2.2, 1.2] }));
  addGalv(new THREE.TorusGeometry(0.5, 0.26, 8, 10, Math.PI / 2), transform({ pos: [-W / 2 - 0.42, 3.65, 0.7], rot: [Math.PI / 2, 0, Math.PI] }));
  addGalv(ribbedTube(1.6, 0.26, 4, 1.14, 12), transform({ pos: [-W / 2 - 0.42, 4.15, 0.0], rot: [Math.PI / 2, 0, 0] }));
  addGalv(chamferBox(1.1, 0.9, 0.7, 0.05), transform({ pos: [-W / 2 - 0.55, 1.0, 1.2] }));
  const louvre = chamferBox(0.9, 0.06, 0.06, 0.01);
  for (let i = 0; i < 6; i++) {
    addGalv(louvre, transform({ pos: [-W / 2 - 0.92, 0.72 + i * 0.13, 1.2], rot: [0, Math.PI / 2, 0.3] }));
  }

  // Roof antenna group: a short lattice mast, two whips and a link dish.
  addGalv(trussSegment(0.42, 4.4, 0.032), transform({ pos: [5.0, H + 0.63, 2.6] }));
  addGalv(chamferBox(1.0, 0.14, 1.0, 0.03), transform({ pos: [5.0, H + 0.68, 2.6] }));
  const dip = cylinder(0.016, 0.016, 1.1, 5);
  for (let i = 0; i < 4; i++) {
    addGalv(dip, transform({ pos: [5.0, H + 2.3 + i * 0.62, 2.6], rot: [0, i * 0.6, Math.PI / 2] }));
  }
  for (const [wx, wz] of [[-6.0, 3.2], [6.2, -2.4]]) {
    addGalv(cylinder(0.035, 0.008, 3.2, 6), transform({ pos: [wx, H + 2.25, wz], rot: [0, 0, 0.06] }));
    addGalv(chamferBox(0.26, 0.2, 0.26, 0.03), transform({ pos: [wx, H + 0.72, wz] }));
  }
  addGalv(
    new THREE.SphereGeometry(0.62, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.36),
    transform({ pos: [5.0, H + 4.5, 2.6], rot: [Math.PI * 0.6, 0, -0.7] })
  );

  const mastLight = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), lamp(0xff3524, 4));
  mastLight.position.set(5.0, H + 5.2, 2.6);
  g.add(mastLight);
  g.userData.beacon = mastLight;

  // Camouflage netting draped over the rear of the roof and the gabion wall.
  const netW = 15.0;
  const netD = 10.5;
  const nx = 9;
  const nz = 7;
  const netGeo = new THREE.PlaneGeometry(netW, netD, nx, nz);
  netGeo.rotateX(-Math.PI / 2);
  {
    const p = netGeo.attributes.position;
    const uv = netGeo.attributes.uv;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i);
      const z = p.getZ(i);
      const u = Math.abs(x) / (netW / 2);
      const v = (z + netD / 2) / netD;
      // Peaked over the roof ridge, sagging between the outer support poles.
      const sag = Math.sin(Math.PI * (1 - u) * 0.5) * 0.55;
      const drop = smoothstep(0.32, 1.0, u) * 3.4 + smoothstep(0.7, 1.0, v) * 2.2;
      p.setY(i, H + 1.35 + sag - drop + Math.sin(x * 0.9 + z * 0.7) * 0.16);
      uv.setXY(i, (x + netW / 2) / 5, (z + netD / 2) / 5);
    }
    netGeo.computeVertexNormals();
  }
  const camoNet = new THREE.Mesh(netGeo, site.camoNet);
  camoNet.position.set(0.4, 0, 3.4);
  camoNet.castShadow = true;
  camoNet.receiveShadow = true;
  g.add(camoNet);

  for (const [px, pz] of [[-8.0, 0.4], [-8.0, 7.6], [8.6, 0.4], [8.6, 7.6], [0.2, 8.4]]) {
    addGalv(cylinder(0.06, 0.06, 3.3, 6), transform({ pos: [px, 1.65, pz] }));
    addGalv(cylinder(0.14, 0.14, 0.1, 8), transform({ pos: [px, 0.05, pz] }));
  }
  const galv = new THREE.Mesh(mergeParts(galvParts), mats.galv);
  galv.castShadow = true;
  galv.receiveShadow = true;
  g.add(galv);
  galvParts.forEach((p) => p.geometry.dispose());

  // Gabion barrier down the west flank.
  const gabParts = [];
  const cage = chamferBox(1.05, 1.0, 2.0, 0.03);
  for (let row = 0; row < 2; row++) {
    const n = row === 0 ? 6 : 5;
    for (let i = 0; i < n; i++) {
      const z = -5.6 + i * 2.06 + (row === 1 ? 1.0 : 0);
      gabParts.push({ geometry: cage, matrix: transform({ pos: [-W / 2 - 2.5 - row * 0.08, 0.5 + row * 1.0, z] }) });
    }
  }
  // Short return around the front corner.
  for (let i = 0; i < 2; i++) {
    gabParts.push({ geometry: cage, matrix: transform({ pos: [-W / 2 - 1.4 + i * 2.06, 0.5, -6.3], rot: [0, Math.PI / 2, 0] }) });
  }
  cage.dispose();
  const gabions = new THREE.Mesh(mergeParts(gabParts), site.gabion);
  gabions.castShadow = true;
  gabions.receiveShadow = true;
  g.add(gabions);
  gabParts.forEach((p) => p.geometry.dispose());

  // Sandbag stacks tucked into the corners of the plinth.
  const bagGeo = new THREE.SphereGeometry(0.28, 7, 5);
  bagGeo.scale(1.5, 0.62, 0.95);
  const bags = new THREE.InstancedMesh(bagGeo, site.burlap, 220);
  const bm = new THREE.Matrix4();
  const bq = new THREE.Quaternion();
  const bs = new THREE.Vector3(1, 1, 1);
  const brng = rng.fork('shelterbags');
  let bi = 0;
  for (const [cx, cz, dir] of [
    [-W / 2 - 0.4, -D / 2 - 0.4, 0],
    [W / 2 + 0.4, -D / 2 - 0.4, Math.PI / 2],
    [W / 2 + 0.4, D / 2 + 0.4, Math.PI],
    [-W / 2 - 0.4, D / 2 + 0.4, -Math.PI / 2],
  ]) {
    for (let row = 0; row < 4; row++) {
      const cols = 5 - Math.floor(row / 2);
      for (let c = 0; c < cols && bi < 220; c++) {
        const t = (c - (cols - 1) / 2) * 0.46;
        const off = row % 2 ? 0.16 : 0;
        const lx = Math.cos(dir) * (t + off);
        const lz = Math.sin(dir) * (t + off);
        bq.setFromEuler(new THREE.Euler(brng.range(-0.05, 0.05), dir + brng.range(-0.1, 0.1), brng.range(-0.05, 0.05)));
        bm.compose(new THREE.Vector3(cx + lx, 0.1 + row * 0.18, cz + lz), bq, bs);
        bags.setMatrixAt(bi++, bm);
      }
    }
  }
  bags.count = bi;
  bags.instanceMatrix.needsUpdate = true;
  bags.castShadow = true;
  bags.receiveShadow = true;
  g.add(bags);

  // External lighting over the entry and the cable-entry panel.
  const lampHousings = [];
  const lensGeoParts = [];
  g.userData.extLamps = [];
  for (const [lx, ly, lz, ryaw] of [
    [W / 2 + 0.18, 2.7, 2.2, Math.PI / 2],
    [-W / 2 + 2.0, 2.9, -D / 2 - 0.18, Math.PI],
    [3.2, 2.75, D / 2 + 0.2, 0],
  ]) {
    lampHousings.push({ geometry: chamferBox(0.5, 0.26, 0.34, 0.04), matrix: transform({ pos: [lx, ly, lz], rot: [0.5, ryaw, 0] }) });
    lampHousings.push({ geometry: chamferBox(0.1, 0.34, 0.1, 0.02), matrix: transform({ pos: [lx - Math.sin(ryaw) * 0.14, ly + 0.24, lz - Math.cos(ryaw) * 0.14] }) });
    const lens = new THREE.PlaneGeometry(0.36, 0.16);
    lens.rotateX(-0.9);
    lens.rotateY(ryaw);
    lens.translate(lx + Math.sin(ryaw) * 0.16, ly - 0.11, lz + Math.cos(ryaw) * 0.16);
    lensGeoParts.push({ geometry: lens });
  }
  const housings = new THREE.Mesh(mergeParts(lampHousings), mats.darkMetal);
  housings.castShadow = true;
  g.add(housings);
  lampHousings.forEach((p) => p.geometry.dispose());
  const lensMesh = new THREE.Mesh(mergeParts(lensGeoParts), lamp(0xffe9c0, 0, { side: THREE.DoubleSide }));
  g.add(lensMesh);
  lensGeoParts.forEach((p) => p.geometry.dispose());
  g.userData.extLamps.push(lensMesh);

  // Door signage and a unit board on the gabion wall.
  const doorSign = new THREE.Mesh(
    new THREE.PlaneGeometry(1.0, 0.7),
    std({
      map: signBoardTexture(256, 176, {
        lines: ['C2 SHELTER 01', 'AEGIS RIDGE', 'AUTHORISED ENTRY'],
        bg: '#b9ae92',
        accent: '#5b6a55',
        font: 'bold 34px "Arial Narrow", Impact, sans-serif',
      }),
      color: 0xffffff,
      roughness: 0.92,
      metalness: 0,
      envMapIntensity: 0.3,
    })
  );
  doorSign.position.set(W / 2 + 0.09, 2.0, 3.5);
  doorSign.rotation.y = Math.PI / 2;
  g.add(doorSign);

  const unitBoard = new THREE.Mesh(
    new THREE.PlaneGeometry(2.4, 1.2),
    std({
      map: signBoardTexture(320, 160, {
        lines: ['SITE C2 — HAWKEYE NET', 'HEARING PROTECTION IN USE'],
        bg: '#c6bb9f',
        accent: '#a8451c',
        font: 'bold 30px "Arial Narrow", Impact, sans-serif',
      }),
      color: 0xffffff,
      roughness: 0.94,
      metalness: 0,
      envMapIntensity: 0.3,
      side: THREE.DoubleSide,
    })
  );
  unitBoard.position.set(-W / 2 - 3.1, 1.6, -1.4);
  unitBoard.rotation.y = -Math.PI / 2;
  g.add(unitBoard);

  g.userData.colliders = [
    { type: 'box', pos: [0, 2, D / 2 + 0.1], half: [W / 2 + 0.3, 2.2, 0.35], walkable: false },
    { type: 'box', pos: [-W / 2 - 0.1, 2, 0], half: [0.35, 2.2, D / 2 + 0.3], walkable: false },
    { type: 'box', pos: [W / 2 + 0.1, 2, 0], half: [0.35, 2.2, D / 2 + 0.3], walkable: false },
    { type: 'box', pos: [-W / 2 + 1.55, 2, -D / 2], half: [1.6, 2.2, 0.3], walkable: false },
    { type: 'box', pos: [W / 2 - 1.55, 2, -D / 2], half: [1.6, 2.2, 0.3], walkable: false },
    { type: 'box', pos: [-2.9, 1.2, D / 2 - 0.7], half: [3.1, 1.1, 0.45], walkable: false },
    { type: 'box', pos: [0, 0.22, 0], half: [W / 2 + 0.8, 0.22, D / 2 + 0.8], walkable: true },
    // entry steps
    { type: 'box', pos: [W / 2 + 1.7, 0.22, 2.2], half: [1.0, 0.22, 1.2], walkable: true },
    { type: 'box', pos: [W / 2 + 3.1, 0.15, 2.2], half: [0.75, 0.15, 1.0], walkable: true },
    { type: 'box', pos: [W / 2 + 4.2, 0.08, 2.2], half: [0.6, 0.08, 0.9], walkable: true },
    // gabion barrier
    { type: 'box', pos: [-W / 2 - 2.5, 1.0, -0.5], half: [0.6, 1.0, 6.2], walkable: false },
    { type: 'box', pos: [-W / 2 - 0.4, 0.5, -6.3], half: [2.1, 0.5, 0.55], walkable: false },
    // sandbag corner stacks
    { type: 'box', pos: [-W / 2 - 0.4, 0.4, -D / 2 - 0.4], half: [1.2, 0.4, 0.55], walkable: false },
    { type: 'box', pos: [W / 2 + 0.4, 0.4, -D / 2 - 0.4], half: [0.55, 0.4, 1.2], walkable: false },
    { type: 'box', pos: [W / 2 + 0.4, 0.4, D / 2 + 0.4], half: [1.2, 0.4, 0.55], walkable: false },
    { type: 'box', pos: [-W / 2 - 0.4, 0.4, D / 2 + 0.4], half: [0.55, 0.4, 1.2], walkable: false },
    // net support poles
    { type: 'cyl', pos: [-8.0, 1.65, 0.4], r: 0.18, hh: 1.65, walkable: false },
    { type: 'cyl', pos: [-8.0, 1.65, 7.6], r: 0.18, hh: 1.65, walkable: false },
    { type: 'cyl', pos: [8.6, 1.65, 0.4], r: 0.18, hh: 1.65, walkable: false },
    { type: 'cyl', pos: [8.6, 1.65, 7.6], r: 0.18, hh: 1.65, walkable: false },
    { type: 'cyl', pos: [0.2, 1.65, 8.4], r: 0.18, hh: 1.65, walkable: false },
  ];

  return g;
}

function fanBlades(r) {
  const parts = [];
  const blade = new THREE.BoxGeometry(r * 0.9, 0.02, r * 0.3);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    parts.push({
      geometry: blade,
      matrix: transform({ pos: [Math.cos(a) * r * 0.5, 0, Math.sin(a) * r * 0.5], rot: [0.4, -a, 0] }),
    });
  }
  parts.push({ geometry: cylinder(r * 0.16, r * 0.16, 0.08, 10), matrix: transform({}) });
  const g = mergeParts(parts);
  blade.dispose();
  return g;
}

/* --------------------------------------------------------------- radar */

function buildRadarSite(rng) {
  const g = new THREE.Group();
  g.name = 'radarSite';
  const mats = materials();

  // Trailer chassis
  const chassisParts = [];
  chassisParts.push({ geometry: chamferBox(7.4, 0.5, 3.0, 0.06), matrix: transform({ pos: [0, 1.0, 0] }) });
  chassisParts.push({ geometry: chamferBox(7.8, 0.16, 0.4, 0.03), matrix: transform({ pos: [0, 0.72, 1.2] }) });
  chassisParts.push({ geometry: chamferBox(7.8, 0.16, 0.4, 0.03), matrix: transform({ pos: [0, 0.72, -1.2] }) });
  const jack = cylinder(0.13, 0.16, 0.9, 8);
  for (const [x, z] of [[-3.2, 1.3], [3.2, 1.3], [-3.2, -1.3], [3.2, -1.3]]) {
    chassisParts.push({ geometry: jack, matrix: transform({ pos: [x, 0.45, z] }) });
    chassisParts.push({ geometry: chamferBox(0.6, 0.1, 0.6, 0.02), matrix: transform({ pos: [x, 0.05, z] }) });
  }
  const chassis = new THREE.Mesh(mergeParts(chassisParts), mats.sandMetal);
  chassis.castShadow = true;
  chassis.receiveShadow = true;
  g.add(chassis);
  chassisParts.forEach((p) => p.geometry.dispose());

  {
    const wgeo = wheel(0.55, 0.36);
    const parts = [];
    for (const [x, z] of [[-2.4, 1.62], [2.4, 1.62], [-2.4, -1.62], [2.4, -1.62]]) {
      parts.push({ geometry: wgeo, matrix: transform({ pos: [x, 0.55, z] }) });
    }
    const wheels = new THREE.Mesh(mergeParts(parts), mats.rubber);
    wheels.castShadow = true;
    g.add(wheels);
    wgeo.dispose();
  }

  // Turntable + phased array panel
  const turn = new THREE.Group();
  turn.position.set(0, 1.3, 0);
  g.add(turn);
  g.userData.turntable = turn;

  const base = new THREE.Mesh(cylinder(1.25, 1.45, 0.6, 20), mats.darkMetal);
  base.position.y = 0.3;
  base.castShadow = true;
  turn.add(base);

  const arrayGroup = new THREE.Group();
  arrayGroup.position.y = 0.62;
  turn.add(arrayGroup);
  g.userData.arrayTilt = arrayGroup;

  const panelParts = [];
  panelParts.push({ geometry: chamferBox(4.6, 3.4, 0.42, 0.06), matrix: transform({ pos: [0, 1.9, 0] }) });
  panelParts.push({ geometry: chamferBox(5.0, 0.22, 0.7, 0.04), matrix: transform({ pos: [0, 0.28, 0] }) });
  // stiffener ribs on the back
  const rib = chamferBox(0.14, 3.2, 0.3, 0.02);
  for (let i = 0; i < 7; i++) panelParts.push({ geometry: rib, matrix: transform({ pos: [-2.1 + i * 0.7, 1.9, 0.34] }) });
  const panel = new THREE.Mesh(mergeParts(panelParts), mats.sandMetal);
  panel.castShadow = true;
  panel.receiveShadow = true;
  arrayGroup.add(panel);
  panelParts.forEach((p) => p.geometry.dispose());

  // radiating face: instanced element grid
  const elemGeo = new THREE.CylinderGeometry(0.055, 0.07, 0.05, 6);
  elemGeo.rotateX(Math.PI / 2);
  const faceMat = std({ color: 0x22262b, roughness: 0.42, metalness: 0.7, emissive: 0x0a2a3a, emissiveIntensity: 0.6 });
  const cols = 22;
  const rows = 16;
  const elems = new THREE.InstancedMesh(elemGeo, faceMat, cols * rows);
  let ei = 0;
  const m4 = new THREE.Matrix4();
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      m4.makeTranslation(-2.05 + (c / (cols - 1)) * 4.1, 0.42 + (r / (rows - 1)) * 2.95, -0.24);
      elems.setMatrixAt(ei++, m4);
    }
  }
  elems.instanceMatrix.needsUpdate = true;
  elems.castShadow = false;
  arrayGroup.add(elems);
  g.userData.arrayFace = elems;
  g.userData.arrayFaceMat = faceMat;

  // hydraulic tilt rams
  const ramMat = mats.steel;
  for (const s of [-1, 1]) {
    const ram = new THREE.Mesh(cylinder(0.07, 0.07, 1.5, 8), ramMat);
    ram.position.set(s * 1.5, 1.0, 0.9);
    ram.rotation.x = -0.5;
    ram.castShadow = true;
    arrayGroup.add(ram);
  }

  // status light bar
  const lightBar = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.1), lamp(0x44ff88, 3.4));
  lightBar.position.set(2.0, 1.02, -1.52);
  g.add(lightBar);
  g.userData.statusLamp = lightBar;

  // marker beacon on top
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), lamp(0xff3a2a, 4));
  beacon.position.set(0, 3.95, 0);
  arrayGroup.add(beacon);
  g.userData.beacon = beacon;

  // cables to the shelter
  g.userData.cableAnchor = new THREE.Vector3(-3.6, 0.9, -1.0);

  // Secondary surveillance dish
  const dishBase = new THREE.Group();
  dishBase.position.set(9.5, 0, 0);
  g.add(dishBase);
  const mast = new THREE.Mesh(trussSegment(0.7, 4.2, 0.04), mats.galv);
  mast.castShadow = true;
  dishBase.add(mast);
  const dishSpin = new THREE.Group();
  dishSpin.position.y = 4.3;
  dishBase.add(dishSpin);
  g.userData.dishSpin = dishSpin;
  const dish = new THREE.Mesh(new THREE.SphereGeometry(1.5, 22, 12, 0, Math.PI * 2, 0, Math.PI * 0.34), mats.galv);
  dish.rotation.x = Math.PI * 0.62;
  dish.rotation.z = 0;
  dish.castShadow = true;
  dishSpin.add(dish);
  const feed = new THREE.Mesh(cylinder(0.05, 0.05, 1.3, 6), mats.steel);
  feed.position.set(0, 0.2, 0.75);
  feed.rotation.x = Math.PI / 2;
  dishSpin.add(feed);
  const feedHorn = new THREE.Mesh(cylinder(0.14, 0.07, 0.28, 8), mats.steel);
  feedHorn.position.set(0, 0.2, 1.32);
  feedHorn.rotation.x = Math.PI / 2;
  dishSpin.add(feedHorn);

  g.userData.colliders = [
    { type: 'box', pos: [0, 1.0, 0], half: [3.9, 1.0, 1.7], walkable: true },
    { type: 'cyl', pos: [9.5, 2.1, 0], r: 0.75, hh: 2.1, walkable: false },
  ];
  return g;
}

/* ------------------------------------------------------------- vehicles */

function buildTruck(rng, variant = 0) {
  const g = new THREE.Group();
  const mats = materials();
  const bodyMat = variant === 2 ? mats.sandMetal : mats.oliveMetal;
  const parts = [];
  // cab
  parts.push({ geometry: chamferBox(2.5, 1.55, 2.3, 0.09), matrix: transform({ pos: [0, 1.75, -2.6] }) });
  parts.push({ geometry: chamferBox(2.45, 0.65, 0.9, 0.06), matrix: transform({ pos: [0, 1.15, -3.9] }) });
  // bonnet
  parts.push({ geometry: chamferBox(2.3, 0.5, 1.0, 0.06), matrix: transform({ pos: [0, 1.6, -4.0] }) });
  // chassis
  parts.push({ geometry: chamferBox(2.3, 0.34, 7.6, 0.05), matrix: transform({ pos: [0, 0.95, -0.3] }) });
  // bed
  if (variant === 0) {
    parts.push({ geometry: chamferBox(2.5, 0.16, 4.6, 0.04), matrix: transform({ pos: [0, 1.16, 0.9] }) });
    const side = chamferBox(0.12, 0.95, 4.6, 0.03);
    parts.push({ geometry: side, matrix: transform({ pos: [-1.2, 1.65, 0.9] }) });
    parts.push({ geometry: side, matrix: transform({ pos: [1.2, 1.65, 0.9] }) });
    parts.push({ geometry: chamferBox(2.5, 0.95, 0.12, 0.03), matrix: transform({ pos: [0, 1.65, 3.2] }) });
    // bows for a tarp
    const bow = new THREE.TorusGeometry(1.22, 0.045, 5, 12, Math.PI);
    for (let i = 0; i < 4; i++) {
      parts.push({ geometry: bow, matrix: transform({ pos: [0, 2.1, -1.2 + i * 1.4], rot: [0, Math.PI / 2, 0] }) });
    }
  } else if (variant === 1) {
    // flatbed with cargo boxes
    parts.push({ geometry: chamferBox(2.5, 0.16, 4.8, 0.04), matrix: transform({ pos: [0, 1.16, 0.9] }) });
    for (let i = 0; i < 3; i++) {
      parts.push({ geometry: chamferBox(1.9, 0.9, 1.2, 0.05), matrix: transform({ pos: [rng.range(-0.2, 0.2), 1.7, -0.6 + i * 1.5] }) });
    }
  } else {
    // shelter body (command variant)
    parts.push({ geometry: chamferBox(2.6, 2.2, 4.8, 0.07), matrix: transform({ pos: [0, 2.28, 0.9] }) });
    parts.push({ geometry: greebleField(2.2, 1.7, rng, { count: 10, maxSize: 0.3, depth: 0.07 }), matrix: transform({ pos: [0, 2.28, 3.32] }) });
  }
  // bumper, exhaust, mirrors, spare
  parts.push({ geometry: chamferBox(2.55, 0.28, 0.22, 0.04), matrix: transform({ pos: [0, 0.95, -4.55] }) });
  parts.push({ geometry: cylinder(0.1, 0.1, 2.2, 8), matrix: transform({ pos: [1.3, 2.2, -2.3] }) });
  parts.push({ geometry: cylinder(0.13, 0.13, 0.3, 8), matrix: transform({ pos: [1.3, 3.35, -2.3] }) });
  const arm = cylinder(0.025, 0.025, 0.5, 5);
  parts.push({ geometry: arm, matrix: transform({ pos: [-1.4, 2.3, -3.5], rot: [0, 0, Math.PI / 2] }) });
  parts.push({ geometry: arm, matrix: transform({ pos: [1.4, 2.3, -3.5], rot: [0, 0, Math.PI / 2] }) });
  const body = new THREE.Mesh(mergeParts(parts), bodyMat);
  body.castShadow = true;
  body.receiveShadow = true;
  g.add(body);
  parts.forEach((p) => p.geometry.dispose());

  if (variant === 0) {
    const tarp = new THREE.Mesh(
      new THREE.CylinderGeometry(1.25, 1.25, 4.5, 14, 1, true, 0, Math.PI),
      mats.tarp
    );
    tarp.rotation.z = Math.PI / 2;
    tarp.rotation.y = Math.PI / 2;
    tarp.position.set(0, 2.1, 0.9);
    tarp.castShadow = true;
    tarp.material.side = THREE.DoubleSide;
    g.add(tarp);
  }

  // glass
  const glass = new THREE.Mesh(chamferBox(2.35, 0.85, 0.06, 0.02), mats.glass);
  glass.position.set(0, 2.05, -3.72);
  glass.rotation.x = -0.16;
  g.add(glass);

  // wheels — one mesh, since none of them turn
  const wgeo = wheel(0.62, 0.4);
  const wheelParts = [];
  for (const [x, z] of [[-1.18, -3.0], [1.18, -3.0], [-1.18, 0.6], [1.18, 0.6], [-1.18, 2.0], [1.18, 2.0]]) {
    wheelParts.push({ geometry: wgeo, matrix: transform({ pos: [x, 0.62, z] }) });
  }
  const wheels = new THREE.Mesh(mergeParts(wheelParts), mats.rubber);
  wheels.castShadow = true;
  g.add(wheels);
  wgeo.dispose();

  // headlights
  const hlParts = [];
  for (const hx of [-0.85, 0.85]) {
    const disc = new THREE.CircleGeometry(0.16, 12);
    disc.rotateY(Math.PI);
    disc.translate(hx, 1.45, -4.62);
    hlParts.push({ geometry: disc });
  }
  const hl = new THREE.Mesh(mergeParts(hlParts), lamp(0xfff3d0, 2.2));
  g.add(hl);
  hlParts.forEach((p) => p.geometry.dispose());
  g.userData.headlights = [hl];

  g.userData.colliders = [{ type: 'box', pos: [0, 1.4, -0.4], half: [1.35, 1.4, 4.3], walkable: false }];
  return g;
}

function buildGenerator(rng) {
  const g = new THREE.Group();
  const mats = materials();
  const parts = [];
  parts.push({ geometry: chamferBox(3.2, 1.8, 1.7, 0.07), matrix: transform({ pos: [0, 1.05, 0] }) });
  parts.push({ geometry: chamferBox(3.4, 0.2, 1.9, 0.04), matrix: transform({ pos: [0, 0.1, 0] }) });
  // louvre panels
  const louvre = chamferBox(1.0, 0.08, 0.06, 0.01);
  for (let i = 0; i < 9; i++) {
    parts.push({ geometry: louvre, matrix: transform({ pos: [-0.9, 0.45 + i * 0.14, -0.87], rot: [0.35, 0, 0] }) });
  }
  parts.push({ geometry: greebleField(1.1, 1.2, rng, { count: 8, maxSize: 0.22, depth: 0.07 }), matrix: transform({ pos: [0.9, 1.1, -0.88] }) });
  // exhaust stack
  parts.push({ geometry: cylinder(0.11, 0.11, 1.5, 8), matrix: transform({ pos: [1.3, 2.4, 0.5] }) });
  parts.push({ geometry: cylinder(0.15, 0.11, 0.22, 8), matrix: transform({ pos: [1.3, 3.2, 0.5] }) });
  const gen = new THREE.Mesh(mergeParts(parts), mats.sandMetal);
  gen.castShadow = true;
  gen.receiveShadow = true;
  g.add(gen);
  parts.forEach((p) => p.geometry.dispose());

  const fan = new THREE.Mesh(fanBlades(0.5), mats.steel);
  fan.position.set(-0.9, 1.05, -0.92);
  fan.userData.spin = 22;
  g.add(fan);

  const panel = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.2), lamp(0x2fff8a, 2.6));
  panel.position.set(0.9, 1.5, -0.92);
  g.add(panel);

  const strip = decalPlane(warningStripes(256, 64), [3.2, 0.18], { transparent: false });
  strip.rotation.set(Math.PI / 2, 0, 0);
  strip.position.set(0, 1.97, -0.86);
  g.add(strip);

  g.userData.colliders = [{ type: 'box', pos: [0, 1.0, 0], half: [1.75, 1.0, 0.95], walkable: false }];
  g.userData.hum = true;
  return g;
}

function buildAntennaMast(rng, height = 12) {
  const g = new THREE.Group();
  const mats = materials();
  const segH = 3;
  const n = Math.round(height / segH);
  const seg = trussSegment(0.55, segH, 0.035);
  const parts = [];
  for (let i = 0; i < n; i++) parts.push({ geometry: seg, matrix: transform({ pos: [0, i * segH, 0] }) });
  parts.push({ geometry: chamferBox(1.6, 0.24, 1.6, 0.05), matrix: transform({ pos: [0, 0.12, 0] }) });
  // dipole elements
  const dip = cylinder(0.018, 0.018, 1.4, 5);
  for (let i = 0; i < 5; i++) {
    parts.push({ geometry: dip, matrix: transform({ pos: [0, height - 1.2 - i * 0.8, 0], rot: [0, i * 0.5, Math.PI / 2] }) });
  }
  parts.push({ geometry: cylinder(0.03, 0.01, 1.8, 6), matrix: transform({ pos: [0, height + 0.9, 0] }) });
  const mast = new THREE.Mesh(mergeParts(parts), mats.galv);
  mast.castShadow = true;
  g.add(mast);
  parts.forEach((p) => p.geometry.dispose());

  // guy wires
  const wireMat = std({ color: 0x2b2b2b, roughness: 0.8, metalness: 0.3 });
  const wireParts = [];
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + 0.4;
    const anchor = new THREE.Vector3(Math.cos(a) * height * 0.55, 0.1, Math.sin(a) * height * 0.55);
    wireParts.push({ geometry: cableGeometry(new THREE.Vector3(0, height * 0.82, 0), anchor, 0.25, 0.014, 10, 4) });
    wireParts.push({ geometry: cylinder(0.05, 0.05, 0.5, 5), matrix: transform({ pos: [anchor.x, 0.25, anchor.z] }) });
  }
  const wires = new THREE.Mesh(mergeParts(wireParts), wireMat);
  g.add(wires);
  wireParts.forEach((p) => p.geometry.dispose());

  const light = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), lamp(0xff2f22, 4));
  light.position.set(0, height + 1.9, 0);
  g.add(light);
  g.userData.beacon = light;

  g.userData.colliders = [{ type: 'cyl', pos: [0, height / 2, 0], r: 0.5, hh: height / 2, walkable: false }];
  return g;
}

function buildFloodMast(height = 9) {
  const g = new THREE.Group();
  const mats = materials();
  const parts = [];
  parts.push({ geometry: cylinder(0.16, 0.2, height, 10), matrix: transform({ pos: [0, height / 2, 0] }) });
  parts.push({ geometry: chamferBox(1.1, 0.2, 1.1, 0.04), matrix: transform({ pos: [0, 0.1, 0] }) });
  parts.push({ geometry: chamferBox(2.2, 0.14, 0.24, 0.03), matrix: transform({ pos: [0, height, 0] }) });
  parts.push({
    geometry: ladder(height - 1.2, 0.36),
    matrix: transform({ pos: [0.28, 0.4, 0], rot: [0, Math.PI / 2, 0] }),
  });
  const mast = new THREE.Mesh(mergeParts(parts), mats.galv);
  mast.castShadow = true;
  g.add(mast);
  parts.forEach((p) => p.geometry.dispose());

  // Both lamp heads, and both lenses, ship as single meshes: five of these
  // masts stand on the site and each extra mesh costs a shadow-pass call too.
  const headParts = [];
  const lensParts = [];
  for (const s of [-0.8, 0.8]) {
    headParts.push({ geometry: chamferBox(0.72, 0.5, 0.34, 0.05), matrix: transform({ pos: [s, height - 0.16, 0.1], rot: [0.55, 0, 0] }) });
    const lens = new THREE.PlaneGeometry(0.6, 0.4);
    lens.rotateX(0.55);
    lens.translate(s, height - 0.3, 0.32);
    lensParts.push({ geometry: lens });
  }
  const heads = new THREE.Mesh(mergeParts(headParts), mats.darkMetal);
  heads.castShadow = true;
  g.add(heads);
  headParts.forEach((p) => p.geometry.dispose());
  const lenses = new THREE.Mesh(mergeParts(lensParts), lamp(0xfff0d2, 0));
  g.add(lenses);
  lensParts.forEach((p) => p.geometry.dispose());
  g.userData.lamps = [lenses];

  g.userData.colliders = [{ type: 'cyl', pos: [0, height / 2, 0], r: 0.45, hh: height / 2, walkable: false }];
  return g;
}

/* --------------------------------------------------------------- clutter */

function buildBarrierRun(count, spacing, mats) {
  // Jersey barrier profile via lathe-free extrusion
  const shape = new THREE.Shape();
  shape.moveTo(-0.32, 0);
  shape.lineTo(0.32, 0);
  shape.lineTo(0.22, 0.28);
  shape.lineTo(0.11, 0.5);
  shape.lineTo(0.11, 0.95);
  shape.lineTo(-0.11, 0.95);
  shape.lineTo(-0.11, 0.5);
  shape.lineTo(-0.22, 0.28);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 1.9, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02, bevelSegments: 1, curveSegments: 1 });
  geo.translate(0, 0, -0.95);
  const inst = new THREE.InstancedMesh(geo, siteMaterials().concrete, count);
  inst.castShadow = true;
  inst.receiveShadow = true;
  return inst;
}

function buildCase(rng, w = 1.0, h = 0.55, d = 0.7) {
  const parts = [];
  parts.push({ geometry: chamferBox(w, h, d, 0.04) });
  const edge = chamferBox(w * 1.02, 0.05, 0.05, 0.01);
  parts.push({ geometry: edge, matrix: transform({ pos: [0, h / 2 - 0.02, d / 2 - 0.02] }) });
  parts.push({ geometry: edge, matrix: transform({ pos: [0, -h / 2 + 0.02, d / 2 - 0.02] }) });
  parts.push({ geometry: chamferBox(0.18, 0.06, 0.1, 0.02), matrix: transform({ pos: [w * 0.28, 0, d / 2 + 0.02] }) });
  parts.push({ geometry: chamferBox(0.18, 0.06, 0.1, 0.02), matrix: transform({ pos: [-w * 0.28, 0, d / 2 + 0.02] }) });
  const g = mergeParts(parts);
  parts.forEach((p) => p.geometry.dispose());
  return g;
}

function buildFence(radius, mats) {
  const g = new THREE.Group();
  const posts = 96;
  const postGeo = cylinder(0.055, 0.055, 2.5, 6);
  const inst = new THREE.InstancedMesh(postGeo, mats.galv, posts);
  const m4 = new THREE.Matrix4();
  for (let i = 0; i < posts; i++) {
    const a = (i / posts) * Math.PI * 2;
    const x = Math.cos(a) * radius;
    const z = Math.sin(a) * radius;
    m4.makeTranslation(x, terrainHeight(x, z) + 1.25, z);
    inst.setMatrixAt(i, m4);
  }
  inst.instanceMatrix.needsUpdate = true;
  inst.castShadow = true;
  g.add(inst);

  // mesh panels as a single cylinder with an alpha texture
  // One texture tile holds 8 mesh cells; aim for ~11 cm cells.
  const circumference = Math.PI * 2 * radius;
  const linkTex = chainLinkTexture(256).clone();
  linkTex.needsUpdate = true;
  linkTex.wrapS = THREE.RepeatWrapping;
  linkTex.wrapT = THREE.RepeatWrapping;
  linkTex.repeat.set(Math.round(circumference / (8 * 0.11)), Math.round(2.3 / (8 * 0.11)));
  const meshMat = applyAtmosphere(
    new THREE.MeshStandardMaterial({
      map: linkTex,
      alphaMap: linkTex,
      transparent: true,
      alphaTest: 0.42,
      side: THREE.DoubleSide,
      color: 0x6e7276,
      roughness: 0.62,
      metalness: 0.7,
      depthWrite: true,
    })
  );
  const panel = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, 2.3, 128, 1, true), meshMat);
  panel.position.y = 1.2;
  g.add(panel);

  // razor coil along the top
  const coilPts = [];
  for (let i = 0; i <= 320; i++) {
    const a = (i / 320) * Math.PI * 2;
    const wob = Math.sin(i * 0.9) * 0.11;
    coilPts.push(new THREE.Vector3(Math.cos(a) * (radius + wob), 2.5 + Math.cos(i * 0.9) * 0.11, Math.sin(a) * (radius + wob)));
  }
  const coil = new THREE.Mesh(pathTube(coilPts, 0.022, 4, true, 0.4), mats.galv);
  g.add(coil);

  return g;
}

/* --------------------------------------------------- support installations */

/** Small painted sign on a post, used all over the site. */
function signPost(texture, w, h, postH = 1.5, doubleSided = true) {
  const g = new THREE.Group();
  const mats = materials();
  const parts = [];
  parts.push({ geometry: cylinder(0.05, 0.05, postH + h, 6), matrix: transform({ pos: [0, (postH + h) / 2, 0] }) });
  parts.push({ geometry: chamferBox(w + 0.08, h + 0.08, 0.05, 0.02), matrix: transform({ pos: [0, postH + h / 2, -0.03] }) });
  const frame = new THREE.Mesh(mergeParts(parts), mats.galv);
  frame.castShadow = true;
  g.add(frame);
  parts.forEach((p) => p.geometry.dispose());
  const face = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    std({ map: texture, color: 0xffffff, roughness: 0.93, metalness: 0, envMapIntensity: 0.3, side: doubleSided ? THREE.DoubleSide : THREE.FrontSide })
  );
  face.position.set(0, postH + h / 2, 0.005);
  face.castShadow = true;
  g.add(face);
  g.userData.colliders = [{ type: 'cyl', pos: [0, postH / 2, 0], r: 0.2, hh: postH / 2, walkable: false }];
  return g;
}

/** Bunded fuel point: two collapsible bladders, a bowser and the pipework. */
function buildFuelFarm(rng) {
  const g = new THREE.Group();
  g.name = 'fuelFarm';
  const mats = materials();
  const site = siteMaterials();

  // Bund kerb and gravel floor.
  const bundW = 19;
  const bundD = 13;
  const bundParts = [];
  bundParts.push({ geometry: chamferBox(bundW, 0.55, 0.4, 0.05), matrix: transform({ pos: [0, 0.28, -bundD / 2] }) });
  bundParts.push({ geometry: chamferBox(bundW, 0.55, 0.4, 0.05), matrix: transform({ pos: [0, 0.28, bundD / 2] }) });
  bundParts.push({ geometry: chamferBox(0.4, 0.55, bundD, 0.05), matrix: transform({ pos: [-bundW / 2, 0.28, 0] }) });
  bundParts.push({ geometry: chamferBox(0.4, 0.55, bundD, 0.05), matrix: transform({ pos: [bundW / 2, 0.28, 0] }) });
  const bund = new THREE.Mesh(mergeParts(bundParts), site.concrete);
  bund.castShadow = true;
  bund.receiveShadow = true;
  g.add(bund);
  bundParts.forEach((p) => p.geometry.dispose());

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(bundW - 0.5, bundD - 0.5), site.gravelDark);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0.07;
  {
    const uv = floor.geometry.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) * (bundW - 0.5)) / GRAVEL_TILE, (uv.getY(i) * (bundD - 0.5)) / GRAVEL_TILE);
  }
  floor.receiveShadow = true;
  g.add(floor);

  // Collapsible bladders: pillow tanks that sag on to the bund floor.
  const bladderParts = [];
  for (const [bx, bz, s, rot] of [[-4.6, -2.2, 1.0, 0.06], [-4.4, 3.2, 0.86, -0.1]]) {
    const b = new THREE.SphereGeometry(1, 18, 10);
    const p = b.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const y = p.getY(i);
      // Flatten the base and let the top bulge like a filled pillow.
      p.setY(i, y < 0 ? y * 0.16 : y * 0.62);
      p.setX(i, p.getX(i) * (3.6 - Math.abs(y) * 0.5));
      p.setZ(i, p.getZ(i) * (2.4 - Math.abs(y) * 0.3));
    }
    b.computeVertexNormals();
    bladderParts.push({ geometry: b, matrix: transform({ pos: [bx, 0.5 * s, bz], rot: [0, rot, 0], scale: [s, s, s] }) });
    b.dispose();
  }
  const bladders = new THREE.Mesh(mergeParts(bladderParts), site.canvas);
  bladders.castShadow = true;
  bladders.receiveShadow = true;
  g.add(bladders);
  bladderParts.forEach((p) => p.geometry.dispose());

  // Manifold, valves and hose runs.
  const pipeParts = [];
  pipeParts.push({ geometry: chamferBox(0.7, 1.2, 0.7, 0.05), matrix: transform({ pos: [1.6, 0.6, 0] }) });
  pipeParts.push({ geometry: cylinder(0.09, 0.09, 3.2, 8), matrix: transform({ pos: [1.6, 1.15, 0], rot: [Math.PI / 2, 0, 0] }) });
  for (const z of [-1.2, 0, 1.2]) {
    pipeParts.push({ geometry: cylinder(0.05, 0.05, 0.5, 6), matrix: transform({ pos: [1.6, 1.45, z] }) });
    pipeParts.push({ geometry: new THREE.TorusGeometry(0.15, 0.03, 4, 10), matrix: transform({ pos: [1.6, 1.7, z], rot: [Math.PI / 2, 0, 0] }) });
  }
  pipeParts.push({ geometry: cylinder(0.035, 0.035, 1.4, 5), matrix: transform({ pos: [3.4, 0.5, -3.6] }) });
  const pipes = new THREE.Mesh(mergeParts(pipeParts), mats.steel);
  pipes.castShadow = true;
  g.add(pipes);
  pipeParts.forEach((p) => p.geometry.dispose());

  const hoseMat = std({ color: 0x1c1c1e, roughness: 0.9, metalness: 0.05 });
  const hoseParts = [];
  for (const [bx, bz] of [[-4.6, -2.2], [-4.4, 3.2]]) {
    hoseParts.push({
      geometry: pathTube(
        [
          new THREE.Vector3(bx + 2.4, 0.6, bz),
          new THREE.Vector3(bx + 3.6, 0.28, bz * 0.6),
          new THREE.Vector3(1.2, 0.9, bz * 0.3),
          new THREE.Vector3(1.5, 1.2, 0),
        ],
        0.07,
        6
      ),
    });
  }
  hoseParts.push({
    geometry: pathTube(
      [new THREE.Vector3(1.8, 1.2, 1.2), new THREE.Vector3(3.6, 0.3, 2.6), new THREE.Vector3(6.0, 0.22, 1.4), new THREE.Vector3(7.4, 0.7, -0.4)],
      0.07,
      6
    ),
  });
  const hoses = new THREE.Mesh(mergeParts(hoseParts), hoseMat);
  hoses.castShadow = true;
  g.add(hoses);
  hoseParts.forEach((p) => p.geometry.dispose());

  // Towed bowser sitting on the hardstand beside the bund.
  const bowser = new THREE.Group();
  bowser.position.set(6.6, 0, -1.2);
  bowser.rotation.y = 0.22;
  const bwParts = [];
  bwParts.push({
    geometry: latheProfile(
      [[0, -1.9], [0.62, -1.9], [0.8, -1.7], [0.8, 1.7], [0.62, 1.9], [0, 1.9]],
      18
    ),
    matrix: transform({ pos: [0, 1.35, 0], rot: [Math.PI / 2, 0, 0] }),
  });
  const band = new THREE.TorusGeometry(0.82, 0.04, 5, 16);
  for (const z of [-1.1, 0, 1.1]) bwParts.push({ geometry: band, matrix: transform({ pos: [0, 1.35, z] }) });
  band.dispose();
  bwParts.push({ geometry: chamferBox(0.7, 0.24, 4.2, 0.04), matrix: transform({ pos: [0, 0.62, 0] }) });
  bwParts.push({ geometry: cylinder(0.07, 0.07, 2.2, 6), matrix: transform({ pos: [0, 0.5, -3.1], rot: [Math.PI / 2, 0, 0] }) });
  bwParts.push({ geometry: chamferBox(0.36, 0.3, 0.4, 0.04), matrix: transform({ pos: [0, 0.5, -4.1] }) });
  bwParts.push({ geometry: chamferBox(0.8, 0.7, 0.6, 0.05), matrix: transform({ pos: [0.5, 0.95, 1.9] }) });
  bwParts.push({ geometry: cylinder(0.09, 0.09, 0.4, 8), matrix: transform({ pos: [0, 2.2, 0.4] }) });
  const bwBody = new THREE.Mesh(mergeParts(bwParts), mats.sandMetal);
  bwBody.castShadow = true;
  bwBody.receiveShadow = true;
  bowser.add(bwBody);
  bwParts.forEach((p) => p.geometry.dispose());
  const bwWheel = wheel(0.44, 0.26);
  const bwWheels = new THREE.Mesh(
    mergeParts([
      { geometry: bwWheel, matrix: transform({ pos: [-0.62, 0.44, -0.2] }) },
      { geometry: bwWheel, matrix: transform({ pos: [0.62, 0.44, -0.2] }) },
    ]),
    mats.rubber
  );
  bwWheels.castShadow = true;
  bowser.add(bwWheels);
  bwWheel.dispose();
  const bwStripe = decalPlane(warningStripes(256, 64), [3.6, 0.3], { transparent: false });
  bwStripe.rotation.set(Math.PI / 2, Math.PI / 2, 0);
  bwStripe.position.set(-0.83, 1.35, 0);
  bowser.add(bwStripe);
  bowser.userData.colliders = [{ type: 'box', pos: [0, 1.1, -0.4], half: [0.95, 1.1, 2.6], walkable: false }];
  g.add(bowser);

  // Signage on the bund kerb.
  const sign = signPost(
    signBoardTexture(320, 200, {
      lines: ['FUEL POINT 2', 'NO NAKED FLAME', 'EARTH BEFORE TRANSFER'],
      bg: '#c2a33c',
      fg: '#1d1c18',
      accent: '#a8451c',
      font: 'bold 34px "Arial Narrow", Impact, sans-serif',
    }),
    1.5,
    0.95,
    1.4
  );
  sign.position.set(-bundW / 2 - 1.6, 0, -3.4);
  sign.rotation.y = 0.5;
  g.add(sign);

  g.userData.colliders = [
    { type: 'box', pos: [0, 0.28, -bundD / 2], half: [bundW / 2, 0.28, 0.25], walkable: false },
    { type: 'box', pos: [0, 0.28, bundD / 2], half: [bundW / 2, 0.28, 0.25], walkable: false },
    { type: 'box', pos: [-bundW / 2, 0.28, 0], half: [0.25, 0.28, bundD / 2], walkable: false },
    { type: 'box', pos: [bundW / 2, 0.28, 0], half: [0.25, 0.28, bundD / 2], walkable: false },
    { type: 'box', pos: [-4.6, 0.5, -2.2], half: [3.7, 0.5, 2.5], walkable: false },
    { type: 'box', pos: [-4.4, 0.44, 3.2], half: [3.2, 0.44, 2.2], walkable: false },
    { type: 'box', pos: [1.6, 0.8, 0], half: [0.5, 0.8, 1.9], walkable: false },
  ];
  return g;
}

/** Elevated water tank on a braced stand. */
function buildWaterTank(rng) {
  const g = new THREE.Group();
  g.name = 'waterTank';
  const mats = materials();
  const standH = 4.6;
  const legParts = [];
  const legs = [[-1.9, -1.9], [1.9, -1.9], [1.9, 1.9], [-1.9, 1.9]];
  for (const [x, z] of legs) {
    legParts.push({ geometry: cylinder(0.11, 0.13, standH, 8), matrix: transform({ pos: [x * 1.06, standH / 2, z * 1.06] }) });
    legParts.push({ geometry: chamferBox(0.6, 0.14, 0.6, 0.03), matrix: transform({ pos: [x * 1.12, 0.07, z * 1.12] }) });
  }
  // cross-bracing on all four faces
  for (let i = 0; i < 4; i++) {
    const a = legs[i];
    const b = legs[(i + 1) % 4];
    const span = Math.hypot(b[0] - a[0], b[1] - a[1]) * 1.06;
    const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
    const diag = Math.hypot(span, standH * 0.52);
    for (const s of [-1, 1]) {
      for (const yc of [standH * 0.28, standH * 0.76]) {
        legParts.push({
          geometry: cylinder(0.045, 0.045, diag, 5),
          matrix: transform({
            pos: [((a[0] + b[0]) / 2) * 1.06, yc, ((a[1] + b[1]) / 2) * 1.06],
            rot: [0, -ang, s * Math.atan2(span, standH * 0.52)],
          }),
        });
      }
    }
    legParts.push({
      geometry: cylinder(0.05, 0.05, span, 5),
      matrix: transform({ pos: [((a[0] + b[0]) / 2) * 1.06, standH * 0.52, ((a[1] + b[1]) / 2) * 1.06], rot: [0, -ang, Math.PI / 2] }),
    });
  }
  legParts.push({ geometry: chamferBox(4.6, 0.16, 4.6, 0.04), matrix: transform({ pos: [0, standH + 0.08, 0] }) });
  const stand = new THREE.Mesh(mergeParts(legParts), mats.galv);
  stand.castShadow = true;
  stand.receiveShadow = true;
  g.add(stand);
  legParts.forEach((p) => p.geometry.dispose());

  const tankParts = [];
  tankParts.push({
    geometry: latheProfile(
      [[0, 0], [1.9, 0], [2.0, 0.2], [2.0, 2.5], [1.86, 2.78], [1.2, 2.98], [0, 3.02]],
      22
    ),
    matrix: transform({ pos: [0, standH + 0.16, 0] }),
  });
  const hoop = new THREE.TorusGeometry(2.03, 0.05, 5, 20);
  for (const y of [0.55, 1.5, 2.35]) tankParts.push({ geometry: hoop, matrix: transform({ pos: [0, standH + 0.16 + y, 0], rot: [Math.PI / 2, 0, 0] }) });
  hoop.dispose();
  tankParts.push({ geometry: cylinder(0.42, 0.42, 0.24, 12), matrix: transform({ pos: [0.7, standH + 3.2, 0] }) });
  tankParts.push({ geometry: cylinder(0.14, 0.14, standH + 2.4, 8), matrix: transform({ pos: [1.6, (standH + 2.4) / 2, 1.4] }) });
  tankParts.push({ geometry: chamferBox(0.34, 0.34, 0.34, 0.04), matrix: transform({ pos: [1.6, 1.1, 1.4] }) });
  tankParts.push({ geometry: cylinder(0.07, 0.07, 0.5, 6), matrix: transform({ pos: [1.6, 1.1, 1.75], rot: [Math.PI / 2, 0, 0] }) });
  const tank = new THREE.Mesh(mergeParts(tankParts), mats.sandMetal);
  tank.castShadow = true;
  tank.receiveShadow = true;
  g.add(tank);
  tankParts.forEach((p) => p.geometry.dispose());

  const lad = new THREE.Mesh(ladder(standH + 3.0, 0.42), mats.galv);
  lad.position.set(-2.16, 0, 0);
  lad.rotation.y = Math.PI / 2;
  lad.castShadow = true;
  g.add(lad);

  const stencil = decalPlane(
    stencilDecal(['POTABLE WATER', 'SITE SUPPLY 04'], { w: 512, h: 200, color: '#e8e2d0', font: 'bold 58px "Arial Narrow", Impact, sans-serif' }),
    [3.0, 1.2]
  );
  stencil.rotation.set(Math.PI / 2, 0, 0);
  stencil.position.set(0, standH + 1.8, -2.03);
  g.add(stencil);

  g.userData.colliders = [
    { type: 'cyl', pos: [0, 2.3, 0], r: 2.3, hh: 2.3, walkable: false },
  ];
  return g;
}

/** Frame-and-tarp maintenance tent with an open end. */
function buildTent(rng, { length = 12, radius = 3.4, tan = false } = {}) {
  const g = new THREE.Group();
  g.name = 'tent';
  const mats = materials();
  const site = siteMaterials();

  const frameParts = [];
  const bays = Math.max(3, Math.round(length / 2.4));
  const arch = new THREE.TorusGeometry(radius, 0.05, 5, 16, Math.PI);
  for (let i = 0; i <= bays; i++) {
    const z = -length / 2 + (i / bays) * length;
    frameParts.push({ geometry: arch, matrix: transform({ pos: [0, 0.32, z], rot: [0, Math.PI / 2, 0] }) });
  }
  arch.dispose();
  const purlin = cylinder(0.04, 0.04, length, 5);
  for (const [ax, ay] of [[0, radius], [-radius * 0.72, radius * 0.7], [radius * 0.72, radius * 0.7], [-radius * 0.97, radius * 0.24], [radius * 0.97, radius * 0.24]]) {
    frameParts.push({ geometry: purlin, matrix: transform({ pos: [ax, 0.32 + ay, 0], rot: [Math.PI / 2, 0, 0] }) });
  }
  purlin.dispose();
  for (const s of [-1, 1]) {
    frameParts.push({ geometry: chamferBox(0.24, 0.32, length + 0.4, 0.03), matrix: transform({ pos: [s * radius, 0.16, 0] }) });
  }
  const frame = new THREE.Mesh(mergeParts(frameParts), mats.galv);
  frame.castShadow = true;
  g.add(frame);
  frameParts.forEach((p) => p.geometry.dispose());

  const tarpGeo = new THREE.CylinderGeometry(radius + 0.08, radius + 0.08, length, 18, 4, true, 0, Math.PI);
  {
    // Let the fabric sag a little between the arches.
    const p = tarpGeo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const y = p.getY(i);
      const phase = Math.sin(((y + length / 2) / length) * bays * Math.PI * 2);
      const k = 1 - Math.abs(phase) * 0.022;
      p.setX(i, p.getX(i) * k);
      p.setZ(i, p.getZ(i) * k);
    }
    tarpGeo.computeVertexNormals();
    const uv = tarpGeo.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * (radius * Math.PI) / 4, uv.getY(i) * length / 4);
  }
  const tarp = new THREE.Mesh(tarpGeo, tan ? siteMaterials().canvasTan : site.canvas);
  tarp.rotation.z = Math.PI / 2;
  tarp.rotation.y = Math.PI / 2;
  tarp.position.y = 0.32;
  tarp.castShadow = true;
  tarp.receiveShadow = true;
  g.add(tarp);

  // Closed back wall, and a rolled-up flap at the working end.
  const endParts = [];
  const endGeo = new THREE.CircleGeometry(radius + 0.06, 18, 0, Math.PI);
  endParts.push({ geometry: endGeo, matrix: transform({ pos: [0, 0.32, length / 2 + 0.02] }) });
  endGeo.dispose();
  const flap = new THREE.CylinderGeometry(0.34, 0.34, radius * 1.7, 10);
  endParts.push({ geometry: flap, matrix: transform({ pos: [0, radius - 0.1, -length / 2 - 0.1], rot: [0, 0, Math.PI / 2] }) });
  flap.dispose();
  const ends = new THREE.Mesh(mergeParts(endParts), tan ? siteMaterials().canvasTan : site.canvas);
  ends.castShadow = true;
  g.add(ends);
  endParts.forEach((p) => p.geometry.dispose());

  // Guy ropes and stakes.
  const ropeMat = std({ color: 0x8c8163, roughness: 1, metalness: 0 });
  const ropeParts = [];
  for (let i = 0; i <= bays; i += 2) {
    const z = -length / 2 + (i / bays) * length;
    for (const s of [-1, 1]) {
      const top = new THREE.Vector3(s * radius * 0.82, 0.32 + radius * 0.62, z);
      const anchor = new THREE.Vector3(s * (radius + 2.1), 0.05, z + rng.range(-0.4, 0.4));
      ropeParts.push({ geometry: cableGeometry(top, anchor, 0.12, 0.018, 6, 4) });
      ropeParts.push({ geometry: cylinder(0.035, 0.035, 0.55, 5), matrix: transform({ pos: [anchor.x, 0.2, anchor.z], rot: [s * 0.3, 0, 0] }) });
    }
  }
  const ropes = new THREE.Mesh(mergeParts(ropeParts), ropeMat);
  g.add(ropes);
  ropeParts.forEach((p) => p.geometry.dispose());

  g.userData.colliders = [
    { type: 'box', pos: [0, 1.4, 0], half: [radius + 0.1, 1.4, length / 2 + 0.1], walkable: false },
  ];
  return g;
}

/** Pallets, crates and drums in a fenced-off stores yard. */
function buildStoresYard(rng) {
  const g = new THREE.Group();
  g.name = 'stores';
  const mats = materials();
  const site = siteMaterials();

  // Pallet: three deck boards over three bearers.
  const palletParts = [];
  for (let i = 0; i < 5; i++) {
    palletParts.push({ geometry: chamferBox(1.15, 0.035, 0.13, 0.008), matrix: transform({ pos: [0, 0.135, -0.4 + i * 0.2] }) });
  }
  for (const z of [-0.42, 0, 0.42]) {
    palletParts.push({ geometry: chamferBox(1.15, 0.09, 0.1, 0.01), matrix: transform({ pos: [0, 0.06, z] }) });
  }
  const palletGeo = mergeParts(palletParts);
  palletParts.forEach((p) => p.geometry.dispose());

  const crateGeo = chamferBox(1.05, 0.7, 0.85, 0.03);
  const drumGeo = (() => {
    const parts = [{ geometry: cylinder(0.3, 0.3, 0.88, 12) }];
    const rib = new THREE.TorusGeometry(0.31, 0.028, 4, 12);
    for (const y of [-0.2, 0.2]) parts.push({ geometry: rib, matrix: transform({ pos: [0, y, 0], rot: [Math.PI / 2, 0, 0] }) });
    rib.dispose();
    const m = mergeParts(parts);
    parts.forEach((p) => p.geometry.dispose());
    return m;
  })();

  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const sc = new THREE.Vector3(1, 1, 1);
  const yards = [
    [0, 0, 0.2],
    [9.5, -3.5, -0.5],
    [-8.5, 4.0, 1.1],
  ];

  const pallets = new THREE.InstancedMesh(palletGeo, site.timber, 34);
  const crates = new THREE.InstancedMesh(crateGeo, site.timber, 46);
  const drums = new THREE.InstancedMesh(drumGeo, mats.sandMetal, 26);
  let pi = 0;
  let ci = 0;
  let di = 0;
  const colliders = [];
  for (const [ox, oz, oyaw] of yards) {
    const rows = 2 + Math.floor(rng.next() * 2);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < 3; c++) {
        const lx = (c - 1) * 1.35 + rng.range(-0.06, 0.06);
        const lz = (r - (rows - 1) / 2) * 1.15 + rng.range(-0.06, 0.06);
        const yaw = oyaw + rng.range(-0.08, 0.08);
        const px = ox + lx * Math.cos(oyaw) - lz * Math.sin(oyaw);
        const pz = oz + lx * Math.sin(oyaw) + lz * Math.cos(oyaw);
        if (pi < 34) {
          q.setFromEuler(new THREE.Euler(0, yaw, 0));
          m4.compose(new THREE.Vector3(px, 0, pz), q, sc);
          pallets.setMatrixAt(pi++, m4);
        }
        const stack = rng.next() > 0.35 ? (rng.next() > 0.6 ? 2 : 1) : 0;
        for (let s = 0; s < stack && ci < 46; s++) {
          q.setFromEuler(new THREE.Euler(0, yaw + rng.range(-0.1, 0.1), 0));
          const h = 0.7 * (s === 1 ? 0.8 : 1);
          sc.set(1, s === 1 ? 0.8 : 1, 1);
          m4.compose(new THREE.Vector3(px, 0.17 + h / 2 + s * 0.7, pz), q, sc);
          crates.setMatrixAt(ci++, m4);
          sc.set(1, 1, 1);
        }
      }
    }
    // A short row of drums along one edge.
    const dn = 4 + Math.floor(rng.next() * 4);
    for (let i = 0; i < dn && di < 26; i++) {
      const lx = 2.6;
      const lz = -2.0 + i * 0.68;
      const px = ox + lx * Math.cos(oyaw) - lz * Math.sin(oyaw);
      const pz = oz + lx * Math.sin(oyaw) + lz * Math.cos(oyaw);
      q.setFromEuler(new THREE.Euler(0, rng.range(0, Math.PI), 0));
      m4.compose(new THREE.Vector3(px, 0.44, pz), q, sc);
      drums.setMatrixAt(di++, m4);
    }
    colliders.push({ type: 'box', pos: [ox, 0.6, oz], half: [2.4, 0.6, 2.4], walkable: false });
    colliders.push({ type: 'box', pos: [ox + 2.6 * Math.cos(oyaw), 0.44, oz + 2.6 * Math.sin(oyaw)], half: [0.45, 0.44, 1.6], yaw: oyaw, walkable: false });
  }
  pallets.count = pi;
  crates.count = ci;
  drums.count = di;
  for (const m of [pallets, crates, drums]) {
    m.instanceMatrix.needsUpdate = true;
    m.castShadow = true;
    m.receiveShadow = true;
    g.add(m);
  }

  // One stack under a lashed tarp.
  const tarpGeo = new THREE.BoxGeometry(3.2, 1.7, 2.4, 4, 3, 3);
  {
    const p = tarpGeo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const s = 1 + noise.fbm3(p.getX(i) * 1.3, p.getY(i) * 1.3, p.getZ(i) * 1.3, 2) * 0.09;
      p.setXYZ(i, p.getX(i) * s, p.getY(i) * s, p.getZ(i) * s);
    }
    tarpGeo.computeVertexNormals();
    const uv = tarpGeo.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 0.8, uv.getY(i) * 0.6);
  }
  const covered = new THREE.Mesh(tarpGeo, site.canvasTan);
  covered.position.set(-4.4, 0.95, -3.2);
  covered.rotation.y = 0.3;
  covered.castShadow = true;
  covered.receiveShadow = true;
  g.add(covered);
  colliders.push({ type: 'box', pos: [-4.4, 0.9, -3.2], half: [1.8, 0.9, 1.4], yaw: 0.3, walkable: false });

  g.userData.colliders = colliders;
  return g;
}

/** Reload store: a concrete box wrapped in an earth berm. */
function buildBunker(rng) {
  const g = new THREE.Group();
  g.name = 'bunker';
  const mats = materials();
  const site = siteMaterials();
  const W = 16;
  const D = 11;
  const H = 3.9;

  const shellParts = [];
  shellParts.push({ geometry: chamferBox(W, H, D, 0.12), matrix: transform({ pos: [0, H / 2, 0] }) });
  shellParts.push({ geometry: chamferBox(W + 1.0, 0.45, D + 1.0, 0.08), matrix: transform({ pos: [0, H + 0.2, 0] }) });
  // Entrance throat on the -Z face.
  shellParts.push({ geometry: chamferBox(5.0, 3.4, 2.6, 0.08), matrix: transform({ pos: [0, 1.7, -D / 2 - 1.2] }) });
  shellParts.push({ geometry: chamferBox(5.6, 0.4, 3.0, 0.06), matrix: transform({ pos: [0, 3.6, -D / 2 - 1.2] }) });
  const vent = cylinder(0.34, 0.34, 1.6, 10);
  for (const vx of [-4.6, 4.6]) {
    shellParts.push({ geometry: vent, matrix: transform({ pos: [vx, H + 1.1, 2.0] }) });
    shellParts.push({ geometry: cylinder(0.46, 0.34, 0.3, 10), matrix: transform({ pos: [vx, H + 2.0, 2.0] }) });
  }
  vent.dispose();
  const shell = new THREE.Mesh(mergeParts(shellParts), site.concrete);
  shell.castShadow = true;
  shell.receiveShadow = true;
  g.add(shell);
  shellParts.forEach((p) => p.geometry.dispose());

  // Twin blast doors set into the throat.
  const doorParts = [];
  for (const s of [-1, 1]) {
    doorParts.push({ geometry: chamferBox(1.7, 2.9, 0.18, 0.04), matrix: transform({ pos: [s * 0.88, 1.5, -D / 2 - 2.55] }) });
    doorParts.push({ geometry: boltRow(6, 0.42, 0.035, 0.02, 'y'), matrix: transform({ pos: [s * 1.6, 1.5, -D / 2 - 2.66], rot: [Math.PI / 2, 0, 0] }) });
    doorParts.push({ geometry: cylinder(0.05, 0.05, 0.9, 6), matrix: transform({ pos: [s * 0.28, 1.5, -D / 2 - 2.7] }) });
  }
  const doors = new THREE.Mesh(mergeParts(doorParts), mats.darkMetal);
  doors.castShadow = true;
  g.add(doors);
  doorParts.forEach((p) => p.geometry.dispose());

  // Earth berm: a rounded rectangular mound of bulldozed spoil banked against
  // three walls. Built as one continuous lofted sheet with shared vertices —
  // stitching it out of loose quads leaves every facet hard-shaded, which on a
  // sunlit slope reads as a folded paper ramp rather than a pile of dirt.
  const segs = 64;
  const rows = 6;
  const innerW = W / 2 + 0.9;
  const innerD = D / 2 + 0.9;
  const crestY = H * 0.92;
  const bermPos = [];
  const bermUv = [];
  const bermIdx = [];
  const ring = [];
  for (let i = 0; i <= segs; i++) {
    const t = (i / segs) * Math.PI * 2;
    const cx = Math.cos(t);
    const cz = Math.sin(t);
    // Squircle: rectangular enough to hug the walls, round at the corners.
    const k = 2 / 2.4;
    ring.push([Math.sign(cx) * Math.pow(Math.abs(cx), k), Math.sign(cz) * Math.pow(Math.abs(cz), k)]);
  }
  for (let i = 0; i <= segs; i++) {
    const [rx, rz] = ring[i];
    // Bulldozed spoil is never an even prism: vary the toe and the crest.
    const wob = 1 + noise.fbm2(rx * 2.2, rz * 2.2, 2) * 0.22;
    const crestWob = 1 + noise.fbm2(rx * 3.7 + 11, rz * 3.7 - 4, 2) * 0.1;
    for (let j = 0; j <= rows; j++) {
      const s = j / rows;
      // Crest first (a rounded shoulder), then an easing slope to the toe.
      const out = s < 0.2 ? (s / 0.2) * 1.3 : 1.3 + Math.pow((s - 0.2) / 0.8, 0.86) * 5.6 * wob;
      const y = s < 0.2 ? crestY * crestWob * (1 - 0.04 * (s / 0.2)) : crestY * crestWob * Math.pow(1 - (s - 0.2) / 0.8, 1.55);
      const bx = rx * (innerW + out);
      const bz = rz * (innerD + out);
      bermPos.push(bx, y, bz);
      // Planar UV in world metres: the slope is shallow enough that the
      // stretch never shows, and it keeps the spoil at the same grain as the
      // hardcore it is pushed up from.
      bermUv.push(bx / GRAVEL_TILE, bz / GRAVEL_TILE);
    }
  }
  const stride = rows + 1;
  for (let i = 0; i < segs; i++) {
    // Leave the berm open in front of the blast doors.
    const mid = [(ring[i][0] + ring[i + 1][0]) / 2, (ring[i][1] + ring[i + 1][1]) / 2];
    if (mid[1] < -0.55 && Math.abs(mid[0]) < 0.62) continue;
    for (let j = 0; j < rows; j++) {
      const a = i * stride + j;
      const b = (i + 1) * stride + j;
      bermIdx.push(a, a + 1, b, b, a + 1, b + 1);
    }
  }
  const bermGeo = new THREE.BufferGeometry();
  bermGeo.setAttribute('position', new THREE.Float32BufferAttribute(bermPos, 3));
  bermGeo.setAttribute('uv', new THREE.Float32BufferAttribute(bermUv, 2));
  bermGeo.setIndex(bermIdx);
  bermGeo.computeVertexNormals();
  const berm = new THREE.Mesh(bermGeo, site.spoil);
  berm.castShadow = true;
  berm.receiveShadow = true;
  g.add(berm);

  // Hard standing and a turning apron in front of the doors.
  const apron = new THREE.Mesh(new THREE.PlaneGeometry(15, 13), site.gravelDark);
  apron.rotation.x = -Math.PI / 2;
  apron.position.set(0, 0.03, -D / 2 - 8.5);
  {
    const uv = apron.geometry.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) * 15) / GRAVEL_TILE, (uv.getY(i) * 13) / GRAVEL_TILE);
  }
  apron.receiveShadow = true;
  g.add(apron);

  const sign = signPost(
    signBoardTexture(320, 200, {
      lines: ['STORE 3', 'NO UNAUTHORISED', 'ACCESS'],
      bg: '#b23a20',
      fg: '#efe7d2',
      border: '#efe7d2',
      font: 'bold 40px "Arial Narrow", Impact, sans-serif',
    }),
    1.4,
    0.9,
    1.5
  );
  sign.position.set(-4.2, 0, -D / 2 - 3.6);
  sign.rotation.y = 0.2;
  g.add(sign);

  const lampHead = new THREE.Mesh(chamferBox(0.5, 0.28, 0.3, 0.04), mats.darkMetal);
  lampHead.position.set(0, 3.9, -D / 2 - 2.7);
  lampHead.rotation.x = 0.55;
  g.add(lampHead);
  const lampLens = new THREE.Mesh(new THREE.PlaneGeometry(0.38, 0.18), lamp(0xffe9c0, 0));
  lampLens.position.set(0, 3.78, -D / 2 - 2.55);
  lampLens.rotation.x = 0.55;
  g.add(lampLens);
  g.userData.extLamps = [lampLens];

  g.userData.colliders = [
    { type: 'box', pos: [0, H / 2, 0], half: [W / 2 + 5.4, H / 2, D / 2 + 5.4], walkable: false },
    { type: 'box', pos: [0, 1.7, -D / 2 - 1.2], half: [2.5, 1.7, 1.4], walkable: false },
  ];
  return g;
}

/** Gate house with a boom barrier and bollards. */
function buildGuardPost(rng) {
  const g = new THREE.Group();
  g.name = 'guardPost';
  const mats = materials();

  const cabinParts = [];
  cabinParts.push({ geometry: chamferBox(3.0, 2.7, 2.6, 0.06), matrix: transform({ pos: [0, 1.45, 0] }) });
  cabinParts.push({ geometry: chamferBox(3.6, 0.16, 3.2, 0.05), matrix: transform({ pos: [0, 2.88, 0], rot: [0.05, 0, 0] }) });
  cabinParts.push({ geometry: chamferBox(3.3, 0.3, 2.9, 0.05), matrix: transform({ pos: [0, 0.15, 0] }) });
  cabinParts.push({ geometry: chamferBox(0.9, 2.1, 0.08, 0.03), matrix: transform({ pos: [0.9, 1.15, -1.32] }) });
  cabinParts.push({ geometry: chamferBox(1.0, 0.7, 0.7, 0.05), matrix: transform({ pos: [-1.2, 3.15, 0.4] }) });
  const cabin = new THREE.Mesh(mergeParts(cabinParts), mats.sandMetal);
  cabin.castShadow = true;
  cabin.receiveShadow = true;
  g.add(cabin);
  cabinParts.forEach((p) => p.geometry.dispose());

  const glassParts = [];
  glassParts.push({ geometry: chamferBox(2.4, 1.1, 0.05, 0.02), matrix: transform({ pos: [0, 1.85, 1.32] }) });
  glassParts.push({ geometry: chamferBox(0.05, 1.1, 1.8, 0.02), matrix: transform({ pos: [1.52, 1.85, 0] }) });
  glassParts.push({ geometry: chamferBox(0.05, 1.1, 1.8, 0.02), matrix: transform({ pos: [-1.52, 1.85, 0] }) });
  const glass = new THREE.Mesh(mergeParts(glassParts), mats.glass);
  g.add(glass);
  glassParts.forEach((p) => p.geometry.dispose());

  const interior = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.34), lamp(0x9fe8ff, 1.6, { side: THREE.DoubleSide }));
  interior.position.set(0.3, 1.75, 0.9);
  interior.rotation.y = -0.5;
  g.add(interior);

  const lampHead = new THREE.Mesh(chamferBox(0.42, 0.24, 0.3, 0.04), mats.darkMetal);
  lampHead.position.set(0, 3.0, 1.45);
  lampHead.rotation.x = 0.6;
  g.add(lampHead);
  const lampLens = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.15), lamp(0xffe9c0, 0));
  lampLens.position.set(0, 2.9, 1.6);
  lampLens.rotation.x = 0.6;
  g.add(lampLens);
  g.userData.extLamps = [interior, lampLens];

  // Bollards in a line between the cabin and the carriageway.
  const bollardGeo = mergeParts([
    { geometry: cylinder(0.13, 0.13, 1.0, 10), matrix: transform({ pos: [0, 0.5, 0] }) },
    { geometry: cylinder(0.15, 0.11, 0.12, 10), matrix: transform({ pos: [0, 1.02, 0] }) },
  ]);
  const bollards = new THREE.InstancedMesh(bollardGeo, mats.sandMetal, 7);
  const m4 = new THREE.Matrix4();
  for (let i = 0; i < 7; i++) {
    m4.makeTranslation(-3.0 + i * 1.9, 0, 2.2 + rng.range(-0.15, 0.15));
    bollards.setMatrixAt(i, m4);
  }
  bollards.instanceMatrix.needsUpdate = true;
  bollards.castShadow = true;
  g.add(bollards);

  g.userData.colliders = [{ type: 'box', pos: [0, 1.4, 0], half: [1.6, 1.4, 1.4], walkable: false }];
  return g;
}

/** Counterweighted boom across the entry road. Arm lies along local +Z. */
function buildBoomBarrier(armLen = 13) {
  const g = new THREE.Group();
  g.name = 'boom';
  const mats = materials();

  const pivotParts = [];
  pivotParts.push({ geometry: chamferBox(0.6, 1.25, 0.6, 0.05), matrix: transform({ pos: [0, 0.62, 0] }) });
  pivotParts.push({ geometry: chamferBox(0.95, 0.22, 0.95, 0.04), matrix: transform({ pos: [0, 0.09, 0] }) });
  pivotParts.push({ geometry: cylinder(0.11, 0.11, 0.5, 10), matrix: transform({ pos: [0, 1.24, 0], rot: [Math.PI / 2, 0, 0] }) });
  const pivot = new THREE.Mesh(mergeParts(pivotParts), mats.sandMetal);
  pivot.castShadow = true;
  g.add(pivot);
  pivotParts.forEach((p) => p.geometry.dispose());

  const armParts = [];
  armParts.push({ geometry: chamferBox(0.16, 0.2, armLen, 0.03), matrix: transform({ pos: [0, 1.24, armLen / 2 - 0.6] }) });
  armParts.push({ geometry: chamferBox(0.34, 0.36, 0.9, 0.05), matrix: transform({ pos: [0, 1.24, -1.0] }) });
  const skirtRod = cylinder(0.02, 0.02, 0.52, 5);
  for (let i = 0; i < 10; i++) {
    armParts.push({ geometry: skirtRod, matrix: transform({ pos: [0, 0.9, 0.5 + i * ((armLen - 1.6) / 10)] }) });
  }
  skirtRod.dispose();
  armParts.push({ geometry: cylinder(0.07, 0.09, 1.24, 6), matrix: transform({ pos: [0, 0.62, armLen - 1.0] }) });
  armParts.push({
    geometry: new THREE.TorusGeometry(0.17, 0.03, 4, 10, Math.PI),
    matrix: transform({ pos: [0, 1.22, armLen - 1.0], rot: [0, Math.PI / 2, 0] }),
  });
  const arm = new THREE.Mesh(mergeParts(armParts), mats.galv);
  arm.castShadow = true;
  g.add(arm);
  armParts.forEach((p) => p.geometry.dispose());

  for (const s of [-1, 1]) {
    const stripe = decalPlane(warningStripes(512, 64), [armLen - 1.2, 0.24], { transparent: false });
    stripe.rotation.set(0, (s * Math.PI) / 2, 0);
    stripe.position.set(s * 0.09, 1.24, armLen / 2 - 0.6);
    g.add(stripe);
  }

  g.userData.colliders = [
    { type: 'cyl', pos: [0, 0.7, 0], r: 0.5, hh: 0.7, walkable: false },
    { type: 'cyl', pos: [0, 0.62, armLen - 1.0], r: 0.16, hh: 0.62, walkable: false },
  ];
  return g;
}

/** Perimeter gate: posts, a rolled-back leaf and hazard plates. */
function buildGate(rng) {
  const g = new THREE.Group();
  g.name = 'gate';
  const mats = materials();

  const postParts = [];
  for (const s of [-1, 1]) {
    postParts.push({ geometry: cylinder(0.14, 0.14, 3.4, 10), matrix: transform({ pos: [0, 1.7, s * 5.2] }) });
    postParts.push({ geometry: cylinder(0.2, 0.24, 0.4, 10), matrix: transform({ pos: [0, 0.2, s * 5.2] }) });
    postParts.push({ geometry: cylinder(0.16, 0.05, 0.22, 8), matrix: transform({ pos: [0, 3.48, s * 5.2] }) });
    postParts.push({ geometry: cylinder(0.07, 0.07, 2.6, 6), matrix: transform({ pos: [0, 1.4, s * 6.9], rot: [0.5, 0, 0] }) });
  }
  postParts.push({ geometry: cylinder(0.09, 0.09, 10.4, 8), matrix: transform({ pos: [0, 3.3, 0], rot: [Math.PI / 2, 0, 0] }) });
  const posts = new THREE.Mesh(mergeParts(postParts), mats.galv);
  posts.castShadow = true;
  g.add(posts);
  postParts.forEach((p) => p.geometry.dispose());

  // Gate leaf rolled back against the fence line.
  const leafFrame = new THREE.Mesh(
    mergeParts([
      { geometry: cylinder(0.06, 0.06, 5.6, 6), matrix: transform({ pos: [0, 0.15, 0], rot: [Math.PI / 2, 0, 0] }) },
      { geometry: cylinder(0.06, 0.06, 5.6, 6), matrix: transform({ pos: [0, 2.35, 0], rot: [Math.PI / 2, 0, 0] }) },
      { geometry: cylinder(0.06, 0.06, 2.2, 6), matrix: transform({ pos: [0, 1.25, -2.8] }) },
      { geometry: cylinder(0.06, 0.06, 2.2, 6), matrix: transform({ pos: [0, 1.25, 2.8] }) },
      { geometry: cylinder(0.05, 0.05, 6.0, 5), matrix: transform({ pos: [0, 1.25, 0], rot: [Math.PI / 2 - 0.36, 0, 0] }) },
    ]),
    mats.galv
  );
  leafFrame.position.set(-0.4, 0, 8.4);
  leafFrame.castShadow = true;
  g.add(leafFrame);

  const link = chainLinkTexture(256).clone();
  link.needsUpdate = true;
  link.wrapS = THREE.RepeatWrapping;
  link.wrapT = THREE.RepeatWrapping;
  link.repeat.set(6.4, 2.5);
  const leafMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(5.6, 2.2),
    applyAtmosphere(
      new THREE.MeshStandardMaterial({
        map: link,
        alphaMap: link,
        transparent: true,
        alphaTest: 0.42,
        side: THREE.DoubleSide,
        color: 0x777b7f,
        roughness: 0.6,
        metalness: 0.7,
      })
    )
  );
  leafMesh.position.set(-0.4, 1.25, 8.4);
  leafMesh.rotation.y = Math.PI / 2;
  g.add(leafMesh);

  const plate = new THREE.Mesh(
    new THREE.PlaneGeometry(1.6, 1.0),
    std({
      map: signBoardTexture(320, 200, {
        lines: ['RESTRICTED AREA', 'AEGIS RIDGE', 'NO ENTRY WITHOUT PASS'],
        bg: '#c6bb9f',
        accent: '#b23a20',
        font: 'bold 32px "Arial Narrow", Impact, sans-serif',
      }),
      color: 0xffffff,
      roughness: 0.93,
      metalness: 0,
      envMapIntensity: 0.3,
      side: THREE.DoubleSide,
    })
  );
  plate.position.set(0.12, 2.0, 5.2);
  plate.rotation.y = Math.PI / 2;
  g.add(plate);

  g.userData.colliders = [
    { type: 'cyl', pos: [0, 1.7, 5.2], r: 0.3, hh: 1.7, walkable: false },
    { type: 'cyl', pos: [0, 1.7, -5.2], r: 0.3, hh: 1.7, walkable: false },
    { type: 'box', pos: [-0.4, 1.25, 8.4], half: [0.12, 1.25, 2.8], walkable: false },
  ];
  return g;
}

function buildFlagpole() {
  const g = new THREE.Group();
  g.name = 'flagpole';
  const mats = materials();
  const H = 11.5;
  const parts = [];
  parts.push({ geometry: cylinder(0.075, 0.13, H, 10), matrix: transform({ pos: [0, H / 2, 0] }) });
  parts.push({ geometry: new THREE.SphereGeometry(0.13, 10, 8), matrix: transform({ pos: [0, H + 0.1, 0] }) });
  parts.push({ geometry: cylinder(0.7, 0.8, 0.5, 12), matrix: transform({ pos: [0, 0.25, 0] }) });
  parts.push({ geometry: chamferBox(0.12, 0.3, 0.07, 0.02), matrix: transform({ pos: [0.16, 1.5, 0] }) });
  const pole = new THREE.Mesh(mergeParts(parts), mats.galv);
  pole.castShadow = true;
  g.add(pole);
  parts.forEach((p) => p.geometry.dispose());

  // Cloth is deformed per frame rather than baked, so the fly end ripples and
  // the hoist stays pinned to the pole.
  const flagGeo = new THREE.PlaneGeometry(2.6, 1.6, 14, 5);
  const flagRest = flagGeo.attributes.position.array.slice();
  const flagPivot = new THREE.Group();
  flagPivot.position.set(0, H - 1.1, 0);
  flagPivot.rotation.y = 0.3;
  g.add(flagPivot);
  const flag = new THREE.Mesh(
    flagGeo,
    std({ map: unitFlagTexture(256, 160), color: 0xffffff, roughness: 0.95, metalness: 0, envMapIntensity: 0.3, side: THREE.DoubleSide })
  );
  flag.position.set(1.42, 0, 0);
  flag.castShadow = true;
  flagPivot.add(flag);
  g.userData.flag = flagPivot;
  g.userData.flutter = (t) => {
    const p = flagGeo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = flagRest[i * 3];
      const y = flagRest[i * 3 + 1];
      // Amplitude grows toward the fly end; the wave runs along the cloth and
      // shears with height so the trailing corner curls.
      const s = (x + 1.3) / 2.6;
      const amp = s * s * 0.42;
      const phase = t * 3.4 - s * 5.6 + y * 0.9;
      p.setZ(i, Math.sin(phase) * amp + Math.sin(phase * 0.47 + 1.7) * amp * 0.4);
      p.setY(i, y - s * 0.14 + Math.cos(phase) * amp * 0.16);
      p.setX(i, x - s * amp * amp * 0.5);
    }
    p.needsUpdate = true;
    flagGeo.computeVertexNormals();
  };
  g.userData.flutter(0);

  const halyard = new THREE.Mesh(
    pathTube([new THREE.Vector3(0.1, H - 0.1, 0), new THREE.Vector3(0.14, H * 0.6, 0.02), new THREE.Vector3(0.17, 1.6, 0)], 0.012, 4),
    std({ color: 0xd8d2c0, roughness: 1 })
  );
  g.add(halyard);

  g.userData.colliders = [{ type: 'cyl', pos: [0, 1.2, 0], r: 0.8, hh: 1.2, walkable: false }];
  return g;
}

function buildMarkerBoard() {
  const g = new THREE.Group();
  g.name = 'marker';
  const mats = materials();
  const parts = [];
  for (const s of [-1, 1]) {
    parts.push({ geometry: cylinder(0.11, 0.11, 3.6, 8), matrix: transform({ pos: [s * 2.4, 1.8, 0] }) });
    parts.push({ geometry: cylinder(0.14, 0.18, 0.4, 8), matrix: transform({ pos: [s * 2.4, 0.2, 0] }) });
  }
  parts.push({ geometry: chamferBox(5.6, 2.5, 0.12, 0.04), matrix: transform({ pos: [0, 2.35, 0.1] }) });
  parts.push({ geometry: chamferBox(5.6, 0.1, 0.3, 0.02), matrix: transform({ pos: [0, 3.55, 0.2] }) });
  const frame = new THREE.Mesh(mergeParts(parts), mats.galv);
  frame.castShadow = true;
  frame.receiveShadow = true;
  g.add(frame);
  parts.forEach((p) => p.geometry.dispose());

  const face = new THREE.Mesh(
    new THREE.PlaneGeometry(5.3, 2.25),
    std({
      map: signBoardTexture(640, 272, {
        lines: ['AEGIS RIDGE', 'INTERCEPTOR TEST SITE', 'CONTROLLED AREA — REPORT AT GATE'],
        bg: '#c1b69a',
        accent: '#2c4152',
        font: 'bold 52px "Arial Narrow", Impact, sans-serif',
        wear: 0.4,
      }),
      color: 0xffffff,
      roughness: 0.93,
      metalness: 0,
      envMapIntensity: 0.3,
    })
  );
  face.position.set(0, 2.35, 0.17);
  face.castShadow = true;
  g.add(face);

  g.userData.colliders = [
    { type: 'cyl', pos: [-2.4, 1.8, 0], r: 0.22, hh: 1.8, walkable: false },
    { type: 'cyl', pos: [2.4, 1.8, 0], r: 0.22, hh: 1.8, walkable: false },
  ];
  return g;
}

/** Ground cable tray with removable covers and the cables inside it. */
function buildCableTray(points, { covered = 0.55, rng = null } = {}) {
  const mats = materials();
  const parts = [];
  const cableParts = [];
  const up = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    const len = a.distanceTo(b);
    const mid = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5);
    const yaw = Math.atan2(b.x - a.x, b.z - a.z);
    parts.push({ geometry: chamferBox(0.62, 0.055, len, 0.015), matrix: transform({ pos: [mid.x, 0.09, mid.z], rot: [0, yaw, 0] }) });
    for (const s of [-1, 1]) {
      parts.push({
        geometry: chamferBox(0.055, 0.22, len, 0.015),
        matrix: transform({ pos: [mid.x + Math.cos(yaw) * s * 0.3, 0.14, mid.z - Math.sin(yaw) * s * 0.3], rot: [0, yaw, 0] }),
      });
    }
    // covers over part of the run
    const nCov = Math.max(1, Math.floor(len / 1.2));
    for (let k = 0; k < nCov; k++) {
      const t = (k + 0.5) / nCov;
      if ((rng ? rng.next() : 0.5) > covered) continue;
      const p = new THREE.Vector3().lerpVectors(a, b, t);
      parts.push({ geometry: chamferBox(0.68, 0.05, 1.1, 0.012), matrix: transform({ pos: [p.x, 0.245, p.z], rot: [0, yaw, 0] }) });
    }
  }
  const tray = new THREE.Mesh(mergeParts(parts), mats.galv);
  tray.castShadow = true;
  tray.receiveShadow = true;
  parts.forEach((p) => p.geometry.dispose());

  const inner = points.map((p) => new THREE.Vector3(p.x, 0.14, p.z));
  for (let k = 0; k < 3; k++) {
    cableParts.push({ geometry: pathTube(inner.map((p) => p.clone().add(new THREE.Vector3(0, k * 0.03, (k - 1) * 0.16))), 0.05, 5) });
  }
  const cables = new THREE.Mesh(mergeParts(cableParts), std({ color: 0x1b1b1d, roughness: 0.88, metalness: 0.08 }));
  cableParts.forEach((p) => p.geometry.dispose());

  const g = new THREE.Group();
  g.add(tray);
  g.add(cables);
  return g;
}

/** Antenna farm: masts of assorted heights, guyed, plus an equipment cabin. */
function buildAntennaFarm(rng) {
  const g = new THREE.Group();
  g.name = 'antennaFarm';
  const mats = materials();

  const mastParts = [];
  const wireParts = [];
  const beaconPos = [];
  const specs = [
    { pos: [0, 0], h: 21, w: 0.62, dipoles: 6 },
    { pos: [-14, 9], h: 15, w: 0.5, dipoles: 4 },
    { pos: [11, 13], h: 27, w: 0.7, dipoles: 7 },
    { pos: [-6, 24], h: 12, w: 0.44, dipoles: 3 },
  ];
  const colliders = [];
  for (const s of specs) {
    const segH = 3;
    const n = Math.round(s.h / segH);
    const seg = trussSegment(s.w, segH, 0.036);
    for (let i = 0; i < n; i++) {
      mastParts.push({ geometry: seg, matrix: transform({ pos: [s.pos[0], i * segH, s.pos[1]] }) });
    }
    seg.dispose();
    mastParts.push({ geometry: chamferBox(s.w * 2.6, 0.28, s.w * 2.6, 0.05), matrix: transform({ pos: [s.pos[0], 0.14, s.pos[1]] }) });
    const dip = cylinder(0.02, 0.02, 1.5, 5);
    for (let i = 0; i < s.dipoles; i++) {
      mastParts.push({
        geometry: dip,
        matrix: transform({ pos: [s.pos[0], s.h - 1.4 - i * 1.05, s.pos[1]], rot: [0, i * 0.72, Math.PI / 2] }),
      });
    }
    dip.dispose();
    mastParts.push({ geometry: cylinder(0.035, 0.01, 2.4, 6), matrix: transform({ pos: [s.pos[0], s.h + 1.2, s.pos[1]] }) });
    // guys at two levels
    for (const level of [0.55, 0.9]) {
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2 + (level > 0.7 ? 0.5 : 0.1);
        const anchor = new THREE.Vector3(s.pos[0] + Math.cos(a) * s.h * 0.52, 0.1, s.pos[1] + Math.sin(a) * s.h * 0.52);
        wireParts.push({
          geometry: cableGeometry(new THREE.Vector3(s.pos[0], s.h * level, s.pos[1]), anchor, 0.3 * level, 0.013, 8, 4),
        });
        if (level < 0.7) {
          wireParts.push({ geometry: cylinder(0.055, 0.055, 0.6, 5), matrix: transform({ pos: [anchor.x, 0.3, anchor.z] }) });
        }
      }
    }
    beaconPos.push([s.pos[0], s.h + 2.5, s.pos[1]]);
    colliders.push({ type: 'cyl', pos: [s.pos[0], s.h / 2, s.pos[1]], r: s.w * 0.9, hh: s.h / 2, walkable: false });
  }
  const masts = new THREE.Mesh(mergeParts(mastParts), mats.galv);
  masts.castShadow = true;
  g.add(masts);
  mastParts.forEach((p) => p.geometry.dispose());
  const wires = new THREE.Mesh(mergeParts(wireParts), std({ color: 0x2b2b2b, roughness: 0.85, metalness: 0.25 }));
  g.add(wires);
  wireParts.forEach((p) => p.geometry.dispose());

  // Link dishes on the two tallest masts.
  const dishParts = [];
  for (const [dx, dy, dz, ry] of [[0, 13.5, 0, 0.6], [11, 18.5, 13, -1.4]]) {
    const d = new THREE.SphereGeometry(1.15, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.34);
    dishParts.push({ geometry: d, matrix: transform({ pos: [dx + Math.sin(ry) * 1.0, dy, dz + Math.cos(ry) * 1.0], rot: [Math.PI * 0.58, ry, 0] }) });
    d.dispose();
    dishParts.push({ geometry: cylinder(0.05, 0.05, 1.1, 6), matrix: transform({ pos: [dx + Math.sin(ry) * 0.5, dy, dz + Math.cos(ry) * 0.5], rot: [Math.PI / 2 - 0.1, ry, 0] }) });
  }
  const dishes = new THREE.Mesh(mergeParts(dishParts), mats.galv);
  dishes.castShadow = true;
  g.add(dishes);
  dishParts.forEach((p) => p.geometry.dispose());

  const beaconGeo = new THREE.SphereGeometry(0.13, 8, 6);
  const beaconMat = lamp(0xff3524, 2);
  const beacons = new THREE.InstancedMesh(beaconGeo, beaconMat, beaconPos.length);
  const bm = new THREE.Matrix4();
  beaconPos.forEach((p, i) => {
    bm.makeTranslation(p[0], p[1], p[2]);
    beacons.setMatrixAt(i, bm);
  });
  beacons.instanceMatrix.needsUpdate = true;
  g.add(beacons);
  g.userData.beacon = beacons;

  // Equipment cabin at the foot of the group.
  const cabinParts = [];
  cabinParts.push({ geometry: chamferBox(5.4, 2.6, 3.2, 0.07), matrix: transform({ pos: [5.5, 1.55, -5.0] }) });
  cabinParts.push({ geometry: chamferBox(6.0, 0.22, 3.8, 0.05), matrix: transform({ pos: [5.5, 2.96, -5.0] }) });
  cabinParts.push({ geometry: chamferBox(6.2, 0.4, 4.0, 0.06), matrix: transform({ pos: [5.5, 0.2, -5.0] }) });
  cabinParts.push({ geometry: greebleField(2.4, 1.6, rng, { count: 10, maxSize: 0.3, depth: 0.08 }), matrix: transform({ pos: [5.5, 1.6, -3.42] }) });
  cabinParts.push({ geometry: chamferBox(1.2, 0.8, 0.9, 0.05), matrix: transform({ pos: [8.0, 1.6, -3.6] }) });
  const cabin = new THREE.Mesh(mergeParts(cabinParts), mats.oliveMetal);
  cabin.castShadow = true;
  cabin.receiveShadow = true;
  g.add(cabin);
  cabinParts.forEach((p) => p.geometry.dispose());
  colliders.push({ type: 'box', pos: [5.5, 1.5, -5.0], half: [3.0, 1.5, 2.0], walkable: false });

  g.add(buildCableTray([new THREE.Vector3(4.4, 0, -3.4), new THREE.Vector3(2.2, 0, -1.4), new THREE.Vector3(0.6, 0, -0.4)], { rng }));

  g.userData.colliders = colliders;
  return g;
}

/** Wedge-shaped sand drifts banked against a wall run. */
function driftGeometry(from, to, height, side, rng) {
  const a = new THREE.Vector3(from[0], 0, from[1]);
  const b = new THREE.Vector3(to[0], 0, to[1]);
  const len = a.distanceTo(b);
  const n = Math.max(3, Math.round(len / 3));
  const tan = new THREE.Vector3().subVectors(b, a).normalize();
  const nrm = new THREE.Vector3().crossVectors(tan, new THREE.Vector3(0, 1, 0)).multiplyScalar(side);
  const inner = [];
  const outer = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const p = a.clone().lerp(b, t);
    const bump = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(t * Math.PI * 2.6 + rng.range(0, 1)));
    const h = height * bump;
    inner.push(new THREE.Vector3(p.x + nrm.x * 0.15, terrainHeight(p.x, p.z) + h, p.z + nrm.z * 0.15));
    const w = 1.4 + h * 3.4;
    const op = p.clone().addScaledVector(nrm, w);
    outer.push(new THREE.Vector3(op.x, terrainHeight(op.x, op.z) - 0.02, op.z));
  }
  const pos = [];
  const uv = [];
  const idx = [];
  for (let i = 0; i <= n; i++) {
    pos.push(inner[i].x, inner[i].y, inner[i].z, outer[i].x, outer[i].y, outer[i].z);
    uv.push(0, (i * len) / n / 6, 1, (i * len) / n / 6);
    if (i < n) {
      const k = i * 2;
      idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(side > 0 ? idx : idx.slice().reverse());
  geo.computeVertexNormals();
  return geo;
}

/* ------------------------------------------------------------ searchlights */

class Searchlight {
  constructor(pos, mats) {
    this.group = new THREE.Group();
    this.group.position.copy(pos);
    const parts = [];
    parts.push({ geometry: cylinder(0.22, 0.28, 1.6, 10), matrix: transform({ pos: [0, 0.8, 0] }) });
    parts.push({ geometry: chamferBox(1.2, 0.2, 1.2, 0.04), matrix: transform({ pos: [0, 0.08, 0] }) });
    const stand = new THREE.Mesh(mergeParts(parts), mats.darkMetal);
    stand.castShadow = true;
    this.group.add(stand);
    parts.forEach((p) => p.geometry.dispose());

    this.yawNode = new THREE.Group();
    this.yawNode.position.y = 1.65;
    this.group.add(this.yawNode);
    this.pitchNode = new THREE.Group();
    this.yawNode.add(this.pitchNode);

    const drum = new THREE.Mesh(cylinder(0.62, 0.62, 0.8, 18), mats.darkMetal);
    drum.rotation.x = Math.PI / 2;
    drum.castShadow = true;
    this.pitchNode.add(drum);
    const lens = new THREE.Mesh(new THREE.CircleGeometry(0.6, 20), lamp(0xf4f8ff, 0));
    lens.position.z = 0.42;
    this.pitchNode.add(lens);
    this.lens = lens;

    // volumetric beam cone
    const h = 900;
    const cone = new THREE.CylinderGeometry(0.6, 46, h, 22, 1, true);
    cone.translate(0, h / 2, 0);
    cone.rotateX(Math.PI / 2);
    this.beamMat = new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color(0xdce8ff) },
        uIntensity: { value: 0 },
        uTime: { value: 0 },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv; varying vec3 vPos;
        void main(){ vUv = uv; vPos = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }
      `,
      fragmentShader: /* glsl */ `
        varying vec2 vUv; varying vec3 vPos;
        uniform vec3 uColor; uniform float uIntensity; uniform float uTime;
        void main(){
          float along = clamp(vUv.y, 0.0, 1.0);
          float fade = pow(1.0 - along, 1.7);
          float edge = pow(sin(vUv.x * 3.14159), 0.6);
          float flick = 0.92 + 0.08 * sin(uTime * 11.0);
          gl_FragColor = vec4(uColor, fade * edge * uIntensity * 0.16 * flick);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      toneMapped: false,
    });
    this.beam = new THREE.Mesh(cone, this.beamMat);
    this.beam.frustumCulled = false;
    this.pitchNode.add(this.beam);

    this.light = new THREE.SpotLight(0xdce8ff, 0, 260, 0.16, 0.55, 1.2);
    this.light.position.set(0, 0, 0);
    this.pitchNode.add(this.light);
    this.light.target.position.set(0, 0, 200);
    this.pitchNode.add(this.light.target);

    this.phase = Math.random() * 10;
    this.enabled = false;
    this.intensity = 0;
    this.group.userData.colliders = [{ type: 'cyl', pos: [0, 1.0, 0], r: 0.6, hh: 1.0, walkable: false }];
  }

  setEnabled(on) {
    this.enabled = on;
  }

  update(dt, t, target) {
    this.intensity += ((this.enabled ? 1 : 0) - this.intensity) * Math.min(1, dt * 3);
    this.beamMat.uniforms.uIntensity.value = this.intensity;
    this.beamMat.uniforms.uTime.value = t;
    this.lens.material.emissiveIntensity = this.intensity * 5;
    this.light.intensity = this.intensity * 900;
    if (this.intensity < 0.01) {
      this.beam.visible = false;
      return;
    }
    this.beam.visible = true;
    if (target) {
      const local = this.yawNode.worldToLocal(target.clone());
      const yawTarget = Math.atan2(local.x, local.z) + this.yawNode.rotation.y;
      this.yawNode.rotation.y += (yawTarget - this.yawNode.rotation.y) * Math.min(1, dt * 1.4);
      const flat = Math.hypot(local.x, local.z);
      const pitchTarget = Math.atan2(local.y, flat);
      this.pitchNode.rotation.x += (pitchTarget - this.pitchNode.rotation.x) * Math.min(1, dt * 1.4);
    } else {
      this.yawNode.rotation.y = Math.sin(t * 0.22 + this.phase) * 1.5 + this.phase;
      this.pitchNode.rotation.x = 0.6 + Math.sin(t * 0.33 + this.phase * 2) * 0.34;
    }
  }
}

/* ------------------------------------------------------------------ Base */

export class Base {
  constructor(scene, quality, seed = 1) {
    this.scene = scene;
    this.quality = quality;
    this.rng = new RNG(`base:${seed}`);
    this.group = new THREE.Group();
    this.group.name = 'base';
    scene.add(this.group);
    this.spinners = [];
    this.beacons = [];
    this.searchlights = [];
    this.floodLamps = [];
    this.floodLights = [];
    this.time = 0;
    this.consoleAnchor = new THREE.Vector3(0, 0, 0);
    this.build();
  }

  build() {
    const rng = this.rng;
    const mats = materials();
    const g = this.group;

    const site = siteMaterials();

    g.add(buildTerrain(this.quality));
    g.add(buildPad(rng.fork('pad')));

    // ---- pad markings ------------------------------------------------
    const marks = padMarkingsDecal(1024);
    for (const [x, z, s] of [
      [-64, 3, 34],
      [64, -12, 34],
      [4, -96, 40],
    ]) {
      const d = decalPlane(marks, [s, s]);
      d.position.set(x, 0.078, z);
      g.add(d);
    }

    // ---- helipad ------------------------------------------------------
    const heli = new THREE.Group();
    heli.position.set(-42, 0, 138);
    const heliSlab = new THREE.Mesh(discGeometry(15, 16, { cell: 3, sectors: 48, uvOffset: [-42 / 16, 138 / 16] }), site.pourLate);
    heliSlab.position.y = 0.062;
    heliSlab.receiveShadow = true;
    heli.add(heliSlab);
    const heliMark = decalPlane(helipadDecal(512, 'H'), [26, 26]);
    heliMark.position.y = 0.082;
    heli.add(heliMark);
    const padLight = new THREE.InstancedMesh(cylinder(0.11, 0.13, 0.22, 8), lamp(0xf2f6ff, 0.8), 10);
    {
      const m = new THREE.Matrix4();
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2 + 0.2;
        m.makeTranslation(Math.cos(a) * 14.2, 0.16, Math.sin(a) * 14.2);
        padLight.setMatrixAt(i, m);
      }
      padLight.instanceMatrix.needsUpdate = true;
    }
    heli.add(padLight);
    this.floodLamps.push(padLight);
    g.add(heli);

    // ---- roads, tracks and ground wear ---------------------------------
    g.add(buildRoads(rng.fork('roads')));
    g.add(buildTyreTracks(rng.fork('tracks')));
    g.add(buildGroundStains(rng.fork('stains'), [[104, 74], [-150, -46], [-24, 96], [-52, 100], [60, 92], [-42, 138]]));

    // ---- shelter -----------------------------------------------------
    const shelter = buildShelter(rng);
    shelter.position.set(28, 0.05, 58);
    shelter.rotation.y = -0.42;
    g.add(shelter);
    this.shelter = shelter;
    // Console sits just inside the open front; the operator stands behind it and
    // looks out through the opening, so the sky stays in view while working.
    this.consoleAnchor = new THREE.Vector3(0, 0.44, -2.2).applyEuler(shelter.rotation).add(shelter.position);
    this.consoleYaw = shelter.rotation.y;
    if (shelter.userData.beacon) this.beacons.push(shelter.userData.beacon);
    if (shelter.userData.extLamps) this.floodLamps.push(...shelter.userData.extLamps);

    // ---- radar -------------------------------------------------------
    const radar = buildRadarSite(rng);
    radar.position.set(-26, 0.05, -58);
    radar.rotation.y = 0.35;
    g.add(radar);
    this.radarSite = radar;
    this.spinners.push({ node: radar.userData.turntable, rate: 0 });
    this.spinners.push({ node: radar.userData.dishSpin, rate: 1.15 });
    this.beacons.push(radar.userData.beacon);

    // cable run radar -> shelter
    const cableMat = std({ color: 0x1b1b1d, roughness: 0.85, metalness: 0.1 });
    const cablePts = [
      new THREE.Vector3(-26, 0.9, -58).add(new THREE.Vector3(-3.6, 0, -1)),
      new THREE.Vector3(-14, 0.12, -30),
      new THREE.Vector3(2, 0.12, 10),
      new THREE.Vector3(18, 0.12, 44),
      new THREE.Vector3(26, 0.5, 54),
    ];
    for (let k = 0; k < 3; k++) {
      const pts = cablePts.map((p, i) => p.clone().add(new THREE.Vector3(k * 0.14, 0.02 * k, k * 0.1)));
      const c = new THREE.Mesh(pathTube(pts, 0.045, 5), cableMat);
      c.castShadow = true;
      g.add(c);
    }

    // ---- generators, trucks, masts -----------------------------------
    const genPositions = [
      [42, 0.05, 74, 0.3],
      [50, 0.05, 62, 0.3],
      [-46, 0.05, 70, -1.1],
    ];
    const genSlabParts = [];
    for (const [x, y, z, yaw] of genPositions) {
      const gen = buildGenerator(rng);
      gen.position.set(x, y, z);
      gen.rotation.y = yaw;
      g.add(gen);
      this.spinners.push(...gen.children.filter((c) => c.userData.spin).map((n) => ({ node: n, rate: n.userData.spin, axis: 'z' })));
      genSlabParts.push({ geometry: slabGeometry(x, z, 6.4, 4.6, yaw, 12, 0.5) });
    }
    const genSlabs = new THREE.Mesh(mergeParts(genSlabParts), site.pourLate);
    genSlabs.position.y = 0.062;
    genSlabs.receiveShadow = true;
    g.add(genSlabs);
    genSlabParts.forEach((p) => p.geometry.dispose());

    // Power distribution from the generator group back to the shelter.
    g.add(
      buildCableTray(
        [
          new THREE.Vector3(50, 0, 60),
          new THREE.Vector3(44, 0, 68),
          new THREE.Vector3(40, 0, 72),
          new THREE.Vector3(36, 0, 68),
          new THREE.Vector3(33, 0, 62),
        ],
        { rng: rng.fork('tray1'), covered: 0.6 }
      )
    );
    g.add(
      buildCableTray(
        [new THREE.Vector3(-44, 0, 68), new THREE.Vector3(-30, 0, 62), new THREE.Vector3(-8, 0, 58), new THREE.Vector3(14, 0, 58)],
        { rng: rng.fork('tray2'), covered: 0.45 }
      )
    );
    // shelter roof fan
    for (const child of shelter.children) {
      if (child.userData.spin) this.spinners.push({ node: child, rate: child.userData.spin, axis: 'z' });
    }

    const truckSpots = [
      [96, 0.05, 44, -1.5, 0],
      [96, 0.05, 26, -1.5, 1],
      [-96, 0.05, 52, 1.4, 2],
      [8, 0.05, 118, 0.1, 0],
    ];
    for (const [x, y, z, yaw, variant] of truckSpots) {
      const t = buildTruck(rng, variant);
      t.position.set(x, terrainHeight(x, z) + y, z);
      t.rotation.y = yaw;
      g.add(t);
      this.floodLamps.push(...(t.userData.headlights || []));
    }

    for (const [x, z, h] of [
      [-104, -16, 14],
      [104, -60, 11],
    ]) {
      const m = buildAntennaMast(rng, h);
      m.position.set(x, terrainHeight(x, z) + 0.05, z);
      g.add(m);
      this.beacons.push(m.userData.beacon);
    }

    // ---- floodlight masts --------------------------------------------
    const floodSpots = [
      [-120, 96],
      [120, 96],
      [-130, -70],
      [128, -96],
      [0, 150],
    ];
    for (const [x, z] of floodSpots) {
      const fm = buildFloodMast(9);
      fm.position.set(x, terrainHeight(x, z) + 0.05, z);
      fm.lookAt(0, 6, 0);
      fm.rotation.x = 0;
      fm.rotation.z = 0;
      g.add(fm);
      this.floodLamps.push(...fm.userData.lamps);
      const sl = new THREE.SpotLight(0xfff0d2, 0, 200, 0.72, 0.6, 1.4);
      sl.position.set(x, terrainHeight(x, z) + 8.8, z);
      sl.target.position.set(x * 0.25, 0, z * 0.25);
      g.add(sl);
      g.add(sl.target);
      this.floodLights.push(sl);
    }

    // ---- barriers ----------------------------------------------------
    const barriers = buildBarrierRun(72, 2, mats);
    const m4 = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const sc = new THREE.Vector3(1, 1, 1);
    let bi = 0;
    const runs = [
      { from: [-88, 96], to: [-20, 96] },
      { from: [22, 100], to: [88, 100] },
      { from: [-104, -96], to: [-104, -34] },
      { from: [100, -108], to: [100, -46] },
    ];
    for (const run of runs) {
      const a = new THREE.Vector3(run.from[0], 0, run.from[1]);
      const b = new THREE.Vector3(run.to[0], 0, run.to[1]);
      const len = a.distanceTo(b);
      const n = Math.floor(len / 2);
      const yaw = Math.atan2(b.x - a.x, b.z - a.z);
      for (let i = 0; i < n && bi < 72; i++) {
        const p = a.clone().lerp(b, (i + 0.5) / n);
        p.y = terrainHeight(p.x, p.z);
        q.setFromEuler(new THREE.Euler(0, yaw, 0));
        m4.compose(p, q, sc);
        barriers.setMatrixAt(bi++, m4);
      }
    }
    for (; bi < 72; bi++) {
      m4.makeTranslation(0, -50, 0);
      barriers.setMatrixAt(bi, m4);
    }
    barriers.instanceMatrix.needsUpdate = true;
    g.add(barriers);
    this.barrierRuns = runs;

    // ---- equipment cases & clutter -----------------------------------
    const caseGeo = buildCase(rng);
    const cases = new THREE.InstancedMesh(caseGeo, mats.darkMetal, 46);
    const clusters = [
      [30, 70],
      [-58, 34],
      [62, -22],
      [8, -80],
      [44, 84],
    ];
    for (let i = 0; i < 46; i++) {
      const cluster = clusters[i % clusters.length];
      // Small tidy stacks that actually sit on the deck.
      const stack = i % 3;
      const gx = cluster[0] + Math.floor(i / clusters.length / 3) * 1.25 + rng.range(-0.1, 0.1);
      const gz = cluster[1] + (i % 2) * 0.85 + rng.range(-0.1, 0.1);
      const base = Math.max(0.05, terrainHeight(gx, gz));
      q.setFromEuler(new THREE.Euler(0, rng.range(-0.12, 0.12) + (cluster[0] > 0 ? 0.4 : -0.9), 0));
      m4.compose(new THREE.Vector3(gx, base + 0.3 + stack * 0.57, gz), q, sc);
      cases.setMatrixAt(i, m4);
    }
    cases.instanceMatrix.needsUpdate = true;
    cases.castShadow = true;
    cases.receiveShadow = true;
    g.add(cases);

    // ---- revetments ---------------------------------------------------
    // A broken sandbag ring round every emplacement: chest-high walls down the
    // two long flanks and a lower return across each end, with a gap left in
    // the middle of all four runs. The gap on the flank facing the pad is the
    // lane crews walk in on; the end gaps are wide enough to drive a launcher
    // through. Every run is sized from the hardstand it belongs to and the
    // instance budget is counted from that, because one shared cap spent the
    // whole allowance on the first emplacement and left the others bare.
    const bagGeo = new THREE.SphereGeometry(0.3, 6, 4);
    bagGeo.scale(1.46, 0.6, 0.94);
    const BAG_PITCH = 0.52;
    const bagRng = rng.fork('bags');
    const revetments = [];
    for (const hs of HARDSTANDS) {
      const long = hs.size[1] > hs.size[0];
      const half = long ? hs.size[0] / 2 : hs.size[1] / 2;
      const runAxis = long ? hs.size[1] / 2 : hs.size[0] / 2;
      const dirYaw = long ? hs.yaw : hs.yaw + Math.PI / 2;
      const along = new THREE.Vector3(Math.sin(dirYaw), 0, Math.cos(dirYaw));
      const out = new THREE.Vector3(Math.cos(dirYaw), 0, -Math.sin(dirYaw));
      for (const s of [-1, 1]) {
        for (const seg of [-1, 1]) {
          // Flank run: half the flank each side of a central walk-in gap.
          revetments.push({
            cx: hs.pos[0] + out.x * s * (half + 1.6) + along.x * seg * runAxis * 0.56,
            cz: hs.pos[1] + out.z * s * (half + 1.6) + along.z * seg * runAxis * 0.56,
            dir: along,
            yaw: dirYaw,
            len: runAxis * 0.4,
            courses: 5,
          });
          // End return: kept low so it does not fence in the drive-through.
          revetments.push({
            cx: hs.pos[0] + along.x * s * (runAxis + 1.6) + out.x * seg * half * 0.6,
            cz: hs.pos[1] + along.z * s * (runAxis + 1.6) + out.z * seg * half * 0.6,
            dir: out,
            yaw: dirYaw + Math.PI / 2,
            len: half * 0.36,
            courses: 3,
          });
        }
      }
    }
    const rowCount = (rev, row) => Math.max(2, Math.floor((rev.len * 2 * (1 - row * 0.05)) / BAG_PITCH));
    let bagTotal = 0;
    for (const rev of revetments) for (let row = 0; row < rev.courses; row++) bagTotal += rowCount(rev, row);
    const bags = new THREE.InstancedMesh(bagGeo, site.burlap, bagTotal);
    let bg = 0;
    for (const rev of revetments) {
      for (let row = 0; row < rev.courses; row++) {
        const rowLen = rev.len * (1 - row * 0.05);
        const n = rowCount(rev, row);
        for (let i = 0; i < n; i++) {
          const t = (i / (n - 1) - 0.5) * rowLen * 2 + (row % 2 ? 0.16 : 0);
          const y = 0.1 + row * 0.17 + bagRng.range(-0.015, 0.015);
          q.setFromEuler(
            new THREE.Euler(bagRng.range(-0.05, 0.05), rev.yaw + Math.PI / 2 + bagRng.range(-0.09, 0.09), bagRng.range(-0.05, 0.05))
          );
          m4.compose(new THREE.Vector3(rev.cx + rev.dir.x * t, y, rev.cz + rev.dir.z * t), q, sc);
          bags.setMatrixAt(bg++, m4);
        }
      }
    }
    bags.count = bg;
    bags.instanceMatrix.needsUpdate = true;
    bags.castShadow = true;
    bags.receiveShadow = true;
    g.add(bags);
    this.revetments = revetments;

    // ---- support installations -----------------------------------------
    const install = (node, x, z, yaw = 0) => {
      node.position.set(x, Math.max(0.062, terrainHeight(x, z)), z);
      node.rotation.y = yaw;
      g.add(node);
      if (node.userData.extLamps) this.floodLamps.push(...node.userData.extLamps);
      return node;
    };

    // Unpaved hardcore compounds where the surfacing stops.
    const compoundParts = [];
    for (const [cx, cz, rad] of [[-150, -44, 34], [-150, 56, 32], [-30, 74, 13]]) {
      const geo = new THREE.CircleGeometry(rad, 30);
      const p = geo.attributes.position;
      const uv = geo.attributes.uv;
      for (let i = 0; i < p.count; i++) {
        const a = Math.atan2(p.getY(i), p.getX(i));
        const k = 1 + noise.fbm2(Math.cos(a) * 1.7, Math.sin(a) * 1.7, 3) * 0.12;
        p.setXY(i, p.getX(i) * k, p.getY(i) * k);
        uv.setXY(i, (cx + p.getX(i)) / GRAVEL_TILE, (cz + p.getY(i)) / GRAVEL_TILE);
      }
      geo.rotateX(-Math.PI / 2);
      geo.translate(cx, 0, cz);
      compoundParts.push({ geometry: geo });
    }
    const compounds = new THREE.Mesh(mergeParts(compoundParts), site.gravelDark);
    compounds.position.y = 0.066;
    compounds.receiveShadow = true;
    g.add(compounds);
    compoundParts.forEach((p) => p.geometry.dispose());

    install(buildFuelFarm(rng.fork('fuel')), 106, 72, -0.32);
    install(buildWaterTank(rng.fork('water')), 62, 96, 0.4);
    install(buildTent(rng.fork('tentA'), { length: 14, radius: 3.6 }), -26, 96, 0.28);
    install(buildTent(rng.fork('tentB'), { length: 10.5, radius: 3.0, tan: true }), -50, 102, -0.62);
    install(buildStoresYard(rng.fork('stores')), -30, 74, 0.5);
    // Doors face back toward the pad, so the reload route runs inward rather
    // than into the fence line.
    install(buildBunker(rng.fork('bunker')), -150, -44, -1.85);
    const flagpole = install(buildFlagpole(), 12, 74);
    this.flag = flagpole.userData.flag;
    this.flagFlutter = flagpole.userData.flutter;
    install(buildAntennaFarm(rng.fork('farm')), -152, 52, 0.3);

    // Cable run from the antenna farm back towards the shelter.
    g.add(
      buildCableTray(
        [new THREE.Vector3(-146, 0, 50), new THREE.Vector3(-120, 0, 44), new THREE.Vector3(-96, 0, 40)],
        { rng: rng.fork('tray3'), covered: 0.35 }
      )
    );

    // ---- perimeter: gate, guard post and warning signs -------------------
    // The approach road runs in along +X, so the gate line lies across Z.
    install(buildGate(rng), 204.8, 4, 0);
    install(buildGuardPost(rng.fork('guard')), 188, 16.4, Math.PI);
    install(buildBoomBarrier(13), 184.5, 14.6, Math.PI);
    install(buildMarkerBoard(), 219, 22, Math.PI / 2 - 0.34);
    const haltSign = signPost(
      signBoardTexture(384, 240, {
        lines: ['HALT', 'REPORT TO GUARD', 'AEGIS RIDGE'],
        bg: '#b23a20',
        fg: '#efe7d2',
        border: '#efe7d2',
        font: 'bold 48px "Arial Narrow", Impact, sans-serif',
      }),
      1.6,
      1.0,
      1.7
    );
    install(haltSign, 197, 16.5, Math.PI / 2 + 0.25);

    // Hazard plates hung on the mesh at irregular intervals.
    const fenceSignTex = signBoardTexture(256, 160, {
      lines: ['DANGER', 'RESTRICTED AREA', 'NO ENTRY'],
      bg: '#c6bb9f',
      accent: '#b23a20',
      font: 'bold 34px "Arial Narrow", Impact, sans-serif',
    });
    const fenceSign = new THREE.InstancedMesh(
      new THREE.PlaneGeometry(0.85, 0.55),
      std({ map: fenceSignTex, color: 0xffffff, roughness: 0.94, metalness: 0, envMapIntensity: 0.3, side: THREE.DoubleSide }),
      18
    );
    {
      const signRng = rng.fork('fenceSigns');
      let a = 0.15;
      for (let i = 0; i < 18; i++) {
        a += (Math.PI * 2) / 18 + signRng.range(-0.08, 0.08);
        const x = Math.cos(a) * (WORLD.fenceRadius - 0.08);
        const z = Math.sin(a) * (WORLD.fenceRadius - 0.08);
        q.setFromEuler(new THREE.Euler(0, -a + Math.PI / 2 + signRng.range(-0.04, 0.04), signRng.range(-0.05, 0.05)));
        m4.compose(new THREE.Vector3(x, terrainHeight(x, z) + 1.55, z), q, sc);
        fenceSign.setMatrixAt(i, m4);
      }
      fenceSign.instanceMatrix.needsUpdate = true;
    }
    g.add(fenceSign);

    // ---- wind-blown sand banked against the walls -----------------------
    const driftRng = rng.fork('drift');
    const driftParts = [];
    for (const run of runs) {
      driftParts.push({ geometry: driftGeometry(run.from, run.to, 0.62, 1, driftRng) });
      driftParts.push({ geometry: driftGeometry(run.from, run.to, 0.34, -1, driftRng) });
    }
    for (let i = 0; i < 10; i++) {
      const a0 = (i / 10) * Math.PI * 2 + driftRng.range(-0.1, 0.1);
      const a1 = a0 + driftRng.range(0.1, 0.22);
      const R = WORLD.fenceRadius;
      driftParts.push({
        geometry: driftGeometry(
          [Math.cos(a0) * R, Math.sin(a0) * R],
          [Math.cos(a1) * R, Math.sin(a1) * R],
          driftRng.range(0.3, 0.72),
          1,
          driftRng
        ),
      });
    }
    const drifts = new THREE.Mesh(mergeParts(driftParts), mats.sand);
    drifts.castShadow = true;
    drifts.receiveShadow = true;
    g.add(drifts);
    driftParts.forEach((p) => p.geometry.dispose());

    // ---- desert scatter ----------------------------------------------
    this.buildScatter();

    // ---- perimeter fence --------------------------------------------
    g.add(buildFence(WORLD.fenceRadius, mats));

    // ---- searchlights -----------------------------------------------
    for (const [x, z] of [
      [-86, 122],
      [86, 122],
      [-118, 24],
      [116, -20],
    ]) {
      const sl = new Searchlight(new THREE.Vector3(x, terrainHeight(x, z) + 0.05, z), mats);
      g.add(sl.group);
      this.searchlights.push(sl);
    }

    // ---- wind sock ---------------------------------------------------
    const sockPole = new THREE.Mesh(cylinder(0.07, 0.09, 6, 8), mats.galv);
    sockPole.position.set(-8, 3, 128);
    sockPole.castShadow = true;
    g.add(sockPole);
    const sock = new THREE.Mesh(
      new THREE.CylinderGeometry(0.45, 0.18, 2.2, 12, 1, true),
      std({ color: 0xff7a1e, roughness: 0.9, side: THREE.DoubleSide })
    );
    sock.position.set(-8, 5.7, 129.2);
    sock.rotation.x = Math.PI / 2;
    sock.rotation.z = 0.2;
    sock.castShadow = true;
    g.add(sock);
    this.windSock = sock;
  }

  buildScatter() {
    const rng = this.rng.fork('scatter');
    const mats = materials();
    const m4 = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const sc = new THREE.Vector3();

    // rocks
    const rockGeo = new THREE.IcosahedronGeometry(1, 1);
    const rp = rockGeo.attributes.position;
    for (let i = 0; i < rp.count; i++) {
      const n = noise.fbm3(rp.getX(i) * 1.6, rp.getY(i) * 1.6, rp.getZ(i) * 1.6, 3) * 0.34 + 1;
      rp.setXYZ(i, rp.getX(i) * n, rp.getY(i) * n * 0.7, rp.getZ(i) * n);
    }
    rockGeo.computeVertexNormals();
    const rockMat = std({ color: 0x8a8074, roughness: 0.96, metalness: 0.02, flatShading: true });
    // Scattered stones plus a handful of tight boulder fields, so the desert
    // reads as sorted ground rather than an even sprinkle.
    const rockCount = 760;
    const rocks = new THREE.InstancedMesh(rockGeo, rockMat, rockCount);
    const fields = [];
    for (let i = 0; i < 9; i++) {
      const a = rng.range(0, Math.PI * 2);
      const r = WORLD.baseRadius + 60 + Math.pow(rng.next(), 0.7) * 780;
      fields.push([Math.cos(a) * r, Math.sin(a) * r, rng.range(16, 46)]);
    }
    for (let i = 0; i < rockCount; i++) {
      let x;
      let z;
      let s;
      if (i % 5 < 2) {
        const f = fields[i % fields.length];
        const a = rng.range(0, Math.PI * 2);
        const rr = Math.pow(rng.next(), 0.7) * f[2];
        x = f[0] + Math.cos(a) * rr;
        z = f[1] + Math.sin(a) * rr;
        s = rng.range(0.5, 2.9);
      } else {
        const a = rng.range(0, Math.PI * 2);
        const r = WORLD.baseRadius + 12 + Math.pow(rng.next(), 0.6) * 900;
        x = Math.cos(a) * r;
        z = Math.sin(a) * r;
        s = rng.range(0.2, 1.5);
      }
      q.setFromEuler(new THREE.Euler(rng.range(0, 0.4), rng.range(0, Math.PI * 2), rng.range(0, 0.4)));
      sc.set(s, s * rng.range(0.5, 1.1), s);
      m4.compose(new THREE.Vector3(x, terrainHeight(x, z) + s * 0.15, z), q, sc);
      rocks.setMatrixAt(i, m4);
    }
    rocks.instanceMatrix.needsUpdate = true;
    rocks.castShadow = true;
    rocks.receiveShadow = true;
    this.group.add(rocks);

    // scrub bushes: crossed alpha cards
    const bladeGeo = new THREE.BufferGeometry();
    {
      const p = [];
      const u = [];
      const idx = [];
      const cards = 3;
      for (let c = 0; c < cards; c++) {
        const a = (c / cards) * Math.PI;
        const dx = Math.cos(a) * 0.55;
        const dz = Math.sin(a) * 0.55;
        const base = c * 4;
        p.push(-dx, 0, -dz, dx, 0, dz, dx, 1.0, dz, -dx, 1.0, -dz);
        u.push(0, 0, 1, 0, 1, 1, 0, 1);
        idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
      }
      bladeGeo.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
      bladeGeo.setAttribute('uv', new THREE.Float32BufferAttribute(u, 2));
      bladeGeo.setIndex(idx);
      bladeGeo.computeVertexNormals();
    }
    const bushTex = softSprite(64, { power: 1.1, colorInner: '150,150,110', colorOuter: '90,96,64' });
    const bushMat = applyAtmosphere(
      new THREE.MeshStandardMaterial({
        map: bushTex,
        alphaMap: bushTex,
        transparent: true,
        alphaTest: 0.32,
        side: THREE.DoubleSide,
        color: 0x8d8a5e,
        roughness: 1,
      })
    );
    // Scrub grows in clumps where runoff collects, not evenly.
    const bushCount = 1000;
    const bushes = new THREE.InstancedMesh(bladeGeo, bushMat, bushCount);
    const clumps = [];
    for (let i = 0; i < 34; i++) {
      const a = rng.range(0, Math.PI * 2);
      const r = WORLD.baseRadius + 26 + Math.pow(rng.next(), 0.6) * 900;
      clumps.push([Math.cos(a) * r, Math.sin(a) * r, rng.range(5, 22)]);
    }
    for (let i = 0; i < bushCount; i++) {
      let x;
      let z;
      if (i % 3 < 2) {
        const c = clumps[i % clumps.length];
        const a = rng.range(0, Math.PI * 2);
        const rr = Math.pow(rng.next(), 0.6) * c[2];
        x = c[0] + Math.cos(a) * rr;
        z = c[1] + Math.sin(a) * rr;
      } else {
        const a = rng.range(0, Math.PI * 2);
        const r = WORLD.baseRadius + 20 + Math.pow(rng.next(), 0.55) * 1100;
        x = Math.cos(a) * r;
        z = Math.sin(a) * r;
      }
      const s = rng.range(0.5, 1.7);
      q.setFromEuler(new THREE.Euler(0, rng.range(0, Math.PI * 2), 0));
      sc.set(s, s * rng.range(0.5, 1.0), s);
      m4.compose(new THREE.Vector3(x, terrainHeight(x, z), z), q, sc);
      bushes.setMatrixAt(i, m4);
    }
    bushes.instanceMatrix.needsUpdate = true;
    this.group.add(bushes);
  }

  registerColliders(world) {
    world.terrain = terrainHeight;
    world.addFromObject(this.group);
    // pad platform
    world.addCylinder(new THREE.Vector3(0, 0.025, 0), WORLD.baseRadius, 0.05, { walkable: true });
    // barrier runs
    for (const run of this.barrierRuns || []) {
      const a = new THREE.Vector3(run.from[0], 0, run.from[1]);
      const b = new THREE.Vector3(run.to[0], 0, run.to[1]);
      const mid = a.clone().lerp(b, 0.5);
      const len = a.distanceTo(b);
      const yaw = Math.atan2(b.x - a.x, b.z - a.z);
      world.addBox(new THREE.Vector3(mid.x, 0.48, mid.z), new THREE.Vector3(0.35, 0.48, len / 2), yaw, { walkable: false });
    }
    // sandbag revetment walls ringing each hardstand
    for (const rev of this.revetments || []) {
      const top = 0.28 + (rev.courses - 1) * 0.17;
      world.addBox(new THREE.Vector3(rev.cx, top / 2, rev.cz), new THREE.Vector3(0.55, top / 2, rev.len + 0.3), rev.yaw, {
        walkable: false,
      });
    }
    // perimeter fence
    const seg = 48;
    for (let i = 0; i < seg; i++) {
      const a0 = (i / seg) * Math.PI * 2;
      const a1 = ((i + 1) / seg) * Math.PI * 2;
      const p0 = new THREE.Vector3(Math.cos(a0) * WORLD.fenceRadius, 0, Math.sin(a0) * WORLD.fenceRadius);
      const p1 = new THREE.Vector3(Math.cos(a1) * WORLD.fenceRadius, 0, Math.sin(a1) * WORLD.fenceRadius);
      const mid = p0.clone().lerp(p1, 0.5);
      mid.y = terrainHeight(mid.x, mid.z) + 1.2;
      world.addBox(mid, new THREE.Vector3(0.16, 1.2, p0.distanceTo(p1) / 2), Math.atan2(p1.x - p0.x, p1.z - p0.z), { walkable: false });
    }
  }

  setTimeOfDay(id) {
    const night = id === 'night';
    const dusk = id === 'sunset';
    const on = night ? 1 : dusk ? 0.45 : 0;
    for (const l of this.floodLamps) {
      l.material.emissiveIntensity = on * 4.2;
    }
    for (const l of this.floodLights) {
      l.intensity = on * 420;
    }
    if (this.shelter.userData.interiorLight) {
      this.shelter.userData.interiorLight.intensity = night ? 7 : dusk ? 5 : 2.5;
    }
    this.beaconOn = night || dusk;
  }

  setSearchlights(on) {
    for (const s of this.searchlights) s.setEnabled(on);
  }

  update(dt, radarAngle, searchTarget) {
    this.time += dt;
    for (const s of this.spinners) {
      if (s.axis === 'z') s.node.rotation.z += s.rate * dt;
      else s.node.rotation.y += s.rate * dt;
    }
    if (this.radarSite) {
      this.radarSite.userData.turntable.rotation.y = radarAngle;
      const beacon = this.radarSite.userData.beacon;
      const blink = (Math.sin(this.time * 3.4) > 0.4 ? 1 : 0.05) * (this.beaconOn ? 1 : 0.25);
      beacon.material.emissiveIntensity = 2 + blink * 5;
    }
    for (const b of this.beacons) {
      if (!b) continue;
      b.material.emissiveIntensity = 1.5 + (Math.sin(this.time * 2.1) > 0.5 ? 5 : 0.2) * (this.beaconOn ? 1 : 0.3);
    }
    for (const s of this.searchlights) s.update(dt, this.time, searchTarget);
    if (this.windSock) this.windSock.rotation.z = 0.2 + Math.sin(this.time * 1.7) * 0.14;
    if (this.flag) this.flag.rotation.y = 0.3 + Math.sin(this.time * 0.85) * 0.16;
    if (this.flagFlutter) this.flagFlutter(this.time);
  }
}
