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
 * primitives. Almost all of the static site is merged into a single `Kit`, so
 * the whole thing - shelter, radar, vehicle park, perimeter, clutter - costs
 * roughly one draw call per distinct material rather than one per prop. Painted
 * markings and signage share a single canvas atlas and merge into one mesh.
 */

const terrainNoise = new Noise(0xa11ce);
const detailNoise = new Noise(0x51fe);

/** Site convention: north is -Z. Threats arrive from the north. */
export const NORTH = new THREE.Vector3(0, 0, -1);

/* ------------------------------------------------------------------ *
 * Terrain
 * ------------------------------------------------------------------ */

/**
 * Long-wavelength relief: the bajada, the foothills, the ranges and the mesas.
 *
 * Split out from `terrainHeight` because it is identically zero inside the
 * basin, and every gameplay query (player footfall, impact points, launcher
 * seating) happens on the pad where the cheap path is all that runs.
 */
function distantRelief(x, z, d) {
  const N = terrainNoise;

  // Warp the sampling domain so range fronts meander instead of following the
  // obvious grain of the noise.
  const wx = x + N.fbm2(x / 5200 + 3.1, z / 5200 - 8.4, 2) * 2100;
  const wz = z + N.fbm2(x / 5200 - 6.7, z / 5200 + 2.2, 2) * 2100;

  // Where there is high ground at all. Broad clusters, open desert between.
  const clusters = saturate(N.fbm2(wx / 12500 + 12, wz / 12500 - 7, 3) * 1.3 + 0.42);
  // Not every range is the same size: some are 500 m ridges, some 1500 m walls.
  const scale = 0.45 + saturate(N.fbm2(x / 23000 - 4, z / 23000 + 9, 2) * 1.6 + 0.5) * 1.05;

  // Bajada: the gravel apron every desert range sheds into the basin. This is
  // what makes the flat pad read as the floor of a bowl rather than a plate
  // with hills glued to the edge.
  const bajada =
    smoothstep(700, 4600, d) * clusters * (105 + N.fbm2(x / 2600, z / 2600, 2) * 70);

  // Foothills in front of the main ranges.
  const hills =
    smoothstep(1500, 3600, d) *
    clusters *
    scale *
    Math.pow(N.ridged2(wx / 2450 + 11, wz / 2450 - 5, 3, 2.1, 0.55), 2.1) *
    300;

  // The ranges themselves.
  const far = smoothstep(2500, 6000, d);
  const spine = Math.pow(N.ridged2(wx / 7600, wz / 7600, 4, 2.05, 0.52), 1.75);
  const shoulder = Math.pow(N.ridged2(wx / 2900 - 30, wz / 2900 + 18, 4), 2.4);
  const ranges = far * clusters * scale * (spine * 1350 + shoulder * 300 * saturate(spine * 2.2));

  // Mesas and buttes: flat caprock tables standing on the open basin floor.
  // Two hard steps in the mask give a bench part-way down the flank, which is
  // what stops them reading as extruded blobs.
  const table = N.fbm2(x / 3100 + 41, z / 3100 - 17, 3) * 0.5 + 0.5;
  const zone = smoothstep(1400, 2400, d) * (1 - smoothstep(6500, 9500, d)) * (1 - clusters * 0.7);
  const top = 42 + saturate(N.fbm2(x / 8000 - 2, z / 8000 + 5, 2) * 1.7 + 0.5) * 115;
  const bench = smoothstep(0.532, 0.572, table);
  const cap = smoothstep(0.582, 0.601, table);
  const mesas = zone * top * (bench * 0.34 + cap * 0.66);

  return bajada + hills + ranges + mesas;
}

/** Height of the natural desert floor at a world position. */
export function terrainHeight(x, z) {
  const d = Math.hypot(x, z);
  // The pad and its immediate surroundings are graded flat.
  const flat = smoothstep(150, 460, d);

  const rolling =
    terrainNoise.fbm2(x / 900, z / 900, 4) * 12 +
    terrainNoise.fbm2(x / 240, z / 240, 3) * 3.0 +
    terrainNoise.fbm2(x / 62, z / 62, 2) * 0.7;

  // A shallow playa so the base sits in a bowl ringed by high ground.
  const basin = -smoothstep(280, 2400, d) * 15;

  const near = rolling * flat + basin;
  if (d < 700) return near;
  return near + distantRelief(x, z, d);
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
 * Local textures and materials
 *
 * A deliberately small palette: the whole static site merges per material, so
 * every extra colour of paint is another draw call for the rest of the frame.
 * ------------------------------------------------------------------ */

const _texCache = new Map();
function localTexture(key, build) {
  if (!_texCache.has(key)) _texCache.set(key, build());
  return _texCache.get(key);
}

function canvas2d(w, h = w) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return { c, ctx: c.getContext('2d', { willReadFrequently: true }) };
}

/** Desert scrub / low bush cards. `kind` picks the silhouette. */
function scrubTexture(kind = 'grass') {
  return localTexture(`scrub|${kind}`, () => {
    const size = 128;
    const { c, ctx } = canvas2d(size);
    ctx.clearRect(0, 0, size, size);
    ctx.lineCap = 'round';
    const rng = new Rng(kind === 'grass' ? 91 : 137);
    if (kind === 'grass') {
      for (let i = 0; i < 96; i++) {
        const x0 = size * 0.5 + rng.spread(size * 0.13);
        const ang = -Math.PI / 2 + rng.spread(0.78);
        const len = size * (0.35 + rng.float() * 0.58);
        const g = 132 + rng.float() * 92;
        ctx.strokeStyle = `rgba(${g | 0},${(g * 0.92) | 0},${(g * 0.6) | 0},${0.55 + rng.float() * 0.45})`;
        ctx.lineWidth = 1 + rng.float() * 2;
        ctx.beginPath();
        ctx.moveTo(x0, size);
        ctx.quadraticCurveTo(
          x0 + Math.cos(ang) * len * 0.5 + rng.spread(10),
          size + Math.sin(ang) * len * 0.5,
          x0 + Math.cos(ang) * len,
          size + Math.sin(ang) * len
        );
        ctx.stroke();
      }
    } else {
      // A woody creosote-style bush: a dense dome of short forked twigs.
      for (let i = 0; i < 170; i++) {
        const a = rng.float() * Math.PI * 2;
        const r = Math.pow(rng.float(), 0.55) * size * 0.42;
        const x0 = size * 0.5 + Math.cos(a) * r * 0.95;
        const y0 = size - Math.abs(Math.sin(a)) * r * 0.9 - rng.float() * 6;
        const len = 4 + rng.float() * 13;
        const ang = -Math.PI / 2 + rng.spread(1.25);
        const g = 96 + rng.float() * 78;
        ctx.strokeStyle = `rgba(${g | 0},${(g * 0.97) | 0},${(g * 0.62) | 0},${0.5 + rng.float() * 0.5})`;
        ctx.lineWidth = 1 + rng.float() * 1.7;
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x0 + Math.cos(ang) * len, y0 + Math.sin(ang) * len);
        ctx.stroke();
      }
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  });
}

/** Garnished camouflage netting: a hex-ish weave with torn-out holes. */
function camoNetTexture() {
  return localTexture('camonet', () => {
    const size = 256;
    const { c, ctx } = canvas2d(size);
    ctx.clearRect(0, 0, size, size);
    const rng = new Rng(0x0ca7);
    // Garnish: overlapping irregular leaves in three desert tones.
    const tones = ['#8a8163', '#6d6a4e', '#a29570'];
    for (let i = 0; i < 1500; i++) {
      const x = rng.float() * size;
      const y = rng.float() * size;
      // A cell-noise style hole pattern keeps daylight coming through.
      const hole = detailNoise.fbm2(x / 22, y / 22, 3) * 0.5 + 0.5;
      if (hole > 0.56) continue;
      ctx.fillStyle = tones[rng.int(0, 2)];
      ctx.globalAlpha = 0.6 + rng.float() * 0.4;
      ctx.beginPath();
      ctx.ellipse(x, y, 2 + rng.float() * 6, 1 + rng.float() * 3, rng.float() * 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
  });
}

let _netMat = null;
function netMat() {
  if (!_netMat) {
    const map = camoNetTexture().clone();
    map.needsUpdate = true;
    map.wrapS = map.wrapT = THREE.RepeatWrapping;
    map.repeat.set(3, 3);
    _netMat = new THREE.MeshStandardMaterial({
      name: 'camonet',
      map,
      transparent: true,
      alphaTest: 0.3,
      side: THREE.DoubleSide,
      roughness: 1,
      metalness: 0
    });
  }
  return _netMat;
}

let PAL = null;
/** The site palette. One entry here is one draw call for the whole base. */
function palette() {
  if (PAL) return PAL;
  PAL = {
    wall: M.painted('#6b6f60', { repeat: 2.6, panels: 5 }),
    equip: M.painted('#5f6459', { repeat: 2.2 }),
    crate: M.painted('#4d5344', { repeat: 1.4, panels: 2 }),
    console: M.painted('#3d4139', { repeat: 1.6, panels: 3 }),
    pale: M.painted('#b9b8b0', { repeat: 1.2, panels: 2 }),
    rust: M.painted('#7c5a3f', { repeat: 1.6, panels: 2 }),
    signalRed: M.painted('#8d3b2c', { repeat: 1.1, panels: 1 }),
    dark: M.darkMetal(),
    steel: M.metal('#7c8079', 0.5, 0.85),
    bright: M.metal('#8d918a', 0.4, 0.9),
    chrome: M.chrome(),
    concrete: M.concreteMat(14),
    concreteFine: M.concreteMat(3),
    gravel: M.gravelMat(26),
    gravelCoarse: M.gravelMat(8),
    rubber: M.rubberMat(1.4),
    hose: M.hoseMat(),
    camoDesert: M.camoMat('desert', 1.1),
    camoOlive: M.camoMat('olive', 1.1),
    glass: M.glassMat('#14262a', 0.28),
    tarp: M.tarpMat('#5f5a49'),
    sandbag: M.tarpMat('#7c7156'),
    soft: M.tarpMat('#2c2f2b'),
    hazard: M.hazardMat(4),
    heat: M.heatMat('#3e3c38'),
    chain: M.chainLinkMat(1),
    net: netMat()
  };
  return PAL;
}

/** Obstruction beacons and walkway lamps: emissive only, no real light cost. */
function emissiveMat(name, color, intensity) {
  return new THREE.MeshStandardMaterial({
    name,
    color: '#141212',
    emissive: new THREE.Color(color),
    emissiveIntensity: intensity,
    roughness: 0.4,
    metalness: 0.1,
    toneMapped: false
  });
}

/* ------------------------------------------------------------------ *
 * Painted markings atlas
 *
 * One canvas holds every stencil, line, chevron and warning plate on the site.
 * Regions are painted once and then referenced by any number of quads, all of
 * which merge into a single mesh - so the entire paint scheme, ground and wall,
 * is one draw call.
 * ------------------------------------------------------------------ */

class MarkingAtlas {
  constructor(size = 2048) {
    this.size = size;
    const { c, ctx } = canvas2d(size);
    this.canvas = c;
    this.ctx = ctx;
    ctx.clearRect(0, 0, size, size);
    this.cx = 2;
    this.cy = 2;
    this.rowH = 0;
    this.parts = [];
    this.noise = new Noise(0x9a17);
  }

  /**
   * Reserve a pixel region and paint into it. The draw callback works in
   * region-local pixels; `wear` chews the alpha back with noise so nothing
   * looks like freshly plotted vector art.
   */
  paint(w, h, draw, { wear = 0.5 } = {}) {
    if (this.cx + w + 2 > this.size) {
      this.cx = 2;
      this.cy += this.rowH + 2;
      this.rowH = 0;
    }
    const r = { x: this.cx, y: this.cy, w, h };
    this.cx += w + 2;
    this.rowH = Math.max(this.rowH, h);

    const ctx = this.ctx;
    ctx.save();
    ctx.beginPath();
    ctx.rect(r.x, r.y, w, h);
    ctx.clip();
    ctx.translate(r.x, r.y);
    draw(ctx, w, h);
    ctx.restore();

    if (wear > 0) {
      const img = ctx.getImageData(r.x, r.y, w, h);
      const d = img.data;
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const i = (y * w + x) * 4;
          if (d[i + 3] === 0) continue;
          const n = this.noise.fbm2((r.x + x) / 9, (r.y + y) / 9, 3) * 0.5 + 0.5;
          d[i + 3] *= saturate(1 - wear + n * wear * 2.1 - 0.18);
        }
      }
      ctx.putImageData(img, r.x, r.y);
    }
    return r;
  }

  _remapUv(geo, region) {
    const uv = geo.attributes.uv;
    for (let i = 0; i < uv.count; i++) {
      const u = uv.getX(i);
      const v = uv.getY(i);
      uv.setXY(
        i,
        (region.x + u * region.w) / this.size,
        1 - (region.y + (1 - v) * region.h) / this.size
      );
    }
  }

  /**
   * Lay a region flat on the ground. With `y` null the quad is subdivided and
   * dropped onto the terrain so it never clips through a rise.
   */
  ground(region, wm, dm, cx, cz, yaw = 0, { y = null, lift = 0.09, segs = 1 } = {}) {
    const geo = new THREE.PlaneGeometry(wm, dm, segs, segs);
    geo.rotateX(-Math.PI / 2);
    this._remapUv(geo, region);
    const pos = geo.attributes.position;
    const c = Math.cos(yaw);
    const s = Math.sin(yaw);
    for (let i = 0; i < pos.count; i++) {
      const lx = pos.getX(i);
      const lz = pos.getZ(i);
      const wxp = cx + lx * c + lz * s;
      const wzp = cz - lx * s + lz * c;
      pos.setX(i, wxp);
      pos.setZ(i, wzp);
      pos.setY(i, y === null ? terrainHeight(wxp, wzp) + lift : y);
    }
    geo.computeVertexNormals();
    this.parts.push(geo);
  }

  /** Hang a region on a vertical surface (wall plates, fence signage). */
  wall(region, wm, hm, pos, rot = [0, 0, 0]) {
    const geo = new THREE.PlaneGeometry(wm, hm);
    this._remapUv(geo, region);
    this.parts.push(G.xform(geo, pos, rot));
  }

  build(name) {
    const tex = new THREE.CanvasTexture(this.canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = settings.quality.anisotropy;
    tex.needsUpdate = true;
    const mat = new THREE.MeshStandardMaterial({
      name: 'markings',
      map: tex,
      transparent: true,
      alphaTest: 0.04,
      depthWrite: false,
      roughness: 0.9,
      metalness: 0.02,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -4,
      polygonOffsetUnits: -4
    });
    const geo = G.merge(this.parts);
    G.finalize(geo, name);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.name = name;
    mesh.renderOrder = 2;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    this.parts.length = 0;
    return mesh;
  }
}

/** Stencil text helper shared by every plate in the atlas. */
function stencil(ctx, lines, w, h, { color = '#d7d1b8', pad = 0.1, weight = 'bold' } = {}) {
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const usable = h * (1 - pad * 2);
  const lh = usable / lines.length;
  lines.forEach((line, i) => {
    const size = Math.min(lh * 0.82, (w * 1.7) / Math.max(4, line.length));
    ctx.font = `${weight} ${Math.round(size)}px "Courier New", monospace`;
    ctx.fillText(line, w / 2, h * pad + lh * (i + 0.5), w * 0.94);
  });
}

/* ------------------------------------------------------------------ *
 * Reusable props
 * ------------------------------------------------------------------ */

/** Jersey / concrete barrier with lifting slots and a reflective plate. */
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

/** A sandbag: cheap enough to lay by the hundred. */
function sandbagGeo() {
  const g = new THREE.SphereGeometry(1, 7, 4);
  g.scale(0.2, 0.085, 0.135);
  return g;
}

/** Small junction box with a conduit gland - scattered over every structure. */
function junctionBox(kit, pos, yaw = 0, size = 0.26) {
  const P = palette();
  kit.place(P.dark, new THREE.BoxGeometry(size, size * 1.3, size * 0.55), pos, [0, yaw, 0]);
  kit.place(
    P.bright,
    new THREE.CylinderGeometry(size * 0.13, size * 0.13, size * 0.3, 6),
    [pos[0], pos[1] - size * 0.72, pos[2]],
    [0, yaw, 0]
  );
}

/**
 * Conduit run: a rigid pipe with saddle clips, dog-legged around obstacles.
 * `pts` is a polyline in world space.
 */
function conduitRun(kit, pts, radius = 0.035, mat = null) {
  const P = palette();
  const m = mat || P.bright;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = new THREE.Vector3().fromArray(pts[i]);
    const b = new THREE.Vector3().fromArray(pts[i + 1]);
    const len = a.distanceTo(b);
    if (len < 1e-3) continue;
    const mid = a.clone().lerp(b, 0.5);
    const dir = b.clone().sub(a).normalize();
    const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    const euler = new THREE.Euler().setFromQuaternion(quat);
    kit.place(m, new THREE.CylinderGeometry(radius, radius, len, 6), mid.toArray(), [
      euler.x,
      euler.y,
      euler.z
    ]);
    // Saddle clips every 900 mm or so.
    const clips = Math.max(1, Math.round(len / 0.9));
    for (let c = 0; c <= clips; c++) {
      const p = a.clone().lerp(b, c / clips);
      kit.place(P.dark, new THREE.BoxGeometry(radius * 3, radius * 1.2, radius * 3), p.toArray(), [
        euler.x,
        euler.y,
        euler.z
      ]);
    }
  }
}

/** Louvred vent panel, used on shelters, gensets and equipment shelters. */
function ventPanel(kit, pos, w, h, yaw = 0, blades = 5) {
  const P = palette();
  kit.place(P.dark, new THREE.BoxGeometry(w, h, 0.05), pos, [0, yaw, 0]);
  const blade = new THREE.BoxGeometry(w * 0.92, h / (blades + 1) * 0.55, 0.07);
  for (let i = 0; i < blades; i++) {
    const off = (i / (blades - 1) - 0.5) * h * 0.74;
    kit.place(P.bright, blade, [pos[0], pos[1] + off, pos[2]], [-0.4, yaw, 0]);
  }
}

/** Steel pallet with a shrink-wrapped load or stacked drums. */
function pallet(kit, pos, yaw, rng, { load = 'crate' } = {}) {
  const P = palette();
  const w = 1.2;
  const d = 1.0;
  kit.place(P.rust, new THREE.BoxGeometry(w, 0.06, d), [pos[0], pos[1] + 0.11, pos[2]], [0, yaw, 0]);
  for (const sx of [-0.45, 0, 0.45]) {
    const off = new THREE.Vector3(sx, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
    kit.place(
      P.rust,
      new THREE.BoxGeometry(0.12, 0.14, d),
      [pos[0] + off.x, pos[1] + 0.07, pos[2] + off.z],
      [0, yaw, 0]
    );
  }
  if (load === 'crate') {
    const h = 0.5 + rng.float() * 0.5;
    kit.place(P.crate, new THREE.BoxGeometry(w * 0.92, h, d * 0.92), [pos[0], pos[1] + 0.14 + h / 2, pos[2]], [0, yaw, 0]);
    // Ratchet straps over the load.
    for (const sz of [-0.22, 0.22]) {
      const off = new THREE.Vector3(0, 0, sz).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
      kit.place(
        P.soft,
        new THREE.BoxGeometry(w * 0.96, h * 1.02, 0.03),
        [pos[0] + off.x, pos[1] + 0.14 + h / 2, pos[2] + off.z],
        [0, yaw, 0]
      );
    }
  } else if (load === 'drums') {
    const drum = new THREE.CylinderGeometry(0.29, 0.29, 0.86, 12);
    const rib = new THREE.TorusGeometry(0.3, 0.025, 5, 12);
    for (const [lx, lz] of [[-0.3, -0.24], [0.3, -0.24], [-0.3, 0.24], [0.3, 0.24]]) {
      const off = new THREE.Vector3(lx, 0, lz).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
      const p = [pos[0] + off.x, pos[1] + 0.57, pos[2] + off.z];
      kit.place(rng.bool(0.5) ? P.signalRed : P.rust, drum, p, [0, yaw, 0]);
      for (const dy of [-0.2, 0.2]) {
        kit.place(P.dark, rib, [p[0], p[1] + dy, p[2]], [Math.PI / 2, 0, 0]);
      }
    }
  }
}

/** Wheel chock: tiny, but nothing says "parked vehicle" faster. */
function wheelChock(kit, pos, yaw) {
  const P = palette();
  const shape = new THREE.Shape();
  shape.moveTo(-0.16, 0);
  shape.lineTo(0.16, 0);
  shape.lineTo(-0.16, 0.2);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.26, bevelEnabled: false, curveSegments: 1 });
  geo.translate(0, 0, -0.13);
  geo.computeVertexNormals();
  kit.place(P.hazard, geo, pos, [0, yaw, 0]);
}

/** Fire point: two extinguishers and a sand bucket on a stand. */
function firePoint(kit, pos, yaw = 0) {
  const P = palette();
  kit.place(P.dark, new THREE.BoxGeometry(1.1, 0.06, 0.4), [pos[0], pos[1] + 0.9, pos[2]], [0, yaw, 0]);
  for (const sx of [-0.5, 0.5]) {
    const off = new THREE.Vector3(sx, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
    kit.place(P.dark, new THREE.CylinderGeometry(0.035, 0.035, 0.9, 5), [pos[0] + off.x, pos[1] + 0.45, pos[2] + off.z]);
  }
  for (const sx of [-0.3, 0.06]) {
    const off = new THREE.Vector3(sx, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
    const p = [pos[0] + off.x, pos[1] + 0.28, pos[2] + off.z];
    kit.place(P.signalRed, new THREE.CylinderGeometry(0.1, 0.1, 0.52, 10), p, [0, yaw, 0]);
    kit.place(P.dark, new THREE.CylinderGeometry(0.035, 0.05, 0.14, 6), [p[0], p[1] + 0.32, p[2]], [0, yaw, 0]);
    kit.place(P.dark, new THREE.TorusGeometry(0.055, 0.014, 5, 10), [p[0], p[1] + 0.4, p[2]], [1.3, yaw, 0]);
  }
  // Sand bucket, hung upside down as they always are.
  const off = new THREE.Vector3(0.42, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
  kit.place(
    P.signalRed,
    new THREE.CylinderGeometry(0.15, 0.11, 0.3, 12),
    [pos[0] + off.x, pos[1] + 0.72, pos[2] + off.z],
    [Math.PI, yaw, 0]
  );
}

/** Cable reel on its side or standing - workshop scatter. */
function cableReel(kit, pos, yaw, standing = true) {
  const P = palette();
  const cheek = new THREE.CylinderGeometry(0.62, 0.62, 0.07, 14);
  const drum = new THREE.CylinderGeometry(0.34, 0.34, 0.52, 14);
  const rot = standing ? [0, 0, Math.PI / 2] : [0, 0, 0];
  const y = standing ? pos[1] + 0.62 : pos[1] + 0.04;
  const base = [pos[0], y, pos[2]];
  const off = standing ? [0.3, 0, 0] : [0, 0.3, 0];
  kit.place(P.rust, drum, base, rot);
  for (const s of [-1, 1]) {
    kit.place(
      P.rust,
      cheek,
      [base[0] + off[0] * s, base[1] + off[1] * s, base[2]],
      rot
    );
  }
  kit.place(P.hose, new THREE.CylinderGeometry(0.5, 0.5, 0.46, 14), base, rot);
  void yaw;
}

/** Hesco-style gabion: a wire cage full of graded fill. */
function gabion(w = 1.5, h = 1.4, d = 1.2) {
  const parts = [G.roundedBox(w, h, d, 0.06)];
  parts[0].translate(0, h / 2, 0);
  return G.merge(parts);
}

/**
 * A gabion revetment: cells of graded fill in wire cages, with the cage frame
 * picked out on the corners. Blast protection round the fuel and power plant.
 */
function gabionWall(kit, collision, from, to, { h = 1.5, tag = 'gabion' } = {}) {
  const P = palette();
  const a = new THREE.Vector3().fromArray(from);
  const b = new THREE.Vector3().fromArray(to);
  const len = a.distanceTo(b);
  const yaw = Math.atan2(b.x - a.x, b.z - a.z);
  const cellW = 1.5;
  const n = Math.max(1, Math.round(len / cellW));
  const cell = gabion(len / n - 0.02, h, 1.2);
  const frame = new THREE.BoxGeometry(0.05, h, 0.05);
  for (let i = 0; i < n; i++) {
    const p = a.clone().lerp(b, (i + 0.5) / n);
    kit.place(P.gravelCoarse, cell, [p.x, p.y, p.z], [0, yaw, 0]);
    for (const [ox, oz] of [[-0.5, -0.6], [0.5, -0.6], [-0.5, 0.6], [0.5, 0.6]]) {
      const dx = ox * (len / n) * Math.cos(yaw) + oz * Math.sin(yaw);
      const dz = -ox * (len / n) * Math.sin(yaw) + oz * Math.cos(yaw);
      kit.place(P.bright, frame, [p.x + dx, p.y + h / 2, p.z + dz], [0, yaw, 0]);
    }
  }
  const mid = a.clone().lerp(b, 0.5);
  collision.addBox(mid.x, mid.y + h / 2, mid.z, len / 2, h / 2, 0.62, yaw, tag);
}

/** Diesel generator set on a skid: radiator, silencer, day tank, earth spike. */
function generatorUnit(kit, pos, yaw = 0) {
  const P = palette();
  const body = P.equip;
  const dark = P.dark;
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  const L = (lx, ly, lz) => [pos[0] + lx * c + lz * s, pos[1] + ly, pos[2] - lx * s + lz * c];

  const skidH = 0.22;
  kit.place(dark, new THREE.BoxGeometry(3.4, skidH, 1.7), L(0, skidH / 2, 0), [0, yaw, 0]);
  // Anti-vibration feet.
  for (const [lx, lz] of [[-1.5, -0.7], [1.5, -0.7], [-1.5, 0.7], [1.5, 0.7]]) {
    kit.place(P.rubber, new THREE.CylinderGeometry(0.09, 0.11, 0.1, 8), L(lx, 0.05, lz));
  }
  const shell = G.roundedBox(3.1, 1.5, 1.5, 0.07);
  kit.place(body, shell, L(0, skidH + 0.78, 0), [0, yaw, 0]);

  // Radiator louvres on one end.
  const louvre = new THREE.BoxGeometry(0.04, 1.0, 1.15);
  for (let i = 0; i < 7; i++) {
    const off = -0.5 + (i / 6) * 1.0;
    kit.place(dark, louvre, L(1.53, skidH + 0.78 + off, 0), [0, yaw, -0.22]);
  }
  // Silencer box and exhaust stack with a rain cap.
  kit.place(dark, new THREE.BoxGeometry(0.5, 0.5, 1.0), L(-1.1, skidH + 1.75, 0.5), [0, yaw, 0]);
  kit.place(P.heat, G.pipe(0.11, 1.5, 0.02, 10), L(-1.1, skidH + 2.3 + 0.75, 0.5), [0, yaw, 0]);
  kit.place(P.heat, new THREE.ConeGeometry(0.17, 0.14, 10), L(-1.1, skidH + 3.62, 0.5), [Math.PI, yaw, 0]);
  // Control panel with a small readout, plus its conduit and gland.
  kit.place(dark, G.roundedBox(0.6, 0.7, 0.22, 0.03), L(0.6, 1.1, -0.9), [0, yaw, 0]);
  kit.place(P.bright, new THREE.BoxGeometry(0.3, 0.2, 0.02), L(0.6, 1.24, -1.02), [0, yaw, 0]);
  conduitRun(kit, [L(0.6, 0.72, -0.97), L(0.6, 0.3, -0.97), L(1.5, 0.3, -0.97)], 0.03);
  // Day tank on the skid end plus a fuel line.
  kit.place(P.rust, new THREE.CylinderGeometry(0.3, 0.3, 0.9, 12), L(-1.5, skidH + 0.45, -0.55), [0, 0, Math.PI / 2]);
  kit.add(P.hose, G.cable(L(-1.5, skidH + 0.6, -0.55), L(-0.3, skidH + 0.9, -0.6), 0.12, 0.03, 8));
  // Lifting eyes.
  for (const lx of [-1.2, 1.2]) {
    kit.place(P.bright, new THREE.TorusGeometry(0.08, 0.02, 5, 10), L(lx, skidH + 1.56, 0), [0, yaw, 0]);
  }
  // Earth spike and its green-yellow strap.
  kit.place(P.bright, new THREE.CylinderGeometry(0.02, 0.01, 0.5, 5), L(1.9, 0.1, -0.8));
  kit.add(P.hose, G.cable(L(1.55, 0.3, -0.8), L(1.9, 0.3, -0.8), 0.06, 0.014, 6));
  // Drip tray under the block.
  kit.place(P.dark, new THREE.BoxGeometry(1.6, 0.08, 1.2), L(-0.2, 0.04, 0), [0, yaw, 0]);
  return { light: L(0, 1.62, 0) };
}

/** Antenna mast: truss tower with whips, a dish, guy wires and a beacon. */
function antennaMast(kit, pos, height = 9, yaw = 0, out = null) {
  const P = palette();
  kit.place(P.steel, G.truss(height, 0.55), [pos[0], pos[1], pos[2]], [0, yaw, 0]);
  kit.place(P.dark, new THREE.BoxGeometry(1.3, 0.14, 1.3), [pos[0], pos[1] + height, pos[2]], [0, yaw, 0]);
  // Whip antennas.
  for (let i = 0; i < 4; i++) {
    const a = yaw + (i / 4) * Math.PI * 2;
    kit.place(
      P.dark,
      new THREE.CylinderGeometry(0.012, 0.006, 2.4, 5),
      [pos[0] + Math.cos(a) * 0.45, pos[1] + height + 1.2, pos[2] + Math.sin(a) * 0.45],
      [Math.sin(a) * 0.08, 0, -Math.cos(a) * 0.08]
    );
  }
  // Small parabolic dish on a stand-off arm.
  const dish = new THREE.SphereGeometry(0.75, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.42);
  dish.scale(1, 0.45, 1);
  kit.place(P.pale, dish, [pos[0], pos[1] + height * 0.72, pos[2] + 0.75], [Math.PI * 0.62, 0, 0]);
  kit.place(P.dark, new THREE.CylinderGeometry(0.035, 0.035, 0.9, 6), [pos[0], pos[1] + height * 0.72, pos[2] + 0.4], [Math.PI / 2, 0, 0]);
  // Feed cable dressed down the leg into a junction box at the foot.
  kit.add(
    P.hose,
    G.cable([pos[0] + 0.2, pos[1] + height * 0.72, pos[2] + 0.4], [pos[0] + 0.28, pos[1] + 0.7, pos[2] + 0.28], 0.25, 0.022, 10)
  );
  junctionBox(kit, [pos[0] + 0.28, pos[1] + 0.55, pos[2] + 0.36], yaw, 0.3);
  // Guy wires with turnbuckles at ground anchors.
  for (let i = 0; i < 3; i++) {
    const a = yaw + (i / 3) * Math.PI * 2 + 0.4;
    const ax = pos[0] + Math.cos(a) * height * 0.55;
    const az = pos[2] + Math.sin(a) * height * 0.55;
    kit.add(P.hose, G.cable([pos[0], pos[1] + height * 0.92, pos[2]], [ax, pos[1] + 0.35, az], 0.25, 0.012, 10));
    kit.place(P.bright, new THREE.CylinderGeometry(0.03, 0.03, 0.3, 6), [ax, pos[1] + 0.2, az]);
    kit.place(P.concreteFine, new THREE.BoxGeometry(0.5, 0.2, 0.5), [ax, pos[1] + 0.06, az]);
  }
  const top = [pos[0], pos[1] + height + 2.4, pos[2]];
  if (out) out.push({ pos: [pos[0], pos[1] + height + 0.2, pos[2]] });
  return { top };
}

/** Floodlight mast: four heads on a crossbar with a cabinet at the base. */
function floodlightMast(kit, pos, height = 10, yaw = 0, beacons = null) {
  const P = palette();
  const steel = M.metal('#6e7269', 0.55, 0.8);
  const dark = P.dark;
  kit.place(steel, new THREE.CylinderGeometry(0.13, 0.19, height, 10), [pos[0], pos[1] + height / 2, pos[2]], [0, yaw, 0]);
  kit.place(P.concreteFine, new THREE.CylinderGeometry(0.42, 0.48, 0.4, 12), [pos[0], pos[1] + 0.16, pos[2]]);
  kit.place(dark, new THREE.CylinderGeometry(0.55, 0.55, 0.16, 12), [pos[0], pos[1] + 0.38, pos[2]]);
  // Holding-down bolts on the base flange.
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    kit.place(P.bright, G.bolt(0.035, 0.08), [pos[0] + Math.cos(a) * 0.4, pos[1] + 0.48, pos[2] + Math.sin(a) * 0.4]);
  }
  kit.place(steel, new THREE.BoxGeometry(2.6, 0.12, 0.16), [pos[0], pos[1] + height, pos[2]], [0, yaw, 0]);
  kit.place(dark, G.roundedBox(0.5, 0.7, 0.32, 0.03), [pos[0] + 0.32, pos[1] + 1.0, pos[2]], [0, yaw, 0]);
  const heads = [];
  for (let i = 0; i < 4; i++) {
    const t = (i / 3 - 0.5) * 2.3;
    const local = new THREE.Vector3(t, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
    const hp = [pos[0] + local.x, pos[1] + height + 0.16, pos[2] + local.z];
    kit.place(dark, G.roundedBox(0.5, 0.34, 0.28, 0.04), hp, [0.42, yaw, 0]);
    // Yoke bracket and a lock handle so the head reads as adjustable.
    kit.place(P.bright, new THREE.BoxGeometry(0.06, 0.3, 0.34), [hp[0], hp[1] - 0.06, hp[2]], [0, yaw, 0]);
    heads.push({ pos: hp, yaw, tilt: 0.42 });
  }
  // Ladder, conduit and cable down the pole.
  kit.place(steel, G.ladder(height * 0.85, 0.32), [pos[0] + 0.2, pos[1], pos[2] + 0.2], [0, yaw, 0]);
  conduitRun(kit, [[pos[0] - 0.15, pos[1] + 0.5, pos[2] + 0.15], [pos[0] - 0.15, pos[1] + height - 0.5, pos[2] + 0.15]], 0.03);
  kit.add(P.hose, G.cable([pos[0] - 0.14, pos[1] + height - 0.4, pos[2]], [pos[0] - 0.14, pos[1] + 1.2, pos[2]], 0.05, 0.018, 6));
  if (beacons) beacons.push({ pos: [pos[0], pos[1] + height + 0.5, pos[2]] });
  return heads;
}

/** Support truck: cab, bed, canvas tilt, wheels and a lot of small iron. */
function supportTruck(kit, pos, yaw = 0, { tilt = true, variant = 'desert' } = {}) {
  const P = palette();
  const body = variant === 'olive' ? P.camoOlive : P.camoDesert;
  const dark = P.dark;
  const glass = M.glassMat('#101c1e', 0.5);
  const tyre = P.rubber;
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  const Pt = (lx, ly, lz) => [pos[0] + lx * c + lz * s, pos[1] + ly, pos[2] - lx * s + lz * c];

  // Chassis.
  kit.place(dark, new THREE.BoxGeometry(6.6, 0.28, 2.1), Pt(0, 0.72, 0), [0, yaw, 0]);
  // Cab.
  kit.place(body, G.roundedBox(2.0, 1.5, 2.2, 0.1), Pt(-2.0, 1.62, 0), [0, yaw, 0]);
  kit.place(glass, new THREE.BoxGeometry(0.06, 0.68, 1.85), Pt(-2.98, 1.9, 0), [0, yaw, 0.14]);
  kit.place(body, G.roundedBox(1.1, 0.75, 2.15, 0.08), Pt(-3.35, 1.15, 0), [0, yaw, 0]);
  // Bumper, grille bars, headlamps with wire guards.
  kit.place(dark, new THREE.BoxGeometry(0.2, 0.34, 2.3), Pt(-3.95, 0.85, 0), [0, yaw, 0]);
  for (let i = 0; i < 5; i++) {
    kit.place(dark, new THREE.BoxGeometry(0.06, 0.05, 1.6), Pt(-3.93, 1.16 + i * 0.11, 0), [0, yaw, 0]);
  }
  for (const lz of [-0.78, 0.78]) {
    kit.place(P.bright, new THREE.CylinderGeometry(0.14, 0.14, 0.08, 10), Pt(-3.92, 1.32, lz), [0, 0, Math.PI / 2]);
    kit.place(dark, new THREE.TorusGeometry(0.16, 0.015, 5, 12), Pt(-3.96, 1.32, lz), [0, Math.PI / 2, 0]);
  }
  // Towing shackles.
  for (const lz of [-0.6, 0.6]) {
    kit.place(P.bright, new THREE.TorusGeometry(0.07, 0.022, 5, 10), Pt(-4.02, 0.82, lz), [0, Math.PI / 2, 0]);
  }
  // Exhaust stack behind the cab.
  kit.place(P.heat, G.pipe(0.07, 2.0, 0.015, 8), Pt(-1.0, 2.2, 1.0), [0, yaw, 0]);
  kit.place(P.heat, new THREE.ConeGeometry(0.1, 0.1, 8), Pt(-1.0, 3.24, 1.0), [Math.PI, yaw, 0]);
  // Bed with side gates.
  kit.place(body, new THREE.BoxGeometry(3.8, 0.7, 2.3), Pt(1.3, 1.2, 0), [0, yaw, 0]);
  for (const lz of [-1.14, 1.14]) {
    kit.place(dark, new THREE.BoxGeometry(3.8, 0.5, 0.06), Pt(1.3, 1.72, lz), [0, yaw, 0]);
  }
  if (tilt) {
    const arch = new THREE.CylinderGeometry(1.15, 1.15, 3.7, 14, 1, true, 0, Math.PI);
    arch.rotateZ(Math.PI / 2);
    kit.place(P.tarp, arch, Pt(1.3, 1.55, 0), [0, yaw, 0]);
    kit.place(P.tarp, new THREE.CircleGeometry(1.15, 14, 0, Math.PI), Pt(3.15, 1.55, 0), [0, yaw + Math.PI / 2, 0]);
    // Lacing hoops and two ratchet straps thrown over the tilt.
    for (let i = 0; i < 6; i++) {
      const lx = -0.5 + i * 0.62;
      kit.place(dark, new THREE.TorusGeometry(0.05, 0.012, 5, 8), Pt(lx, 1.6, 1.16), [0, yaw, 0]);
    }
    for (const lx of [0.1, 2.4]) {
      const strap = new THREE.CylinderGeometry(1.18, 1.18, 0.05, 14, 1, true, 0, Math.PI);
      strap.rotateZ(Math.PI / 2);
      kit.place(P.soft, strap, Pt(lx, 1.55, 0), [0, yaw, 0]);
    }
  }
  // Wheels with hubs and mud flaps.
  const wheel = new THREE.CylinderGeometry(0.62, 0.62, 0.44, 14);
  wheel.rotateX(Math.PI / 2);
  const hub = new THREE.CylinderGeometry(0.22, 0.22, 0.46, 8);
  hub.rotateX(Math.PI / 2);
  for (const [lx, lz] of [
    [-2.3, 1.05], [-2.3, -1.05],
    [1.2, 1.05], [1.2, -1.05],
    [2.35, 1.05], [2.35, -1.05]
  ]) {
    kit.place(tyre, wheel, Pt(lx, 0.62, lz), [0, yaw, 0]);
    kit.place(M.metal('#6a6a64', 0.5, 0.8), hub, Pt(lx, 0.62, lz), [0, yaw, 0]);
  }
  for (const lz of [-1.12, 1.12]) {
    kit.place(P.rubber, new THREE.BoxGeometry(0.04, 0.42, 0.5), Pt(3.05, 0.42, lz), [0, yaw, 0]);
  }
  // Mirrors, jerry cans, spare wheel, side lockers, rear step.
  kit.place(dark, new THREE.BoxGeometry(0.1, 0.34, 0.16), Pt(-2.9, 2.1, 1.25), [0, yaw, 0]);
  kit.place(dark, new THREE.BoxGeometry(0.1, 0.34, 0.16), Pt(-2.9, 2.1, -1.25), [0, yaw, 0]);
  for (const lx of [0.2, 0.66]) {
    kit.place(M.painted('#4f5443', { repeat: 1 }), G.roundedBox(0.42, 0.5, 0.18, 0.03), Pt(lx, 1.0, 1.15), [0, yaw, 0]);
  }
  kit.place(tyre, wheel, Pt(0.4, 1.05, -1.2), [Math.PI / 2, yaw, 0]);
  kit.place(dark, new THREE.BoxGeometry(1.2, 0.4, 0.5), Pt(-0.4, 0.95, -1.2), [0, yaw, 0]);
  kit.place(P.bright, new THREE.BoxGeometry(0.6, 0.05, 0.22), Pt(3.3, 0.55, 0), [0, yaw, 0]);
  // Chocked at the rear wheels.
  wheelChock(kit, Pt(3.15, 0, 1.05), yaw);
}

/** Stacked equipment cases / ammo boxes with latches and stencils. */
function equipmentStack(kit, pos, rng, count = 4, yaw = 0) {
  const P = palette();
  let y = pos[1];
  for (let i = 0; i < count; i++) {
    const w = 1.0 + rng.float() * 0.5;
    const h = 0.34 + rng.float() * 0.2;
    const d = 0.6 + rng.float() * 0.3;
    const jitter = rng.spread(0.16);
    kit.place(P.crate, G.roundedBox(w, h, d, 0.03), [pos[0] + jitter, y + h / 2, pos[2] + rng.spread(0.16)], [0, yaw + rng.spread(0.3), 0]);
    // Latches and a carry handle.
    kit.place(P.dark, new THREE.BoxGeometry(0.07, 0.09, d * 0.9), [pos[0] + jitter + w * 0.36, y + h / 2, pos[2]], [0, yaw, 0]);
    kit.place(P.dark, new THREE.BoxGeometry(0.07, 0.09, d * 0.9), [pos[0] + jitter - w * 0.36, y + h / 2, pos[2]], [0, yaw, 0]);
    y += h;
  }
}

/** Cable trays and loose cable runs snaking between structures. */
function cableRun(kit, from, to, rng, { sag = 0.35, radius = 0.035, strands = 3 } = {}) {
  const P = palette();
  for (let i = 0; i < strands; i++) {
    const off = (i - (strands - 1) / 2) * radius * 2.4;
    kit.add(
      P.hose,
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

/**
 * Ladder-type cable tray on stanchions, carrying bundles between the plant and
 * the shelter. Runs along X or Z depending on the two endpoints.
 */
function cableTray(kit, from, to, rng) {
  const P = palette();
  const a = new THREE.Vector3().fromArray(from);
  const b = new THREE.Vector3().fromArray(to);
  const len = a.distanceTo(b);
  const yaw = Math.atan2(b.x - a.x, b.z - a.z);
  const mid = a.clone().lerp(b, 0.5);
  // Side rails.
  for (const s of [-1, 1]) {
    const off = new THREE.Vector3(Math.cos(yaw) * 0.19 * s, 0, -Math.sin(yaw) * 0.19 * s);
    kit.place(
      P.bright,
      new THREE.BoxGeometry(0.05, 0.1, len),
      [mid.x + off.x, mid.y, mid.z + off.z],
      [0, yaw, 0]
    );
  }
  // Rungs.
  const rungs = Math.max(2, Math.round(len / 0.35));
  for (let i = 0; i <= rungs; i++) {
    const p = a.clone().lerp(b, i / rungs);
    kit.place(P.bright, new THREE.BoxGeometry(0.42, 0.03, 0.04), [p.x, p.y, p.z], [0, yaw, 0]);
  }
  // Stanchions.
  const posts = Math.max(2, Math.round(len / 3.5));
  for (let i = 0; i <= posts; i++) {
    const p = a.clone().lerp(b, i / posts);
    const gy = groundHeight(p.x, p.z);
    kit.place(P.steel, new THREE.CylinderGeometry(0.05, 0.06, p.y - gy, 6), [p.x, (p.y + gy) / 2, p.z]);
    kit.place(P.concreteFine, new THREE.BoxGeometry(0.34, 0.14, 0.34), [p.x, gy + 0.07, p.z], [0, yaw, 0]);
  }
  // The bundles riding in it.
  for (let i = 0; i < 4; i++) {
    const off = (i - 1.5) * 0.08;
    const oa = new THREE.Vector3(Math.cos(yaw) * off, 0.05, -Math.sin(yaw) * off);
    kit.add(
      P.hose,
      G.cable(
        [a.x + oa.x, a.y + oa.y + rng.spread(0.01), a.z + oa.z],
        [b.x + oa.x, b.y + oa.y + rng.spread(0.01), b.z + oa.z],
        0.02,
        0.03,
        8
      )
    );
  }
}

/** Sandbag revetment. */
function sandbagWall(kit, from, to, rng, rows = 3) {
  const P = palette();
  const a = new THREE.Vector3().fromArray(from);
  const b = new THREE.Vector3().fromArray(to);
  const len = a.distanceTo(b);
  const perBag = 0.36;
  const n = Math.max(2, Math.round(len / perBag));
  const bag = sandbagGeo();
  for (let r = 0; r < rows; r++) {
    for (let i = 0; i < n - r; i++) {
      const t = (i + (r % 2) * 0.5) / Math.max(1, n - 1);
      const p = new THREE.Vector3().lerpVectors(a, b, t);
      kit.place(
        P.sandbag,
        bag,
        [p.x + rng.spread(0.03), p.y + 0.08 + r * 0.155, p.z + rng.spread(0.03)],
        [rng.spread(0.06), Math.atan2(b.x - a.x, b.z - a.z) + rng.spread(0.12), rng.spread(0.06)]
      );
    }
  }
}

/**
 * Wind-blown sand drift piled against a wall or barrier run. A triangular
 * prism with a noisy crest, which is exactly what a drift looks like from the
 * lee side of anything in a desert.
 */
function sandDrift(kit, mat, from, to, rng, { height = 0.5, reach = 1.6 } = {}) {
  const a = new THREE.Vector3().fromArray(from);
  const b = new THREE.Vector3().fromArray(to);
  const len = a.distanceTo(b);
  const steps = Math.max(2, Math.round(len / 1.6));
  const dir = b.clone().sub(a).normalize();
  const side = new THREE.Vector3(-dir.z, 0, dir.x);
  const positions = [];
  const push = (p) => positions.push(p.x, p.y, p.z);
  for (let i = 0; i < steps; i++) {
    const t0 = i / steps;
    const t1 = (i + 1) / steps;
    const h0 = height * (0.55 + rng.float() * 0.7);
    const h1 = height * (0.55 + rng.float() * 0.7);
    const r0 = reach * (0.7 + rng.float() * 0.6);
    const r1 = reach * (0.7 + rng.float() * 0.6);
    const p0 = a.clone().lerp(b, t0);
    const p1 = a.clone().lerp(b, t1);
    const c0 = p0.clone().addScaledVector(side, 0.05);
    const c1 = p1.clone().addScaledVector(side, 0.05);
    const t0o = p0.clone().addScaledVector(side, r0);
    const t1o = p1.clone().addScaledVector(side, r1);
    c0.y += h0;
    c1.y += h1;
    // Slope face.
    push(c0); push(t0o); push(t1o);
    push(c0); push(t1o); push(c1);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
  geo.computeVertexNormals();
  kit.add(mat, geo);
}

/** Camouflage net stretched between poles and sagging in the middle. */
function camoNetSpan(kit, cx, cy, cz, w, d, yaw, { sag = 0.75, poles = true } = {}) {
  const P = palette();
  const segs = 6;
  const geo = new THREE.PlaneGeometry(w, d, segs, segs);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const u = pos.getX(i) / w + 0.5;
    const v = pos.getZ(i) / d + 0.5;
    const s = Math.sin(Math.PI * u) * Math.sin(Math.PI * v);
    pos.setY(i, -sag * Math.pow(s, 0.7) + Math.sin(u * 8.5) * 0.05 + Math.cos(v * 7) * 0.04);
  }
  geo.computeVertexNormals();
  kit.place(P.net, geo, [cx, cy, cz], [0, yaw, 0]);
  if (!poles) return;
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  for (const [lx, lz] of [
    [-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2]
  ]) {
    const px = cx + lx * c + lz * s;
    const pz = cz - lx * s + lz * c;
    const gy = groundHeight(px, pz);
    kit.place(P.steel, new THREE.CylinderGeometry(0.05, 0.06, cy - gy, 6), [px, (cy + gy) / 2, pz]);
    kit.add(P.hose, G.cable([px, cy, pz], [px + lx * 0.25, gy + 0.1, pz + lz * 0.25], 0.1, 0.012, 6));
  }
}

/**
 * Precast drainage channel with a grating, sitting flush at the edge of the
 * apron. Surface drainage without cutting the terrain mesh, which is far too
 * coarse to hold a ditch.
 */
function drainChannel(kit, from, to, { grate = true } = {}) {
  const P = palette();
  const a = new THREE.Vector3().fromArray(from);
  const b = new THREE.Vector3().fromArray(to);
  const len = a.distanceTo(b);
  const yaw = Math.atan2(b.x - a.x, b.z - a.z);
  const mid = a.clone().lerp(b, 0.5);
  const w = 0.62;
  // Two kerb walls and a floor, so it reads as an open channel from above.
  for (const s of [-1, 1]) {
    const off = new THREE.Vector3(Math.cos(yaw) * (w / 2) * s, 0, -Math.sin(yaw) * (w / 2) * s);
    kit.place(
      P.concreteFine,
      new THREE.BoxGeometry(0.12, 0.34, len),
      [mid.x + off.x, mid.y + 0.12, mid.z + off.z],
      [0, yaw, 0]
    );
  }
  kit.place(P.concreteFine, new THREE.BoxGeometry(w + 0.24, 0.1, len), [mid.x, mid.y - 0.06, mid.z], [0, yaw, 0]);
  if (grate) {
    const bars = Math.max(2, Math.round(len / 0.42));
    for (let i = 0; i < bars; i++) {
      const p = a.clone().lerp(b, (i + 0.5) / bars);
      kit.place(P.bright, new THREE.BoxGeometry(w, 0.03, 0.045), [p.x, p.y + 0.27, p.z], [0, yaw, 0]);
    }
  }
}

/** Culvert headwall: a pipe mouth in a concrete wingwall under a road. */
function culvert(kit, pos, yaw = 0) {
  const P = palette();
  kit.place(P.concreteFine, new THREE.BoxGeometry(2.2, 0.9, 0.3), [pos[0], pos[1] + 0.45, pos[2]], [0, yaw, 0]);
  kit.place(P.concreteFine, new THREE.BoxGeometry(0.3, 0.7, 1.0), [pos[0] - 0.95, pos[1] + 0.35, pos[2] + 0.5], [0, yaw + 0.35, 0]);
  kit.place(P.concreteFine, new THREE.BoxGeometry(0.3, 0.7, 1.0), [pos[0] + 0.95, pos[1] + 0.35, pos[2] + 0.5], [0, yaw - 0.35, 0]);
  const pipe = G.pipe(0.42, 0.5, 0.05, 14);
  kit.place(P.rust, pipe, [pos[0], pos[1] + 0.42, pos[2] - 0.1], [Math.PI / 2, yaw, 0]);
}

/** Small weather mast: anemometer, vane and a louvred screen. */
function weatherMast(kit, pos, height = 4.4) {
  const P = palette();
  kit.place(P.bright, new THREE.CylinderGeometry(0.045, 0.06, height, 8), [pos[0], pos[1] + height / 2, pos[2]]);
  kit.place(P.dark, new THREE.BoxGeometry(0.34, 0.06, 0.34), [pos[0], pos[1] + 0.03, pos[2]]);
  kit.place(P.pale, new THREE.BoxGeometry(0.24, 0.32, 0.2), [pos[0] + 0.22, pos[1] + height * 0.55, pos[2]]);
  kit.place(P.bright, new THREE.CylinderGeometry(0.02, 0.02, 0.5, 6), [pos[0] + 0.11, pos[1] + height * 0.55, pos[2]], [0, 0, Math.PI / 2]);
  return { hub: [pos[0], pos[1] + height + 0.1, pos[2]] };
}

/** The spinning part of the weather mast, so it can be animated. */
function anemometerHead() {
  const P = palette();
  const kit = new Kit();
  kit.place(P.bright, new THREE.CylinderGeometry(0.03, 0.03, 0.12, 8), [0, 0, 0]);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    kit.place(P.bright, new THREE.CylinderGeometry(0.008, 0.008, 0.22, 5), [Math.cos(a) * 0.11, 0.05, Math.sin(a) * 0.11], [0, -a, Math.PI / 2]);
    const cup = new THREE.SphereGeometry(0.05, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2);
    kit.place(P.bright, cup, [Math.cos(a) * 0.22, 0.05, Math.sin(a) * 0.22], [Math.PI / 2, -a, 0]);
  }
  return kit.build('anemometer', { castShadow: false });
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
      windsock: null,
      anemometer: null
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
      radar: { pos: new THREE.Vector3(34, 0, 14), yaw: THREE.MathUtils.degToRad(-8) },
      // The shelter sits well off to the west so the whole northern sky - the
      // threat axis - is unobstructed from the main operating area.
      shelter: { pos: new THREE.Vector3(-58, 0, 40), yaw: 0 }
    };
    const sh = this.anchors.shelter.pos;
    this.playerSpawn = new THREE.Vector3(-10, 0, 48);
    // Yaw 0 faces -Z, which is north here: straight up the apron at the pads.
    this.playerSpawnYaw = 0;
    this.consoleSeat = new THREE.Vector3(sh.x, 0, sh.z - 1.0);
    this.consoleFocus = new THREE.Vector3(sh.x, 1.3, sh.z - 2.65);

    /** Structures and clutter: one merged mesh per material for the whole site. */
    this.kit = new Kit();
    /** Ground-level slabs, roads and berms - never cast, always receive. */
    this.slabKit = new Kit();
    /** Emissive night-only dressing, kept apart so it can be hidden by day. */
    this.beaconMatA = emissiveMat('beacon-a', '#ff2a18', 2.6);
    this.beaconMatB = emissiveMat('beacon-b', '#ff2a18', 2.6);
    this.walkwayMat = emissiveMat('walkway-lamp', '#ffd9a0', 2.0);
    this.marks = new MarkingAtlas(2048);
    this._regions = {};
    this._beaconsA = [];
    this._beaconsB = [];
    this._walkwayLamps = [];
  }

  build() {
    this._paintAtlas();
    this._buildTerrain();
    this._buildApron();
    this._buildShelter();
    this._buildRadarStation();
    this._buildSupportArea();
    this._buildPerimeter();
    this._buildMarkings();
    this._buildGroundDressing();
    this._buildNightRig();

    this.group.add(this.slabKit.build('site-ground', { castShadow: false, receiveShadow: true }));
    this.group.add(this.kit.build('site'));
    this.group.add(this.marks.build('markings'));
    this.collision.build();
    return this;
  }

  /* ---------------------------------------------------- markings atlas */

  /**
   * Every stencil, line and plate on the site is painted once here. Regions are
   * reused by as many quads as we like, so the whole paint scheme is one mesh.
   */
  _paintAtlas() {
    const A = this.marks;
    const R = this._regions;
    const paintCream = '#d9d3ba';
    const paintYellow = '#cbaa4a';
    const paintRed = '#b04a38';

    const plate = (lines, color) => (ctx, cw, ch) => {
      ctx.clearRect(0, 0, cw, ch);
      stencil(ctx, lines, cw, ch, { color: color || paintCream });
    };

    R.siteName = A.paint(768, 256, plate(['AEGIS LINE', 'SITE 07'], '#c9c2a6'), { wear: 0.62 });
    R.padA = A.paint(640, 256, plate(['PAD A', 'HAWKEYE-T']), { wear: 0.55 });
    R.padB = A.paint(640, 256, plate(['PAD B', 'HIGHTOWER']), { wear: 0.55 });
    R.padC = A.paint(640, 256, plate(['PAD C', 'SENTINEL']), { wear: 0.55 });
    R.danger = A.paint(768, 200, plate(['DANGER', 'BLAST AREA'], paintRed), { wear: 0.5 });
    R.keepClear = A.paint(512, 160, plate(['KEEP CLEAR'], paintYellow), { wear: 0.5 });
    R.holdShortText = A.paint(512, 160, plate(['HOLD SHORT'], paintYellow), { wear: 0.5 });
    R.noParking = A.paint(512, 200, plate(['NO', 'PARKING']), { wear: 0.5 });
    R.firePointText = A.paint(512, 160, plate(['FIRE POINT'], paintRed), { wear: 0.45 });
    R.muster = A.paint(512, 200, plate(['MUSTER', 'POINT']), { wear: 0.45 });
    R.speed = A.paint(384, 200, plate(['15', 'KM/H'], paintYellow), { wear: 0.5 });

    // Wall / fence plates get a painted background so they read as signboards.
    const board = (lines, bg, fg, border) => (ctx, cw, ch) => {
      ctx.clearRect(0, 0, cw, ch);
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, cw, ch);
      if (border) {
        ctx.strokeStyle = border;
        ctx.lineWidth = Math.max(3, ch * 0.045);
        ctx.strokeRect(ch * 0.05, ch * 0.05, cw - ch * 0.1, ch - ch * 0.1);
      }
      stencil(ctx, lines, cw, ch, { color: fg, pad: 0.16 });
    };
    R.restricted = A.paint(512, 256, board(['RESTRICTED', 'AREA', 'NO ENTRY'], '#c9c2a4', '#3a2b22', '#8c2f22'), { wear: 0.3 });
    R.rfHazard = A.paint(512, 256, board(['RF HAZARD', 'DO NOT APPROACH', 'WHEN RADIATING'], '#c8ae3c', '#241f14', '#241f14'), { wear: 0.28 });
    R.authorised = A.paint(384, 256, board(['AUTHORISED', 'PERSONNEL', 'ONLY'], '#b9bfc4', '#232a2e', '#3d4a52'), { wear: 0.25 });
    R.highVoltage = A.paint(256, 320, board(['DANGER', 'HIGH', 'VOLTAGE'], '#c8ae3c', '#241f14', '#241f14'), { wear: 0.25 });
    R.fuelPlate = A.paint(384, 200, board(['DIESEL', 'NO SMOKING'], '#c9c2a4', '#3a2b22', '#8c2f22'), { wear: 0.3 });
    R.shelterPlate = A.paint(384, 200, board(['C2 SHELTER', 'SITE 07'], '#8d9384', '#1d2119', '#1d2119'), { wear: 0.3 });
    R.loadPlate = A.paint(256, 160, board(['SWL 2.5 t'], '#8d9384', '#1d2119', null), { wear: 0.35 });

    // Line work. All of these tile by being placed end to end.
    R.dash = A.paint(64, 256, (ctx, w, h) => {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = paintCream;
      ctx.fillRect(w * 0.28, h * 0.06, w * 0.44, h * 0.88);
    }, { wear: 0.55 });

    R.solid = A.paint(48, 256, (ctx, w, h) => {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = paintCream;
      ctx.fillRect(w * 0.3, 0, w * 0.4, h);
    }, { wear: 0.5 });

    R.solidYellow = A.paint(48, 256, (ctx, w, h) => {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = paintYellow;
      ctx.fillRect(w * 0.3, 0, w * 0.4, h);
    }, { wear: 0.5 });

    // Walkway: two edge lines with a scuffed centre.
    R.walkway = A.paint(192, 256, (ctx, w, h) => {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = paintCream;
      ctx.fillRect(w * 0.06, 0, w * 0.1, h);
      ctx.fillRect(w * 0.84, 0, w * 0.1, h);
    }, { wear: 0.55 });

    // Hold-short bar: two solid, two dashed, the whole tile 2.4 m deep.
    R.holdShort = A.paint(256, 256, (ctx, w, h) => {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = paintYellow;
      ctx.fillRect(0, h * 0.08, w, h * 0.07);
      ctx.fillRect(0, h * 0.24, w, h * 0.07);
      for (let i = 0; i < 7; i++) {
        ctx.fillRect((i / 7) * w + w * 0.02, h * 0.5, w * 0.1, h * 0.07);
        ctx.fillRect((i / 7) * w + w * 0.02, h * 0.68, w * 0.1, h * 0.07);
      }
    }, { wear: 0.5 });

    // Hazard chevrons for pad edges.
    R.chevron = A.paint(256, 128, (ctx, w, h) => {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = paintYellow;
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = 'rgba(24,22,18,0.92)';
      for (let i = -2; i < 8; i++) {
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(i * (w / 6), h);
        ctx.lineTo(i * (w / 6) + w / 12, h);
        ctx.lineTo(i * (w / 6) + w / 12 + h, 0);
        ctx.lineTo(i * (w / 6) + h, 0);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
    }, { wear: 0.42 });

    R.arrow = A.paint(256, 320, (ctx, w, h) => {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = paintCream;
      ctx.beginPath();
      ctx.moveTo(w * 0.5, h * 0.05);
      ctx.lineTo(w * 0.92, h * 0.45);
      ctx.lineTo(w * 0.68, h * 0.45);
      ctx.lineTo(w * 0.68, h * 0.95);
      ctx.lineTo(w * 0.32, h * 0.95);
      ctx.lineTo(w * 0.32, h * 0.45);
      ctx.lineTo(w * 0.08, h * 0.45);
      ctx.closePath();
      ctx.fill();
    }, { wear: 0.5 });

    // Big pad numerals, one per hardstand.
    const numeral = (n) => (ctx, w, h) => {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = paintCream;
      ctx.font = `bold ${Math.round(h * 0.9)}px "Courier New", monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(n, w / 2, h * 0.52, w * 0.94);
    };
    R.num1 = A.paint(256, 384, numeral('01'), { wear: 0.6 });
    R.num2 = A.paint(256, 384, numeral('02'), { wear: 0.6 });
    R.num3 = A.paint(256, 384, numeral('03'), { wear: 0.6 });

    // A grounding-point ring painted round each earth stud.
    R.earthRing = A.paint(192, 192, (ctx, w, h) => {
      ctx.clearRect(0, 0, w, h);
      ctx.strokeStyle = paintYellow;
      ctx.lineWidth = w * 0.08;
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, w * 0.36, 0, Math.PI * 2);
      ctx.stroke();
    }, { wear: 0.5 });

    // --- ground dressing, sharing the same atlas and therefore the same mesh ---

    R.tyreTrack = A.paint(160, 512, (ctx, w, h) => {
      ctx.clearRect(0, 0, w, h);
      for (const cx of [w * 0.26, w * 0.74]) {
        for (let y = 0; y < h; y += 3) {
          const n = detailNoise.fbm2(cx / 12, y / 9, 3) * 0.5 + 0.5;
          ctx.fillStyle = `rgba(58,50,40,${0.16 + n * 0.4})`;
          ctx.fillRect(cx - w * 0.13, y, w * 0.26, 3);
        }
      }
      // Fade the ends so a track can stop mid-desert without a hard edge.
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, 'rgba(0,0,0,1)');
      g.addColorStop(0.12, 'rgba(0,0,0,0)');
      g.addColorStop(0.88, 'rgba(0,0,0,0)');
      g.addColorStop(1, 'rgba(0,0,0,1)');
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'source-over';
    }, { wear: 0.3 });

    R.sandStreak = A.paint(512, 512, (ctx, w, h) => {
      ctx.clearRect(0, 0, w, h);
      for (let i = 0; i < 90; i++) {
        const y = Math.random() * h;
        const len = w * (0.2 + Math.random() * 0.7);
        const x = Math.random() * w;
        const grad = ctx.createLinearGradient(x, y, x + len, y + (Math.random() - 0.5) * 40);
        const a = 0.1 + Math.random() * 0.22;
        grad.addColorStop(0, 'rgba(226,208,172,0)');
        grad.addColorStop(0.45, `rgba(226,208,172,${a})`);
        grad.addColorStop(1, 'rgba(226,208,172,0)');
        ctx.strokeStyle = grad;
        ctx.lineWidth = 2 + Math.random() * 11;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.quadraticCurveTo(x + len * 0.5, y + (Math.random() - 0.5) * 26, x + len, y + (Math.random() - 0.5) * 40);
        ctx.stroke();
      }
    }, { wear: 0.2 });

    R.oilStain = A.paint(256, 256, (ctx, w, h) => {
      ctx.clearRect(0, 0, w, h);
      for (let i = 0; i < 12; i++) {
        const x = w * 0.5 + (Math.random() - 0.5) * w * 0.5;
        const y = h * 0.5 + (Math.random() - 0.5) * h * 0.5;
        const r = w * (0.08 + Math.random() * 0.26);
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, `rgba(26,23,20,${0.2 + Math.random() * 0.3})`);
        g.addColorStop(1, 'rgba(26,23,20,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }, { wear: 0.1 });
  }

  /* ---------------------------------------------------- terrain */
  _buildTerrain() {
    const q = settings.quality;

    // Far terrain: one big displaced plane carrying the ranges. One draw call,
    // so resolution is the only thing that is genuinely cheap here.
    const farSize = 34000;
    const farSeg = clamp(Math.floor(q.terrainSegments * 1.7), 170, 320);
    const farGeo = new THREE.PlaneGeometry(farSize, farSize, farSeg, farSeg);
    farGeo.rotateX(-Math.PI / 2);
    this._displace(farGeo, farSeg, farSize, true);
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

    // Near terrain: finer mesh around the site. It has to reach past the point
    // where the far sheet stops being sunk, or the seam shows.
    const nearSize = 1300;
    const nearSeg = clamp(Math.floor(q.terrainSegments * 1.25), 110, 200);
    const nearGeo = new THREE.PlaneGeometry(nearSize, nearSize, nearSeg, nearSeg);
    nearGeo.rotateX(-Math.PI / 2);
    this._displace(nearGeo, nearSeg, nearSize, false);
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

    this._scatterGroundDetail();
  }

  /**
   * Displace a ground plane and paint per-vertex colour from altitude and
   * slope. Slope comes from the vertex grid rather than extra noise lookups,
   * which keeps the far mesh - 100 k vertices of fairly expensive fBm - inside
   * a sensible build budget.
   */
  _displace(geo, seg, size, isFar) {
    const pos = geo.attributes.position;
    const cols = seg + 1;
    const step = size / seg;
    const h = new Float32Array(pos.count);

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      let y = terrainHeight(x, z);
      if (isFar) {
        // Sink the coarse sheet under the fine one so they never z-fight, and
        // finish the blend well inside the near mesh so the two agree at the
        // seam.
        const d = Math.hypot(x, z);
        y -= (1 - smoothstep(360, 540, d)) * 4.5;
      } else {
        // Tuck the outer ring under the far sheet so no crack can open up.
        const ix = i % cols;
        const iy = (i / cols) | 0;
        if (ix === 0 || iy === 0 || ix === seg || iy === seg) y -= 3.0;
      }
      h[i] = y;
      pos.setY(i, y);
    }

    const colors = new Float32Array(pos.count * 3);
    const c = new THREE.Color();
    const tmp = new THREE.Color();
    const sand = new THREE.Color('#bda67c');
    const dust = new THREE.Color('#9c8a66');
    const gravelCol = new THREE.Color('#87795e');
    const rock = new THREE.Color('#6b5f50');
    const darkRock = new THREE.Color('#4e463c');
    const pale = new THREE.Color('#a8a396');
    const N = terrainNoise;

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const y = h[i];
      const ix = i % cols;
      const iy = (i / cols) | 0;
      const xm = h[iy * cols + Math.max(0, ix - 1)];
      const xp = h[iy * cols + Math.min(seg, ix + 1)];
      const zm = h[Math.max(0, iy - 1) * cols + ix];
      const zp = h[Math.min(seg, iy + 1) * cols + ix];
      const dx = (xp - xm) / (2 * step);
      const dz = (zp - zm) / (2 * step);
      const slope = Math.hypot(dx, dz);
      const d = Math.hypot(x, z);

      // Base floor: pale playa sand near the site, coarser gravel out on the
      // bajada. Streaked along the prevailing wind so the flats are not flat.
      const streak = N.fbm2(x / 900 + z / 3000, z / 190, 3) * 0.5 + 0.5;
      const patch = N.fbm2(x / 260, z / 260, 3) * 0.5 + 0.5;
      c.copy(sand).lerp(dust, saturate(patch * 1.2 - 0.1));
      c.lerp(gravelCol, smoothstep(600, 3200, d) * 0.55);
      c.lerp(pale, saturate(streak - 0.55) * 0.5);

      // Slope drives the rock/sand split: anything steep sheds its cover.
      const rockMix = smoothstep(0.16, 0.62, slope);
      tmp.copy(rock).lerp(darkRock, smoothstep(0.5, 1.25, slope));
      c.lerp(tmp, rockMix * 0.9);

      // Altitude bleaches the high ground and puts a bright rim on the ridges.
      const alt = saturate((y - 160) / 520);
      c.lerp(pale, Math.pow(alt, 1.5) * 0.55 * (1 - rockMix * 0.35));
      const crest = saturate((y - 700) / 700);
      c.lerp(pale, crest * 0.35);

      // Caprock band: the flat mesa tops keep their dark cover, their flanks
      // do not - which is exactly what makes a butte read as a butte.
      const capBand = smoothstep(0.05, 0.25, slope) * (1 - smoothstep(0.45, 0.9, slope));
      c.lerp(darkRock, capBand * saturate((y - 45) / 90) * 0.4);

      // Traffic and spoil darken the ground immediately around the site.
      const worked = (1 - smoothstep(120, 340, d)) * 0.12;
      c.multiplyScalar(1 - worked);
      c.multiplyScalar(0.93 + N.fbm2(x / 55, z / 55, 2) * 0.13);

      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    void isFar;
  }

  /** Is this position inside the graded site, where nothing should grow? */
  _onSite(x, z) {
    return Math.abs(x + 4) < 112 && z > -108 && z < 68;
  }

  _scatterGroundDetail() {
    const rng = this.rng.fork('scatter');
    const q = settings.quality;
    const m = new THREE.Matrix4();
    const qt = new THREE.Quaternion();
    const sc = new THREE.Vector3();
    const p = new THREE.Vector3();
    const e = new THREE.Euler();

    /**
     * Rocks and scrub both want to gather into fields rather than spread
     * evenly, so every sample is pulled toward one of a handful of seeds.
     */
    const fields = [];
    for (let i = 0; i < 26; i++) {
      const a = rng.float() * Math.PI * 2;
      const r = 120 + Math.pow(rng.float(), 0.7) * 620;
      fields.push({ x: Math.cos(a) * r, z: Math.sin(a) * r, r: 40 + rng.float() * 120 });
    }
    const inField = () => {
      const f = fields[rng.int(0, fields.length - 1)];
      const a = rng.float() * Math.PI * 2;
      const rr = Math.pow(rng.float(), 0.6) * f.r;
      return [f.x + Math.cos(a) * rr, f.z + Math.sin(a) * rr];
    };

    const scatter = (mesh, count, place) => {
      let placed = 0;
      let guard = 0;
      while (placed < count && guard++ < count * 14) {
        const clustered = rng.bool(0.65);
        let x;
        let z;
        if (clustered) {
          [x, z] = inField();
        } else {
          const a = rng.float() * Math.PI * 2;
          const r = 26 + Math.pow(rng.float(), 0.6) * 660;
          x = Math.cos(a) * r;
          z = Math.sin(a) * r;
        }
        if (this._onSite(x, z)) continue;
        if (place(x, z, placed)) placed++;
      }
      mesh.count = placed;
      mesh.instanceMatrix.needsUpdate = true;
      this.group.add(mesh);
    };

    // --- small rocks ---
    const rockCount = Math.floor(620 * q.groundDetail);
    const rockGeo = new THREE.DodecahedronGeometry(1, 0);
    const rockMat = M.metal('#6a6055', 0.98, 0.02);
    rockMat.flatShading = true;
    const rocks = new THREE.InstancedMesh(rockGeo, rockMat, rockCount);
    rocks.castShadow = q.shadows;
    rocks.receiveShadow = q.shadows;
    rocks.name = 'rocks';
    scatter(rocks, rockCount, (x, z, i) => {
      p.set(x, terrainHeight(x, z) - 0.15, z);
      e.set(rng.spread(0.5), rng.float() * 6.28, rng.spread(0.5));
      qt.setFromEuler(e);
      const s = 0.25 + Math.pow(rng.float(), 2.4) * 2.2;
      sc.set(s, s * (0.5 + rng.float() * 0.5), s * (0.7 + rng.float() * 0.6));
      m.compose(p, qt, sc);
      rocks.setMatrixAt(i, m);
      return true;
    });

    // --- boulders: a handful of big ones, worth their own geometry ---
    const bCount = Math.max(18, Math.floor(90 * q.groundDetail));
    const bGeo = new THREE.IcosahedronGeometry(1, 1);
    // Knock the sphere about so it reads as fractured rock, not a ball.
    {
      const bp = bGeo.attributes.position;
      for (let i = 0; i < bp.count; i++) {
        const nx = bp.getX(i);
        const ny = bp.getY(i);
        const nz = bp.getZ(i);
        const k = 1 + detailNoise.fbm2(nx * 1.6 + 3, nz * 1.6 - 2, 3) * 0.42 + ny * 0.06;
        bp.setXYZ(i, nx * k, ny * k * 0.8, nz * k);
      }
      bGeo.computeVertexNormals();
    }
    const bMat = M.metal('#6f6558', 0.99, 0.02);
    bMat.flatShading = true;
    const boulders = new THREE.InstancedMesh(bGeo, bMat, bCount);
    boulders.castShadow = q.shadows;
    boulders.receiveShadow = q.shadows;
    boulders.name = 'boulders';
    scatter(boulders, bCount, (x, z, i) => {
      if (Math.hypot(x, z) < 90) return false;
      p.set(x, terrainHeight(x, z) - 0.9, z);
      e.set(rng.spread(0.25), rng.float() * 6.28, rng.spread(0.25));
      qt.setFromEuler(e);
      const s = 1.3 + Math.pow(rng.float(), 1.8) * 3.4;
      sc.set(s, s * (0.6 + rng.float() * 0.5), s * (0.8 + rng.float() * 0.5));
      m.compose(p, qt, sc);
      boulders.setMatrixAt(i, m);
      return true;
    });

    // --- dry grass tussocks ---
    const blade = new THREE.PlaneGeometry(1.5, 1.0);
    blade.translate(0, 0.5, 0);
    const blade2 = blade.clone();
    blade2.rotateY(Math.PI / 2);
    const cardGeo = G.merge([blade, blade2]);

    const scrubCount = Math.floor(560 * q.groundDetail);
    const scrubMat = new THREE.MeshStandardMaterial({
      map: scrubTexture('grass'),
      transparent: true,
      alphaTest: 0.4,
      side: THREE.DoubleSide,
      roughness: 1,
      metalness: 0,
      color: '#8e8258'
    });
    const scrub = new THREE.InstancedMesh(cardGeo, scrubMat, scrubCount);
    scrub.castShadow = false;
    scrub.receiveShadow = false;
    scrub.name = 'scrub';
    scatter(scrub, scrubCount, (x, z, i) => {
      p.set(x, terrainHeight(x, z) - 0.05, z);
      e.set(0, rng.float() * 6.28, 0);
      qt.setFromEuler(e);
      const s = 0.5 + rng.float() * 1.5;
      sc.set(s, s * (0.7 + rng.float() * 0.8), s);
      m.compose(p, qt, sc);
      scrub.setMatrixAt(i, m);
      return true;
    });

    // --- woody bushes, bigger and darker, to break up the grass ---
    const bushCount = Math.floor(230 * q.groundDetail);
    const bushMat = new THREE.MeshStandardMaterial({
      map: scrubTexture('bush'),
      transparent: true,
      alphaTest: 0.35,
      side: THREE.DoubleSide,
      roughness: 1,
      metalness: 0,
      color: '#77714c'
    });
    const bushes = new THREE.InstancedMesh(cardGeo.clone(), bushMat, bushCount);
    bushes.castShadow = false;
    bushes.receiveShadow = false;
    bushes.name = 'bushes';
    scatter(bushes, bushCount, (x, z, i) => {
      p.set(x, terrainHeight(x, z) - 0.08, z);
      e.set(0, rng.float() * 6.28, 0);
      qt.setFromEuler(e);
      const s = 1.1 + rng.float() * 1.9;
      sc.set(s, s * (0.55 + rng.float() * 0.5), s);
      m.compose(p, qt, sc);
      bushes.setMatrixAt(i, m);
      return true;
    });
  }

  /* ---------------------------------------------------- apron & roads */
  _buildApron() {
    const kit = this.slabKit;
    const P = palette();
    const conc = P.concrete;
    const grav = P.gravel;

    // Main apron slab, slightly proud of the ground, with a chamfered kerb.
    kit.place(conc, new THREE.BoxGeometry(196, 0.24, 168), [-4, 0.12, -12]);
    kit.place(P.gravelCoarse, new THREE.BoxGeometry(206, 0.14, 178), [-4, 0.05, -12]);

    // Battery hardstands.
    const pads = ['patriot', 'thaad', 'sentinel'];
    for (const key of pads) {
      const a = this.anchors[key];
      kit.place(conc, new THREE.BoxGeometry(34, 0.3, 30), [a.pos.x, 0.28, a.pos.z], [0, a.yaw, 0]);
      // Kerb so the 200 mm step up onto the hardstand reads as deliberate.
      for (const [dx, dz, w, d] of [
        [0, -15.1, 34.6, 0.6],
        [0, 15.1, 34.6, 0.6],
        [-17.3, 0, 0.6, 30.8],
        [17.3, 0, 0.6, 30.8]
      ]) {
        const off = new THREE.Vector3(dx, 0, dz).applyAxisAngle(new THREE.Vector3(0, 1, 0), a.yaw);
        kit.place(P.concreteFine, new THREE.BoxGeometry(w, 0.34, d), [a.pos.x + off.x, 0.3, a.pos.z + off.z], [0, a.yaw, 0]);
      }
      // Earth revetments on the east and west flanks only - the launcher's
      // line of sight north and the player's view from the south stay clear.
      const berm = new THREE.BoxGeometry(2.6, 1.7, 26);
      for (const sx of [-17.5, 17.5]) {
        const off = new THREE.Vector3(sx, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), a.yaw);
        kit.place(P.gravelCoarse, berm, [a.pos.x + off.x, 0.85, a.pos.z + off.z], [0, a.yaw, 0]);
        this.collision.addBox(a.pos.x + off.x, 0.85, a.pos.z + off.z, 1.3, 0.85, 13, a.yaw, 'berm');
      }
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

    this.collision.addBox(-4, 0.06, -12, 98, 0.12, 84, 0, 'apron');
  }

  /* ---------------------------------------------------- command shelter */
  _buildShelter() {
    const kit = this.kit;
    const P = palette();
    const A = this.marks;
    const R = this._regions;
    const rng = this.rng.fork('shelter');
    const a = this.anchors.shelter;
    const ox = a.pos.x;
    const oz = a.pos.z;

    const W = 15.5; // east-west
    const D = 9.0; // north-south
    const H = 3.6;
    const wall = P.wall;
    const dark = P.dark;
    const trim = M.painted('#4a4e42', { repeat: 2 });

    // Concrete plinth with a ramp up to the door.
    this.slabKit.place(P.concreteFine, new THREE.BoxGeometry(W + 2.4, 0.4, D + 2.4), [ox, 0.2, oz]);
    this.slabKit.place(P.concreteFine, new THREE.BoxGeometry(2.6, 0.4, 2.2), [ox, 0.2, oz + D / 2 + 2.3], [0.09, 0, 0]);

    const t = 0.28;
    const winW = 8.4;
    const winH = 1.5;
    const winSillY = 1.35;

    // South wall (behind the console) with a door.
    const doorW = 1.5;
    kit.place(wall, G.corrugated((W - doorW) / 2, H, 0.06), [ox - (W + doorW) / 4, 0.4 + H / 2, oz + D / 2], [0, Math.PI, 0]);
    kit.place(wall, G.corrugated((W - doorW) / 2, H, 0.06), [ox + (W + doorW) / 4, 0.4 + H / 2, oz + D / 2], [0, Math.PI, 0]);
    kit.place(wall, new THREE.BoxGeometry(doorW, 0.6, t), [ox, 0.4 + H - 0.3, oz + D / 2]);
    // Door frame, canopy with a drip edge, and the open door leaf.
    kit.place(dark, new THREE.BoxGeometry(doorW + 0.2, 0.1, t + 0.06), [ox, 0.4 + 2.2, oz + D / 2]);
    kit.place(trim, new THREE.BoxGeometry(0.06, 2.15, 0.9), [ox - doorW / 2 - 0.05, 0.4 + 1.07, oz + D / 2 + 0.45], [0, 0.9, 0]);
    kit.place(P.bright, new THREE.BoxGeometry(2.4, 0.06, 1.0), [ox, 0.4 + 2.42, oz + D / 2 + 0.5], [-0.13, 0, 0]);
    kit.place(P.bright, new THREE.BoxGeometry(2.4, 0.09, 0.05), [ox, 0.4 + 2.34, oz + D / 2 + 0.98]);
    for (const sx of [-1.05, 1.05]) {
      kit.add(P.bright, G.cable([ox + sx, 0.4 + 2.4, oz + D / 2 + 0.9], [ox + sx, 0.4 + 2.9, oz + D / 2 + 0.16], 0.02, 0.02, 4));
    }
    A.wall(R.authorised, 0.55, 0.4, [ox + doorW / 2 + 0.5, 1.95, oz + D / 2 + 0.045], [0, 0, 0]);
    A.wall(R.shelterPlate, 1.5, 0.42, [ox - 3.4, 2.5, oz + D / 2 + 0.045], [0, 0, 0]);

    // North wall with the window band.
    kit.place(wall, G.corrugated(W, winSillY, 0.06), [ox, 0.4 + winSillY / 2, oz - D / 2]);
    kit.place(wall, G.corrugated(W, H - winSillY - winH, 0.06), [ox, 0.4 + winSillY + winH + (H - winSillY - winH) / 2, oz - D / 2]);
    kit.place(wall, new THREE.BoxGeometry((W - winW) / 2, winH, t), [ox - (W + winW) / 4, 0.4 + winSillY + winH / 2, oz - D / 2]);
    kit.place(wall, new THREE.BoxGeometry((W - winW) / 2, winH, t), [ox + (W + winW) / 4, 0.4 + winSillY + winH / 2, oz - D / 2]);
    kit.place(P.glass, new THREE.BoxGeometry(winW, winH, 0.04), [ox, 0.4 + winSillY + winH / 2, oz - D / 2]);
    for (let i = 1; i < 4; i++) {
      kit.place(dark, new THREE.BoxGeometry(0.07, winH, 0.16), [ox - winW / 2 + (winW * i) / 4, 0.4 + winSillY + winH / 2, oz - D / 2]);
    }
    // Cill and head flashings, plus a sun hood over the glass.
    kit.place(dark, new THREE.BoxGeometry(winW + 0.2, 0.1, 0.34), [ox, 0.4 + winSillY - 0.05, oz - D / 2 - 0.06]);
    kit.place(dark, new THREE.BoxGeometry(winW + 0.2, 0.1, 0.34), [ox, 0.4 + winSillY + winH + 0.05, oz - D / 2 - 0.06]);
    kit.place(P.bright, new THREE.BoxGeometry(winW + 0.6, 0.05, 0.85), [ox, 0.4 + winSillY + winH + 0.28, oz - D / 2 - 0.42], [0.2, 0, 0]);

    // East / west walls.
    kit.place(wall, G.corrugated(D, H, 0.06), [ox - W / 2, 0.4 + H / 2, oz], [0, Math.PI / 2, 0]);
    kit.place(wall, G.corrugated(D, H, 0.06), [ox + W / 2, 0.4 + H / 2, oz], [0, -Math.PI / 2, 0]);
    // Welded stiffener seams at the panel joints.
    for (const sx of [-W / 2 - 0.01, W / 2 + 0.01]) {
      for (const sz of [-2.6, 0, 2.6]) {
        kit.place(P.bright, new THREE.BoxGeometry(0.05, H - 0.2, 0.07), [ox + sx, 0.4 + H / 2, oz + sz]);
      }
    }
    ventPanel(this.kit, [ox - W / 2 - 0.08, 2.6, oz - 2.4], 1.0, 0.7, -Math.PI / 2);
    ventPanel(this.kit, [ox - W / 2 - 0.08, 2.6, oz + 2.4], 1.0, 0.7, -Math.PI / 2);

    // Roof: capping, drip rail all round, downpipes at the corners.
    kit.place(trim, new THREE.BoxGeometry(W + 0.9, 0.24, D + 0.9), [ox, 0.4 + H + 0.12, oz]);
    kit.place(P.bright, new THREE.BoxGeometry(W + 1.2, 0.1, 0.12), [ox, 0.4 + H + 0.26, oz - (D + 0.9) / 2]);
    kit.place(P.bright, new THREE.BoxGeometry(W + 1.2, 0.1, 0.12), [ox, 0.4 + H + 0.26, oz + (D + 0.9) / 2]);
    for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      const px = ox + sx * (W / 2 + 0.4);
      const pz = oz + sz * (D / 2 + 0.4);
      kit.place(P.bright, new THREE.CylinderGeometry(0.06, 0.06, H + 0.2, 6), [px, 0.4 + (H + 0.2) / 2, pz]);
      kit.place(P.bright, new THREE.CylinderGeometry(0.07, 0.07, 0.3, 6), [px, 0.5, pz + sz * 0.12], [0.5 * sz, 0, 0]);
    }
    kit.place(dark, G.railing(W - 0.6, D - 0.6, 0.85), [ox, 0.4 + H + 0.24, oz]);
    kit.place(M.painted('#7d8175', { repeat: 1.4 }), G.roundedBox(1.6, 0.9, 1.2, 0.06), [ox + 4.2, 0.4 + H + 0.7, oz + 1.4]);
    kit.place(dark, new THREE.CylinderGeometry(0.5, 0.5, 0.34, 12), [ox + 4.2, 0.4 + H + 1.32, oz + 1.4]);
    kit.place(dark, G.roundedBox(1.1, 0.5, 0.8, 0.04), [ox - 5.2, 0.4 + H + 0.5, oz - 1.6]);
    kit.place(M.metal('#8b8f88', 0.4, 0.9), G.ladder(H + 0.6, 0.4), [ox + W / 2 + 0.22, 0.4, oz + 2.6], [0, -Math.PI / 2, 0]);

    // Roof-mounted satellite terminals: one big dish, one small VSAT.
    const bigDish = new THREE.SphereGeometry(1.5, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.42);
    bigDish.scale(1, 0.42, 1);
    kit.place(P.pale, bigDish, [ox - 2.4, 0.4 + H + 1.5, oz + 1.0], [Math.PI * 0.66, 0.5, 0]);
    kit.place(P.bright, new THREE.CylinderGeometry(0.06, 0.06, 1.4, 6), [ox - 2.4, 0.4 + H + 1.5, oz + 0.4], [Math.PI * 0.66, 0.5, 0]);
    kit.place(dark, new THREE.CylinderGeometry(0.06, 0.06, 0.9, 6), [ox - 2.4, 0.4 + H + 0.62, oz + 1.0]);
    kit.place(dark, new THREE.BoxGeometry(0.9, 0.1, 0.9), [ox - 2.4, 0.4 + H + 0.28, oz + 1.0]);
    const smallDish = new THREE.SphereGeometry(0.55, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.42);
    smallDish.scale(1, 0.45, 1);
    kit.place(P.pale, smallDish, [ox + 6.2, 0.4 + H + 1.0, oz - 1.6], [Math.PI * 0.6, -0.4, 0]);
    kit.place(dark, new THREE.CylinderGeometry(0.04, 0.04, 0.8, 6), [ox + 6.2, 0.4 + H + 0.6, oz - 1.6]);

    // Roof whip antennas.
    for (let i = 0; i < 3; i++) {
      kit.place(
        dark,
        new THREE.CylinderGeometry(0.014, 0.007, 2.6 + i * 0.4, 5),
        [ox - 6.4 + i * 0.5, 0.4 + H + 1.6 + i * 0.2, oz + 2.8],
        [0.04 * i, 0, 0.05 * (i - 1)]
      );
    }

    // Weather mast on the roof.
    weatherMast(kit, [ox + 7.0, 0.4 + H + 0.24, oz + 3.0], 3.4);

    // A/C condensers, conduit and cable bundles on the east wall.
    kit.place(dark, G.roundedBox(1.0, 0.8, 0.5, 0.04), [ox + W / 2 + 0.3, 1.4, oz - 2.2]);
    kit.place(dark, G.roundedBox(1.0, 0.8, 0.5, 0.04), [ox + W / 2 + 0.3, 1.4, oz - 0.9]);
    for (const cz of [-2.2, -0.9]) {
      kit.place(P.bright, new THREE.TorusGeometry(0.3, 0.02, 5, 14), [ox + W / 2 + 0.56, 1.4, oz + cz], [0, Math.PI / 2, 0]);
    }
    conduitRun(kit, [
      [ox + W / 2 + 0.2, 0.6, oz - 2.6],
      [ox + W / 2 + 0.2, 2.9, oz - 2.6],
      [ox + W / 2 + 0.2, 2.9, oz + 1.2],
      [ox + W / 2 + 0.2, 1.3, oz + 1.2]
    ]);
    junctionBox(kit, [ox + W / 2 + 0.28, 1.05, oz + 1.2], 0, 0.32);
    A.wall(R.highVoltage, 0.3, 0.38, [ox + W / 2 + 0.46, 1.05, oz + 1.62], [0, 0, 0]);
    cableRun(kit, [ox + W / 2 + 0.3, 1.05, oz - 2.2], [ox + W / 2 + 0.3, 0.5, oz + 1.5], rng, { sag: 0.5, strands: 4 });

    // Sandbags and drifted sand around the entrance.
    sandbagWall(kit, [ox - W / 2 - 1.6, 0.4, oz + D / 2 + 1.4], [ox - 1.6, 0.4, oz + D / 2 + 1.4], rng, 3);
    sandbagWall(kit, [ox + 1.6, 0.4, oz + D / 2 + 1.4], [ox + W / 2 + 1.6, 0.4, oz + D / 2 + 1.4], rng, 3);
    sandDrift(kit, P.sandbag, [ox - W / 2 - 1.2, 0.02, oz - D / 2], [ox - W / 2 - 1.2, 0.02, oz + D / 2], rng, { height: 0.55, reach: 2.0 });

    // Fire point and a boot-scrape grate by the door.
    firePoint(kit, [ox + 3.2, 0.4, oz + D / 2 + 1.0], Math.PI);
    kit.place(P.bright, new THREE.BoxGeometry(0.8, 0.05, 0.5), [ox, 0.42, oz + D / 2 + 1.1]);

    // Camouflage netting over the west end, on poles.
    camoNetSpan(kit, ox - W / 2 - 4.6, 3.4, oz, 8.0, 9.0, 0, { sag: 0.9 });

    // ---- interior ----
    this._buildConsole(kit, ox, oz, D);
    this.slabKit.place(P.concreteFine, new THREE.BoxGeometry(W - 0.5, 0.06, D - 0.5), [ox, 0.42, oz]);

    equipmentStack(kit, [ox + 5.4, 0.45, oz + 2.4], rng, 3, 0.3);
    kit.place(M.painted('#4a4e42', { repeat: 1 }), G.roundedBox(0.8, 1.9, 0.6, 0.05), [ox - 6.6, 0.45 + 0.95, oz + 2.6], [0, 0.2, 0]);
    kit.place(dark, G.roundedBox(1.4, 0.75, 0.7, 0.04), [ox + 6.2, 0.45 + 0.38, oz - 2.4]);

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
    const P = palette();
    const dark = P.dark;
    const body = P.console;
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
        [ox + s.x + Math.sin(s.yaw) * 0.06, 1.72, zFront - 0.24],
        [-0.22, s.yaw, 0]
      );
    }

    // Keyboard trays and a bank of covered switches.
    kit.place(dark, G.roundedBox(1.1, 0.04, 0.36, 0.02), [ox - 0.9, 1.24, zFront - 0.28], [-0.12, 0, 0]);
    kit.place(dark, G.roundedBox(1.1, 0.04, 0.36, 0.02), [ox + 0.9, 1.24, zFront - 0.28], [-0.12, 0, 0]);
    for (let i = 0; i < 8; i++) {
      kit.place(P.hazard, new THREE.BoxGeometry(0.09, 0.05, 0.09), [ox - 0.35 + i * 0.1, 1.25, zFront + 0.24]);
    }

    // Holo radar plinth in the middle of the desk.
    kit.place(dark, new THREE.CylinderGeometry(0.62, 0.72, 0.14, 24), [ox, 1.29, zFront - 0.05]);
    kit.place(M.metal('#2a2d29', 0.4, 0.9), new THREE.TorusGeometry(0.64, 0.03, 8, 32), [ox, 1.36, zFront - 0.05], [Math.PI / 2, 0, 0]);
    this.holoAnchor = new THREE.Vector3(ox, 1.38, zFront - 0.05);

    // Overhead light bar.
    kit.place(dark, new THREE.BoxGeometry(6.0, 0.1, 0.3), [ox, 3.55, zFront + 0.3]);
    kit.place(M.lamp('#cfe6ff', 1.6), new THREE.BoxGeometry(5.6, 0.05, 0.18), [ox, 3.5, zFront + 0.3]);

    // Chair.
    kit.place(dark, new THREE.CylinderGeometry(0.32, 0.36, 0.08, 12), [ox, 0.52, zFront + 1.5]);
    kit.place(dark, new THREE.CylinderGeometry(0.05, 0.05, 0.4, 8), [ox, 0.72, zFront + 1.5]);
    kit.place(P.soft, G.roundedBox(0.52, 0.1, 0.5, 0.05), [ox, 0.95, zFront + 1.5]);
    kit.place(P.soft, G.roundedBox(0.52, 0.6, 0.1, 0.05), [ox, 1.28, zFront + 1.74], [0.16, 0, 0]);
  }

  /* ---------------------------------------------------- radar station */
  _buildRadarStation() {
    const kit = this.kit;
    const P = palette();
    const A = this.marks;
    const R = this._regions;
    const rng = this.rng.fork('radar');
    const a = this.anchors.radar;
    const ox = a.pos.x;
    const oz = a.pos.z;
    const yaw = a.yaw;
    const c = Math.cos(yaw);
    const s = Math.sin(yaw);
    const L = (lx, ly, lz) => [ox + lx * c + lz * s, ly, oz - lx * s + lz * c];

    // Trailer chassis with outriggers.
    this.slabKit.place(P.concreteFine, new THREE.BoxGeometry(13, 0.3, 9), [ox, 0.15, oz], [0, yaw, 0]);
    kit.place(P.dark, new THREE.BoxGeometry(9.5, 0.5, 3.0), [ox, 0.85, oz], [0, yaw, 0]);
    kit.place(P.equip, G.roundedBox(6.5, 1.9, 2.8, 0.08), [ox - 1.2, 2.05, oz], [0, yaw, 0]);

    // Equipment shelter detail: vents, connector panel, tie-down rings.
    ventPanel(kit, L(-4.3, 2.2, 1.42), 1.1, 0.8, yaw);
    kit.place(P.dark, new THREE.BoxGeometry(1.2, 0.9, 0.1), L(1.0, 2.1, 1.44), [0, yaw, 0]);
    for (let i = 0; i < 8; i++) {
      kit.place(
        P.bright,
        new THREE.CylinderGeometry(0.05, 0.05, 0.1, 8),
        L(0.55 + (i % 4) * 0.3, 2.3 - Math.floor(i / 4) * 0.34, 1.5),
        [Math.PI / 2, yaw, 0]
      );
    }
    A.wall(R.rfHazard, 1.1, 0.55, L(-1.2, 2.75, 1.46), [0, yaw, 0]);
    for (const [lx, lz] of [[-4.0, -1.4], [-4.0, 1.4], [1.6, -1.4], [1.6, 1.4]]) {
      kit.place(P.bright, new THREE.TorusGeometry(0.07, 0.018, 5, 10), L(lx, 1.16, lz), [Math.PI / 2, yaw, 0]);
    }
    // Ladder and grab rails up to the roof of the shelter.
    kit.place(P.bright, G.ladder(2.1, 0.36), L(2.05, 1.1, 0), [0, yaw + Math.PI / 2, 0]);
    kit.place(P.bright, G.railing(6.2, 2.6, 0.7), L(-1.2, 3.0, 0), [0, yaw, 0]);

    // Outriggers with jack pads.
    for (const sx of [-4.4, 4.4]) {
      for (const sz of [-1.7, 1.7]) {
        kit.place(P.dark, new THREE.CylinderGeometry(0.1, 0.1, 0.7, 8), L(sx, 0.5, sz));
        kit.place(P.chrome, new THREE.CylinderGeometry(0.06, 0.06, 0.35, 8), L(sx, 0.28, sz));
        kit.place(P.bright, new THREE.BoxGeometry(0.55, 0.12, 0.55), L(sx, 0.2, sz), [0, yaw, 0]);
        kit.place(P.dark, new THREE.BoxGeometry(0.7, 0.06, 0.7), L(sx, 0.1, sz), [0, yaw, 0]);
      }
    }
    // Drawbar and lunette eye at the front.
    kit.place(P.dark, new THREE.BoxGeometry(2.2, 0.22, 0.3), L(5.7, 0.85, 0), [0, yaw, 0]);
    kit.place(P.bright, new THREE.TorusGeometry(0.16, 0.05, 6, 14), L(6.9, 0.85, 0), [0, yaw, Math.PI / 2]);
    kit.place(P.bright, new THREE.CylinderGeometry(0.05, 0.05, 0.7, 6), L(5.2, 0.5, 0.5), [0.3, yaw, 0]);

    // Wheels with mud flaps and chocks.
    const wheel = new THREE.CylinderGeometry(0.7, 0.7, 0.5, 14);
    wheel.rotateX(Math.PI / 2);
    for (const sx of [-3.2, -1.8, 3.0]) {
      for (const sz of [-1.6, 1.6]) {
        kit.place(M.rubberMat(1.2), wheel, L(sx, 0.7, sz), [0, yaw, 0]);
        kit.place(P.bright, new THREE.CylinderGeometry(0.2, 0.2, 0.52, 8), L(sx, 0.7, sz), [Math.PI / 2, yaw, 0]);
      }
    }
    for (const sz of [-1.6, 1.6]) {
      wheelChock(kit, L(-3.95, 0.3, sz), yaw);
      kit.place(P.rubber, new THREE.BoxGeometry(0.04, 0.4, 0.55), L(3.75, 0.5, sz), [0, yaw, 0]);
    }

    // Waveguide run from the shelter up to the pedestal.
    conduitRun(kit, [L(-1.2, 3.05, -0.9), L(-1.2, 3.4, -0.9), L(-1.2, 3.4, -0.2)], 0.07, P.pale);

    // Cooling and power skids beside the trailer, under a net.
    generatorUnit(kit, [ox - 7.0, 0.3, oz + 3.0], yaw + 0.2);
    generatorUnit(kit, [ox - 7.0, 0.3, oz - 3.2], yaw - 0.15);
    camoNetSpan(kit, ox - 7.2, 3.1, oz, 6.5, 10.0, yaw, { sag: 0.7 });
    cableRun(kit, [ox - 5.6, 1.1, oz + 3.0], [ox - 2.6, 0.95, oz + 1.2], rng, { strands: 4, sag: 0.55 });
    A.wall(R.fuelPlate, 0.9, 0.45, [ox - 8.6, 1.4, oz + 3.0], [0, yaw + Math.PI / 2, 0]);

    // Drum bund and a cable reel beside the skids.
    pallet(kit, [ox - 10.5, 0.3, oz + 1.4], yaw + 0.4, rng, { load: 'drums' });
    cableReel(kit, [ox - 10.6, 0.3, oz - 2.4], yaw, true);

    // ---- rotating array (separate group so it can spin) ----
    const arrKit = new Kit();
    const arrayW = 5.2;
    const arrayH = 4.0;
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
    arrKit.place(P.bright, new THREE.BoxGeometry(arrayW + 0.2, 0.14, 0.6), [0, arrayH + 0.05, -0.1]);
    arrKit.place(P.bright, new THREE.BoxGeometry(arrayW + 0.2, 0.14, 0.6), [0, -0.05, -0.1]);
    // Maintenance walkway and rail across the back of the array.
    arrKit.place(P.bright, new THREE.BoxGeometry(arrayW + 0.4, 0.06, 0.7), [0, 0.35, 0.7]);
    arrKit.place(P.dark, G.railing(arrayW + 0.4, 0.7, 0.8), [0, 0.38, 0.7]);
    // Tilt actuators and stiffening ribs behind the array.
    for (const sx of [-1.5, 1.5]) {
      arrKit.place(P.chrome, new THREE.CylinderGeometry(0.05, 0.05, 1.6, 8), [sx, 1.1, 0.55], [0.5, 0, 0]);
      arrKit.place(P.dark, new THREE.CylinderGeometry(0.1, 0.1, 1.1, 10), [sx, 0.55, 0.85], [0.5, 0, 0]);
    }
    for (const sy of [1.1, 2.4, 3.4]) {
      arrKit.place(P.dark, new THREE.BoxGeometry(arrayW - 0.2, 0.1, 0.22), [0, sy, 0.28]);
    }
    // Obstruction beacon on the array head.
    arrKit.place(this.beaconMatA, new THREE.SphereGeometry(0.11, 10, 8), [0, arrayH + 0.22, -0.1]);
    const arrayGroup = arrKit.build('radar-array');
    // Mount the array on a yoke that rotates.
    const yokeKit = new Kit();
    yokeKit.place(M.painted('#5b5f54', { repeat: 1.6 }), new THREE.CylinderGeometry(1.05, 1.25, 0.55, 18), [0, 0.28, 0]);
    yokeKit.place(M.metal('#7d817a', 0.45, 0.9), new THREE.BoxGeometry(0.3, 1.5, 0.3), [-1.6, 1.3, 0]);
    yokeKit.place(M.metal('#7d817a', 0.45, 0.9), new THREE.BoxGeometry(0.3, 1.5, 0.3), [1.6, 1.3, 0]);
    const yoke = yokeKit.build('radar-yoke');
    arrayGroup.position.set(0, 1.1, 0);
    arrayGroup.rotation.x = 0.3;
    yoke.add(arrayGroup);
    yoke.position.set(ox - 1.2, 3.0, oz);
    this.group.add(yoke);
    this.animated.radarArray = yoke;
    this.animated.radarArrayFace = arrayGroup;

    // ---- secondary rotating dish on a mast ----
    const mastKit = new Kit();
    mastKit.place(M.metal('#767a72', 0.5, 0.85), G.truss(7.5, 0.7), [0, 0, 0]);
    mastKit.place(this.beaconMatB, new THREE.SphereGeometry(0.13, 10, 8), [0, 9.1, 0]);
    const mast = mastKit.build('radar-mast');
    mast.position.set(ox + 5.4, 0.3, oz);
    this.group.add(mast);
    this._beaconsB.push({ pos: [ox + 5.4, 9.4, oz] });

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

    antennaMast(kit, [ox + 9.5, 0.3, oz - 4.5], 11, yaw, this._beaconsA);

    this.collision.addBox(ox - 1.2, 1.8, oz, 3.6, 1.8, 1.8, yaw, 'radar');
    this.collision.addBox(ox + 5.4, 3.5, oz, 0.6, 3.5, 0.6, 0, 'radar-mast');
    this.collision.addBox(ox, 0.16, oz, 6.5, 0.16, 4.5, yaw, 'radar-pad');
  }

  /* ---------------------------------------------------- support area */
  _buildSupportArea() {
    const kit = this.kit;
    const P = palette();
    const A = this.marks;
    const R = this._regions;
    const rng = this.rng.fork('support');
    const q = settings.quality;

    // Vehicle park east of the shelter.
    supportTruck(kit, [26, 0.24, 46], -0.35, { variant: 'desert' });
    supportTruck(kit, [34, 0.24, 44], -0.2, { variant: 'olive' });
    supportTruck(kit, [-36, 0.24, 54], 1.9, { variant: 'desert', tilt: false });
    supportTruck(kit, [-70, 0.24, 26], 0.6, { variant: 'olive' });
    this.collision.addBox(26, 1.4, 46, 3.4, 1.4, 1.4, -0.35, 'truck');
    this.collision.addBox(34, 1.4, 44, 3.4, 1.4, 1.4, -0.2, 'truck');
    this.collision.addBox(-36, 1.4, 54, 3.4, 1.4, 1.4, 1.9, 'truck');
    this.collision.addBox(-70, 1.4, 26, 3.4, 1.4, 1.4, 0.6, 'truck');
    // Netting over the two parked trucks.
    camoNetSpan(kit, 30, 3.6, 45, 13, 9, -0.28, { sag: 0.85 });

    // Generator farm + fuel bladders.
    generatorUnit(kit, [-26, 0.24, 30], 0.1);
    generatorUnit(kit, [-26, 0.24, 25.5], 0.1);
    generatorUnit(kit, [-26, 0.24, 21], 0.1);
    this.collision.addBox(-26, 1.1, 25.5, 2.0, 1.1, 6.5, 0, 'generators');
    cableRun(kit, [-24.4, 1.2, 25.5], [-15.6, 0.9, 32], rng, { strands: 5, sag: 0.7 });
    // The heavy feeders run to the shelter in a tray on stanchions.
    cableTray(kit, [-27.8, 1.5, 27], [-49.5, 1.5, 36], rng);
    A.wall(R.highVoltage, 0.34, 0.42, [-24.2, 1.5, 32.4], [0, 0.1, 0]);

    // Fuel: a bladder on a bunded stand, with signage and a delivery point.
    const fuel = new THREE.CylinderGeometry(1.5, 1.5, 5.4, 18);
    fuel.rotateZ(Math.PI / 2);
    kit.place(M.painted('#5a5f4e', { repeat: 1.6, panels: 3 }), fuel, [-34, 1.74, 27], [0, 0.1, 0]);
    kit.place(P.dark, new THREE.BoxGeometry(6.0, 0.3, 3.4), [-34, 0.39, 27], [0, 0.1, 0]);
    kit.place(P.dark, new THREE.BoxGeometry(6.4, 0.5, 0.16), [-34, 0.45, 25.1], [0, 0.1, 0]);
    kit.place(P.dark, new THREE.BoxGeometry(6.4, 0.5, 0.16), [-34, 0.45, 28.9], [0, 0.1, 0]);
    kit.place(P.signalRed, new THREE.BoxGeometry(0.5, 0.8, 0.5), [-31.0, 0.9, 28.6], [0, 0.1, 0]);
    kit.add(P.hose, G.cable([-31.0, 1.2, 28.6], [-32.6, 1.5, 27.6], 0.3, 0.05, 8));
    A.wall(R.fuelPlate, 1.2, 0.62, [-34, 2.1, 24.9], [0, 0.1, 0]);
    firePoint(kit, [-30.6, 0.24, 25.4], 0.6);
    this.collision.addBox(-34, 1.7, 27, 3.0, 1.7, 1.6, 0.1, 'fuel');

    // Gabion revetment shielding the fuel and power plant from the pads.
    gabionWall(kit, this.collision, [-39.5, 0.24, 32.5], [-21.5, 0.24, 32.5], { h: 1.6 });
    gabionWall(kit, this.collision, [-39.5, 0.24, 32.5], [-39.5, 0.24, 21.5], { h: 1.6 });
    sandDrift(kit, P.sandbag, [-39.5, 0.26, 32.5], [-21.5, 0.26, 32.5], rng, { height: 0.5, reach: 1.7 });

    // Antenna field.
    antennaMast(kit, [-52, 0.24, 24], 12, 0.4, this._beaconsA);
    antennaMast(kit, [-58, 0.24, 30], 8, -0.3, this._beaconsB);
    this.collision.addBox(-52, 3, 24, 0.5, 3, 0.5, 0, 'mast');
    this.collision.addBox(-58, 2.4, 30, 0.45, 2.4, 0.45, 0, 'mast');

    // Equipment cases, pallets and drums around the working areas.
    for (const p of [
      [-16, 0.24, 26], [-13, 0.24, 27.5], [18, 0.24, 30], [21, 0.24, 28],
      [-46, 0.24, -6], [40, 0.24, -8], [4, 0.24, -46]
    ]) {
      equipmentStack(kit, p, rng, 2 + rng.int(0, 3), rng.float() * Math.PI);
      this.collision.addBox(p[0], 0.7, p[2], 0.9, 0.7, 0.7, 0, 'cases');
    }
    const palletSpots = [
      [-19.5, 0.24, 30.5, 'crate'], [-17.5, 0.24, 32.6, 'drums'], [17, 0.24, 33.5, 'drums'],
      [23.5, 0.24, 31.5, 'crate'], [-44, 0.24, -2.5, 'drums'], [43, 0.24, -4.5, 'crate'],
      [7.5, 0.24, -43, 'crate']
    ];
    for (const [px, py, pz, load] of palletSpots) {
      pallet(kit, [px, py, pz], rng.float() * Math.PI, rng, { load });
      this.collision.addBox(px, 0.5, pz, 0.7, 0.5, 0.6, 0, 'pallet');
    }
    if (q.groundDetail >= 0.6) {
      cableReel(kit, [-14.5, 0.24, 33], 0, false);
      cableReel(kit, [20.5, 0.24, 36], 0, true);
    }

    // Jersey barriers guiding the road onto the apron.
    const barrier = jerseyBarrier(3.0);
    const barrMat = M.concreteMat(2);
    const barrierRow = (x1, z1, x2, z2, n, drift = true) => {
      for (let i = 0; i < n; i++) {
        const t = n === 1 ? 0.5 : i / (n - 1);
        const x = lerp(x1, x2, t);
        const z = lerp(z1, z2, t);
        const yaw = Math.atan2(x2 - x1, z2 - z1);
        // A little settle and lean so the row is not machine-perfect.
        kit.place(barrMat, barrier, [x, 0.24 + rng.spread(0.02), z], [rng.spread(0.02), yaw + Math.PI / 2 + rng.spread(0.03), rng.spread(0.02)]);
        // Lifting eyes and a reflective plate on the traffic face.
        for (const ez of [-0.9, 0.9]) {
          const off = new THREE.Vector3(0, 0, ez).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw + Math.PI / 2);
          kit.place(P.bright, new THREE.TorusGeometry(0.06, 0.015, 5, 8), [x + off.x, 1.16, z + off.z], [0, yaw, 0]);
        }
        this.collision.addBox(x, 0.72, z, 0.35, 0.5, 1.5, yaw + Math.PI / 2, 'barrier');
      }
      if (drift) {
        sandDrift(kit, P.sandbag, [x1, 0.03, z1], [x2, 0.03, z2], rng, { height: 0.34, reach: 1.3 });
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
      const heads = floodlightMast(kit, p, 10 + rng.float() * 2, rng.float() * Math.PI, this._beaconsA);
      this.animated.floodlights.push(...heads);
      this.collision.addBox(p[0], 1.2, p[2], 0.35, 1.2, 0.35, 0, 'mast');
    }

    // Windsock on a pole - a readable cue for the wind direction.
    const sockKit = new Kit();
    sockKit.place(M.metal('#8b8f88', 0.5, 0.85), new THREE.CylinderGeometry(0.07, 0.09, 6, 8), [0, 3, 0]);
    sockKit.place(M.metal('#8b8f88', 0.5, 0.85), new THREE.TorusGeometry(0.42, 0.025, 5, 14), [1.2, 6, 0], [0, 0, Math.PI / 2]);
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

    // Muster point and a shaded rest area south of the apron.
    camoNetSpan(kit, -22, 3.0, 52, 8, 7, 0.2, { sag: 0.7 });
    for (const [bx, bz] of [[-24, 51], [-20, 53]]) {
      kit.place(P.crate, new THREE.BoxGeometry(2.2, 0.1, 0.42), [bx, 0.72, bz], [0, 0.2, 0]);
      for (const sx of [-0.9, 0.9]) {
        kit.place(P.dark, new THREE.BoxGeometry(0.1, 0.6, 0.4), [bx + sx, 0.42, bz], [0, 0.2, 0]);
      }
    }

    // A weather station and site noticeboard by the walk-up from the gate.
    const wm = weatherMast(kit, [2, 0.24, 56], 4.6);
    const cups = anemometerHead();
    cups.position.set(wm.hub[0], wm.hub[1], wm.hub[2]);
    this.group.add(cups);
    this.animated.anemometer = cups;
    kit.place(P.steel, new THREE.CylinderGeometry(0.05, 0.05, 2.0, 6), [-9.4, 1.0, 58]);
    kit.place(P.steel, new THREE.CylinderGeometry(0.05, 0.05, 2.0, 6), [-7.4, 1.0, 58]);
    kit.place(P.crate, new THREE.BoxGeometry(2.4, 1.2, 0.08), [-8.4, 1.6, 58]);
    A.wall(R.restricted, 1.0, 0.5, [-8.9, 1.75, 57.94], [0, Math.PI, 0]);
    A.wall(R.authorised, 0.8, 0.5, [-7.9, 1.75, 57.94], [0, Math.PI, 0]);
  }

  /* ---------------------------------------------------- perimeter */
  _buildPerimeter() {
    const kit = this.kit;
    const P = palette();
    const A = this.marks;
    const R = this._regions;
    const rng = this.rng.fork('fence');
    const postMat = M.metal('#7b7f78', 0.55, 0.85);
    const meshMat = P.chain;
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
        // Concrete footing at every post.
        kit.place(P.concreteFine, new THREE.CylinderGeometry(0.16, 0.2, 0.24, 8), [x, gy + 0.08, z]);
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
        kit.place(meshMat, new THREE.PlaneGeometry(panelLen, H), [mx, gy + H / 2, mz], [0, yaw + Math.PI / 2, 0]);
      }
      // Top rail, tension wire and three strands of barbed wire.
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
      const rail = new THREE.CylinderGeometry(0.028, 0.028, len, 6);
      rail.rotateX(Math.PI / 2);
      kit.place(postMat, rail, [(x1 + x2) / 2, groundHeight((x1 + x2) / 2, (z1 + z2) / 2) + H - 0.03, (z1 + z2) / 2], [0, yaw, 0]);
      // Sand piles up on the windward side of every long run.
      sandDrift(kit, P.sandbag, [x1, groundHeight(x1, z1) + 0.02, z1], [x2, groundHeight(x2, z2) + 0.02, z2], rng, {
        height: 0.42,
        reach: 1.9
      });
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

    // Gate house, boom barrier and a sliding gate leaf at the south entrance.
    const gx = c.x - 4;
    const gz = c.z + half.z;
    const ggy = groundHeight(gx - 6, gz);
    kit.place(M.painted('#6b6f60', { repeat: 1.6 }), G.roundedBox(2.4, 2.6, 2.4, 0.06), [gx - 6, ggy + 1.3, gz]);
    kit.place(M.glassMat('#16282c', 0.35), new THREE.BoxGeometry(1.9, 0.9, 0.05), [gx - 6, ggy + 1.8, gz - 1.22]);
    kit.place(P.bright, new THREE.BoxGeometry(3.0, 0.1, 3.0), [gx - 6, ggy + 2.7, gz]);
    kit.place(P.dark, new THREE.CylinderGeometry(0.32, 0.32, 0.26, 12), [gx - 6, ggy + 2.9, gz]);
    A.wall(R.restricted, 0.9, 0.45, [gx - 6, ggy + 2.2, gz + 1.24], [0, Math.PI, 0]);
    kit.place(P.hazard, new THREE.CylinderGeometry(0.07, 0.07, 7, 8), [gx, groundHeight(gx, gz) + 1.1, gz], [0, 0, Math.PI / 2]);
    kit.place(P.dark, new THREE.BoxGeometry(0.4, 1.2, 0.4), [gx - 3.4, groundHeight(gx - 3.4, gz) + 0.6, gz]);
    // Counterweight and a support cradle for the boom.
    kit.place(P.dark, new THREE.CylinderGeometry(0.22, 0.22, 0.3, 10), [gx - 3.9, groundHeight(gx - 3.9, gz) + 1.1, gz], [0, 0, Math.PI / 2]);
    kit.place(P.steel, new THREE.CylinderGeometry(0.05, 0.06, 1.0, 6), [gx + 3.2, groundHeight(gx + 3.2, gz) + 0.5, gz]);
    // Sliding gate leaf, parked open, with diagonal bracing.
    const leafX = gx + 8;
    const lgy = groundHeight(leafX, gz);
    kit.place(postMat, new THREE.BoxGeometry(6.0, 0.09, 0.09), [leafX, lgy + 2.4, gz]);
    kit.place(postMat, new THREE.BoxGeometry(6.0, 0.09, 0.09), [leafX, lgy + 0.2, gz]);
    for (let i = 0; i <= 6; i++) {
      kit.place(postMat, new THREE.BoxGeometry(0.07, 2.2, 0.07), [leafX - 3 + i, lgy + 1.3, gz]);
    }
    kit.place(meshMat, new THREE.PlaneGeometry(6.0, 2.2), [leafX, lgy + 1.3, gz], [0, Math.PI / 2, 0]);
    kit.place(postMat, new THREE.BoxGeometry(6.4, 0.06, 0.06), [leafX, lgy + 1.3, gz], [0, 0, 0.35]);

    // Warning signage every so often on the fence line.
    for (let i = 0; i < 12; i++) {
      const t = i / 12;
      const ang = t * Math.PI * 2;
      const x = c.x + Math.cos(ang) * half.x * 0.98;
      const z = c.z + Math.sin(ang) * half.z * 0.98;
      const yaw = Math.atan2(c.x - x, c.z - z);
      A.wall(i % 3 === 0 ? R.rfHazard : R.restricted, 1.1, 0.55, [x, groundHeight(x, z) + 1.5, z], [0, yaw, 0]);
    }

    this.collision.addBox(gx - 6, 1.3, gz, 1.2, 1.3, 1.2, 0, 'gatehouse');
  }

  /* ---------------------------------------------------- painted markings */
  _buildMarkings() {
    const A = this.marks;
    const R = this._regions;
    const APRON_Y = 0.253;
    const PAD_Y = 0.445;

    // --- site identity, read walking in from the gate ---
    A.ground(R.siteName, 22, 7, -4, 50, 0, { y: APRON_Y });

    // --- taxiway centre line up the apron, with hold-short bars ---
    for (let i = 0; i < 26; i++) {
      A.ground(R.dash, 0.5, 3.4, -4, 62 - i * 6.5, 0, { y: APRON_Y });
    }
    A.ground(R.holdShort, 14, 2.4, -4, 26, 0, { y: APRON_Y });
    A.ground(R.holdShortText, 6, 1.6, -4, 22.5, 0, { y: APRON_Y });

    // --- apron edge lines ---
    const edge = (x1, z1, x2, z2, yellow = false) => {
      const len = Math.hypot(x2 - x1, z2 - z1);
      const yaw = Math.atan2(x2 - x1, z2 - z1);
      const n = Math.ceil(len / 20);
      for (let i = 0; i < n; i++) {
        const t0 = (i + 0.5) / n;
        A.ground(yellow ? R.solidYellow : R.solid, 0.28, len / n + 0.02, lerp(x1, x2, t0), lerp(z1, z2, t0), yaw, {
          y: APRON_Y
        });
      }
    };
    edge(-96, 68, -96, -92);
    edge(88, 68, 88, -92);
    edge(-96, -92, 88, -92);

    // --- walkway from the gate up to the shelter and on to the radar ---
    const walkway = (pts) => {
      for (let i = 0; i < pts.length - 1; i++) {
        const [x1, z1] = pts[i];
        const [x2, z2] = pts[i + 1];
        const len = Math.hypot(x2 - x1, z2 - z1);
        const yaw = Math.atan2(x2 - x1, z2 - z1);
        const n = Math.ceil(len / 16);
        for (let k = 0; k < n; k++) {
          const t = (k + 0.5) / n;
          A.ground(R.walkway, 1.5, len / n + 0.02, lerp(x1, x2, t), lerp(z1, z2, t), yaw, { y: APRON_Y });
        }
      }
    };
    walkway([[-8, 62], [-8, 40], [-40, 40]]);
    walkway([[-8, 40], [-8, 20], [26, 20], [26, 12]]);

    // Directional arrows along the walkway and the vehicle route.
    A.ground(R.arrow, 1.6, 2.2, -8, 52, 0, { y: APRON_Y });
    A.ground(R.arrow, 1.6, 2.2, -8, 30, 0, { y: APRON_Y });
    A.ground(R.arrow, 1.6, 2.2, -30, 40, -Math.PI / 2, { y: APRON_Y });
    A.ground(R.arrow, 1.6, 2.2, 12, 20, Math.PI / 2, { y: APRON_Y });

    // --- per-pad marking scheme ---
    const padInfo = [
      ['patriot', R.padA, R.num1],
      ['thaad', R.padB, R.num2],
      ['sentinel', R.padC, R.num3]
    ];
    for (const [key, plate, num] of padInfo) {
      const a = this.anchors[key];
      const at = (dx, dz) => {
        const off = new THREE.Vector3(dx, 0, dz).applyAxisAngle(new THREE.Vector3(0, 1, 0), a.yaw);
        return [a.pos.x + off.x, a.pos.z + off.z];
      };
      let [px, pz] = at(0, 11.5);
      A.ground(plate, 11, 4.4, px, pz, a.yaw, { y: PAD_Y });
      [px, pz] = at(-11.5, 11.0);
      A.ground(num, 3.2, 4.8, px, pz, a.yaw, { y: PAD_Y });
      [px, pz] = at(0, -12.6);
      A.ground(R.danger, 10, 2.6, px, pz, a.yaw, { y: PAD_Y });

      // Hazard chevrons round the hardstand edge, tiled from one region.
      for (const [dx, dz, w, d, rot] of [
        [0, -14.4, 32, 1.2, 0],
        [0, 14.4, 32, 1.2, 0],
        [-16.4, 0, 30, 1.2, Math.PI / 2],
        [16.4, 0, 30, 1.2, Math.PI / 2]
      ]) {
        const n = Math.ceil(w / 4);
        for (let i = 0; i < n; i++) {
          const t = (i + 0.5) / n - 0.5;
          const along = t * w;
          const lx = rot === 0 ? along + dx : dx;
          const lz = rot === 0 ? dz : along + dz;
          const [cx, cz] = at(lx, lz);
          A.ground(R.chevron, w / n, d, cx, cz, a.yaw + rot, { y: PAD_Y });
        }
      }
      // Grounding studs at the pad corners, each with its painted ring.
      for (const [dx, dz] of [[-14, -12], [14, -12], [-14, 12], [14, 12]]) {
        const [cx, cz] = at(dx, dz);
        A.ground(R.earthRing, 1.1, 1.1, cx, cz, 0, { y: PAD_Y });
        this.kit.place(palette().bright, new THREE.CylinderGeometry(0.05, 0.05, 0.1, 8), [cx, PAD_Y + 0.03, cz]);
      }
      // Tie-down rings down the centre of the pad.
      for (const [dx, dz] of [[-6, -6], [6, -6], [-6, 6], [6, 6]]) {
        const [cx, cz] = at(dx, dz);
        this.kit.place(palette().dark, new THREE.BoxGeometry(0.34, 0.06, 0.34), [cx, PAD_Y + 0.02, cz]);
        this.kit.place(palette().bright, new THREE.TorusGeometry(0.1, 0.02, 5, 10), [cx, PAD_Y + 0.06, cz], [0.5, 0, 0]);
      }
    }

    // --- standalone plates around the operating area ---
    A.ground(R.danger, 10, 2.6, 18, 6, 0.4, { y: APRON_Y });
    A.ground(R.keepClear, 7, 2.2, 30, 4, -0.1, { y: APRON_Y });
    A.ground(R.noParking, 6, 2.4, 12, 44, 0, { y: APRON_Y });
    A.ground(R.speed, 3.2, 1.7, -10, 60, 0, { y: APRON_Y });
    A.ground(R.muster, 6, 2.4, -22, 52, 0.2, { y: APRON_Y });
    A.ground(R.firePointText, 5, 1.6, -30.6, 27.4, 0.6, { y: APRON_Y });
    A.ground(R.firePointText, 5, 1.6, -54.5, 46.5, 0, { y: APRON_Y });
    A.ground(R.keepClear, 7, 2.2, 34, 22, -0.14, { y: APRON_Y });

    // Vehicle bay outlines in the park.
    for (let i = 0; i < 4; i++) {
      const bx = 20 + i * 8;
      A.ground(R.solidYellow, 0.22, 12, bx, 46, 0, { y: APRON_Y });
    }
    A.ground(R.solidYellow, 0.22, 24, 24, 40, Math.PI / 2, { y: APRON_Y });
  }

  /* ---------------------------------------------------- ground dressing */

  /**
   * Everything outside the concrete: graded shoulders, tyre tracks, drainage,
   * scorch and drifted sand. All of the painted-on parts share the marking
   * atlas, so they cost nothing extra to draw.
   */
  _buildGroundDressing() {
    const A = this.marks;
    const R = this._regions;
    const P = palette();
    const rng = this.rng.fork('dressing');
    const q = settings.quality;

    // --- tyre tracks: the routes vehicles actually take round the site ---
    const routes = [
      [[-4, 108], [-4, 74], [-4, 62]],
      [[-4, 62], [26, 52], [30, 46]],
      [[-4, 62], [-30, 50], [-49, 44]],
      [[-8, 30], [16, 22], [30, 16]],
      [[-20, 34], [-26, 30], [-33, 28]],
      [[-4, 20], [-38, -8], [-52, -20]],
      [[-4, 20], [30, -10], [44, -28]],
      [[-4, 0], [-4, -40], [-4, -62]],
      [[-100, -12], [-140, 0], [-176, 14]]
    ];
    for (const route of routes) {
      for (let i = 0; i < route.length - 1; i++) {
        const [x1, z1] = route[i];
        const [x2, z2] = route[i + 1];
        const len = Math.hypot(x2 - x1, z2 - z1);
        const yaw = Math.atan2(x2 - x1, z2 - z1);
        const n = Math.max(1, Math.ceil(len / 12));
        for (let k = 0; k < n; k++) {
          const t = (k + 0.5) / n;
          const cx = lerp(x1, x2, t);
          const cz = lerp(z1, z2, t);
          const onSlab = Math.abs(cx + 4) < 98 && cz > -96 && cz < 72;
          A.ground(R.tyreTrack, 3.0, len / n + 0.4, cx, cz, yaw, {
            y: onSlab ? 0.251 : null,
            lift: 0.06,
            segs: onSlab ? 1 : 2
          });
        }
      }
    }

    // --- drifted sand streaks across the open ground and over the apron ---
    const streakCount = Math.floor(70 * clamp(q.groundDetail, 0.4, 1.4));
    for (let i = 0; i < streakCount; i++) {
      const ang = rng.float() * Math.PI * 2;
      const r = 40 + Math.pow(rng.float(), 0.55) * 380;
      const cx = Math.cos(ang) * r;
      const cz = Math.sin(ang) * r;
      const onSlab = Math.abs(cx + 4) < 96 && cz > -94 && cz < 70;
      const size = 14 + rng.float() * 26;
      A.ground(R.sandStreak, size, size * (0.5 + rng.float() * 0.5), cx, cz, 0.35 + rng.spread(0.25), {
        y: onSlab ? 0.254 : null,
        lift: 0.05,
        segs: onSlab ? 1 : 3
      });
    }

    // --- oil and hydraulic staining where vehicles and plant sit ---
    for (const [sx, sz] of [
      [26, 46], [34, 44], [-36, 54], [-70, 26], [-26, 25.5], [-26, 30], [-26, 21],
      [27, 14], [-58, 44]
    ]) {
      A.ground(R.oilStain, 5 + rng.float() * 3, 4 + rng.float() * 3, sx + rng.spread(1.5), sz + rng.spread(1.5), rng.float() * 3, {
        y: 0.252
      });
    }

    // --- graded gravel shoulders and hardcore aprons off the slab edges ---
    const shoulder = (cx, cz, w, d, yaw = 0) => {
      this.slabKit.place(P.gravel, new THREE.BoxGeometry(w, 0.1, d), [cx, 0.06, cz], [0, yaw, 0]);
    };
    shoulder(-4, 76, 210, 12);
    shoulder(-4, -100, 210, 14);
    shoulder(-104, -12, 14, 180, 0);
    shoulder(96, -12, 14, 180, 0);
    shoulder(30, 46, 34, 20);
    shoulder(-27, 26, 22, 18);
    shoulder(-58, 40, 30, 22);
    shoulder(34, 14, 26, 16);

    // --- surface drainage down the apron edges into a sump ---
    drainChannel(this.kit, [-96.5, 0.16, 60], [-96.5, 0.16, -88]);
    drainChannel(this.kit, [88.5, 0.16, 60], [88.5, 0.16, -88]);
    drainChannel(this.kit, [-96.5, 0.16, 62], [-40, 0.16, 62], { grate: false });
    // Sump with a heavy grating at the low corner.
    this.kit.place(P.concreteFine, new THREE.BoxGeometry(2.4, 0.4, 2.4), [-96.5, 0.14, -90]);
    for (let i = 0; i < 10; i++) {
      this.kit.place(P.bright, new THREE.BoxGeometry(1.9, 0.04, 0.08), [-96.5, 0.35, -90.9 + i * 0.2]);
    }
    culvert(this.kit, [-96.5, 0.02, -94], 0);
    culvert(this.kit, [-4, 0.02, 80], Math.PI);

    // --- larger rock fields raked to the edge of the graded area ---
    const cluster = (cx, cz, radius, count) => {
      const geo = new THREE.DodecahedronGeometry(1, 0);
      const mat = M.metal('#6a6055', 0.98, 0.02);
      for (let i = 0; i < count; i++) {
        const a = rng.float() * Math.PI * 2;
        const r = Math.pow(rng.float(), 0.6) * radius;
        const x = cx + Math.cos(a) * r;
        const z = cz + Math.sin(a) * r;
        const s = 0.2 + Math.pow(rng.float(), 2) * 0.7;
        this.kit.place(mat, geo, [x, groundHeight(x, z) - s * 0.35, z], [rng.spread(0.6), rng.float() * 6.28, rng.spread(0.6)], [s, s * 0.7, s * 0.9]);
      }
    };
    const clusterCount = Math.round(10 * clamp(q.groundDetail, 0.5, 1.4));
    for (let i = 0; i < clusterCount; i++) {
      const ang = rng.float() * Math.PI * 2;
      const r = 150 + rng.float() * 120;
      cluster(Math.cos(ang) * r, Math.sin(ang) * r, 6 + rng.float() * 10, 12 + rng.int(0, 14));
    }

    // Tumbleweed and windblown debris caught against the south fence.
    if (q.groundDetail >= 0.4) {
      const weed = new THREE.IcosahedronGeometry(0.55, 0);
      const weedMat = M.tarpMat('#8a7f58');
      for (let i = 0; i < 16; i++) {
        const x = -4 + rng.spread(120);
        const z = 106 - rng.float() * 0.6;
        this.kit.place(weedMat, weed, [x, groundHeight(x, z) + 0.35, z], [rng.float() * 3, rng.float() * 3, rng.float() * 3], [1, 0.8, 1]);
      }
    }
  }

  /* ---------------------------------------------------- night rig */

  /**
   * Obstruction beacons, walkway lamps and the merged floodlight lenses and
   * cones. Real dynamic lights are capped hard; everything else is emissive
   * geometry or additive shells.
   */
  _buildNightRig() {
    const P = palette();
    const beaconGeo = new THREE.SphereGeometry(0.13, 10, 8);
    const capGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.05, 10);
    const kitA = new Kit();
    const kitB = new Kit();
    for (const [list, kit, mat] of [
      [this._beaconsA, kitA, this.beaconMatA],
      [this._beaconsB, kitB, this.beaconMatB]
    ]) {
      for (const b of list) {
        // The housing goes in the main kit; only the lens needs its own mesh.
        this.kit.place(P.dark, capGeo, [b.pos[0], b.pos[1] - 0.1, b.pos[2]]);
        kit.place(mat, beaconGeo, b.pos);
      }
    }
    this.group.add(kitA.build('beacons-a', { castShadow: false, receiveShadow: false }));
    this.group.add(kitB.build('beacons-b', { castShadow: false, receiveShadow: false }));

    // Additive halo around each beacon, so they read from across the site.
    const haloMat = new THREE.MeshBasicMaterial({
      color: 0xff3a20,
      transparent: true,
      opacity: 0.22,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
      fog: false
    });
    const haloKit = new Kit();
    const halo = new THREE.SphereGeometry(0.45, 10, 8);
    for (const b of [...this._beaconsA, ...this._beaconsB]) haloKit.place(haloMat, halo, b.pos);
    this._beaconHalo = haloKit.build('beacon-halo', { castShadow: false, receiveShadow: false });
    this._beaconHalo.children.forEach((m) => (m.renderOrder = 5));
    this.group.add(this._beaconHalo);

    // Low walkway lamps: a short bollard with an emissive band.
    const glowKit = new Kit();
    const stem = new THREE.CylinderGeometry(0.07, 0.09, 0.6, 8);
    const hood = new THREE.CylinderGeometry(0.12, 0.1, 0.1, 8);
    const band = new THREE.CylinderGeometry(0.085, 0.085, 0.11, 8);
    const walkPts = [];
    for (let i = 0; i <= 8; i++) walkPts.push([-10.4, 60 - i * 5]);
    for (let i = 1; i <= 7; i++) walkPts.push([-10.4 - i * 4.6, 38.6]);
    for (let i = 1; i <= 6; i++) walkPts.push([-6.0 + i * 6, 18]);
    for (const [x, z] of walkPts) {
      const gy = groundHeight(x, z) + 0.24;
      this.kit.place(P.dark, stem, [x, gy + 0.3, z]);
      this.kit.place(P.dark, hood, [x, gy + 0.66, z]);
      glowKit.place(this.walkwayMat, band, [x, gy + 0.56, z]);
    }
    this._walkwayGlow = glowKit.build('walkway-glow', { castShadow: false, receiveShadow: false });
    this._walkwayGlow.visible = false;
    this.group.add(this._walkwayGlow);
  }

  /* ---------------------------------------------------- runtime */

  /** Floodlights and beacons come on for sunset and night. */
  setNight(on, intensityScale = 1) {
    this.nightMode = on;
    this.nightScale = intensityScale;
    if (!this._floodLights) {
      this._floodLights = [];
      this._floodRealLights = [];
      // Real spot lights are expensive: light a handful of the closest masts
      // and fake the rest with emissive housings plus visible cones.
      const maxReal = settings.quality.shadows ? 4 : 2;
      const lensKit = new Kit();
      const coneKit = new Kit();
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
      const lens = new THREE.PlaneGeometry(0.42, 0.26);
      let real = 0;
      this.animated.floodlights.forEach((head, i) => {
        lensKit.place(lampMat, lens, [head.pos[0], head.pos[1] - 0.05, head.pos[2]], [
          -Math.PI / 2 + head.tilt + 0.6,
          head.yaw,
          0
        ]);
        if (settings.quality.lightCones && i % 2 === 0) {
          const h = head.pos[1];
          coneKit.place(coneMat, new THREE.ConeGeometry(9, h + 3, 12, 1, true), [head.pos[0], h / 2 - 1.2, head.pos[2]]);
        }
        if (i % 4 === 0 && real < maxReal) {
          const light = new THREE.SpotLight(0xffe9c6, 0, 90, 0.95, 0.55, 1.4);
          light.position.set(head.pos[0], head.pos[1], head.pos[2]);
          light.target.position.set(head.pos[0], 0, head.pos[2] + 6);
          light.castShadow = false;
          this.group.add(light);
          this.group.add(light.target);
          this._floodRealLights.push(light);
          real++;
        }
      });
      this._floodLensMesh = lensKit.build('flood-lenses', { castShadow: false, receiveShadow: false });
      this._floodLensMesh.visible = false;
      this.group.add(this._floodLensMesh);
      this._floodConeMesh = coneKit.build('flood-cones', { castShadow: false, receiveShadow: false });
      this._floodConeMesh.visible = false;
      this._floodConeMesh.children.forEach((m) => (m.renderOrder = 6));
      this.group.add(this._floodConeMesh);
    }
    this._floodLensMesh.visible = on;
    this._floodConeMesh.visible = on && settings.quality.lightCones;
    for (const l of this._floodRealLights) l.intensity = on ? 130 * intensityScale : 0;
    if (this._walkwayGlow) this._walkwayGlow.visible = on;
    if (this._beaconHalo) this._beaconHalo.visible = on;
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
    if (this.animated.anemometer) {
      const speed = ctx?.weather?.windSpeed ?? 6;
      this.animated.anemometer.rotation.y += dt * clamp(speed, 1, 24) * 0.9;
    }

    // Obstruction beacons: two circuits, out of phase, brighter after dark.
    const peak = this.nightMode ? 5.2 : 2.4;
    const cycle = this.time % 2.6;
    const flashA = cycle < 0.55 ? 1 : 0.06;
    const flashB = cycle > 1.3 && cycle < 1.85 ? 1 : 0.06;
    this.beaconMatA.emissiveIntensity = peak * flashA;
    this.beaconMatB.emissiveIntensity = peak * flashB;
    if (this._beaconHalo && this._beaconHalo.visible) {
      const m = this._beaconHalo.children[0];
      if (m) m.material.opacity = 0.06 + 0.24 * Math.max(flashA, flashB);
    }
  }
}
