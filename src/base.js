// base.js — procedural military base: terrain, mountains, roads, fence, command
// shelter, radar installation, pads, generators, trucks, masts, lights, clutter.
import * as THREE from 'three';
import { Rand, fbm2D, clamp, TAU } from './util.js';
import { makeColliderBox, makeColliderCyl } from './physics.js';

const BASE_FLAT_RADIUS = 300;

export function terrainHeight(x, z) {
  const r = Math.hypot(x, z);
  const flat = smooth01((r - BASE_FLAT_RADIUS) / 700);
  if (flat <= 0) return 0;
  const n = fbm2D(x * 0.00045 + 13.7, z * 0.00045 + 7.3, 4);
  const dunes = fbm2D(x * 0.0035, z * 0.0035, 2) * 2.2;
  return (Math.pow(n, 1.6) * 130 + dunes) * flat;
}
function smooth01(t) { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); }

export function createBase(ctx) {
  const { scene, textures } = ctx;
  const rng = new Rand(4242);
  const colliders = ctx.world.colliders;
  const group = new THREE.Group();
  group.name = 'base';
  scene.add(group);

  const dynamic = []; // objects updated per-frame: fn(dt, t)

  // ---------- shared materials ----------
  const padConcreteTex = textures.concrete().clone();
  padConcreteTex.repeat.set(2.2, 2.2);
  const M = {
    sand: new THREE.MeshStandardMaterial({ map: textures.sand(), roughness: 0.96, metalness: 0 }),
    concrete: new THREE.MeshStandardMaterial({ map: textures.concrete(), roughness: 0.92 }),
    concretePad: new THREE.MeshStandardMaterial({ map: padConcreteTex, roughness: 0.92 }),
    asphalt: new THREE.MeshStandardMaterial({ map: textures.asphalt(), roughness: 0.94 }),
    tan: new THREE.MeshStandardMaterial({ map: textures.desertTan(), roughness: 0.82 }),
    olive: new THREE.MeshStandardMaterial({ map: textures.oliveDrab(), roughness: 0.8 }),
    metal: new THREE.MeshStandardMaterial({ map: textures.metalPlate(), roughness: 0.55, metalness: 0.65 }),
    darkMetal: new THREE.MeshStandardMaterial({ color: 0x3c4046, roughness: 0.55, metalness: 0.6 }),
    steel: new THREE.MeshStandardMaterial({ color: 0x8b9299, roughness: 0.42, metalness: 0.85 }),
    rubber: new THREE.MeshStandardMaterial({ color: 0x24262a, roughness: 0.95 }),
    cable: new THREE.MeshStandardMaterial({ color: 0x26282c, roughness: 0.85 }),
    glassDark: new THREE.MeshStandardMaterial({ color: 0x0c1116, roughness: 0.12, metalness: 0.9 }),
    hazard: new THREE.MeshStandardMaterial({ map: textures.hazardStripes(), roughness: 0.85 }),
    rock: new THREE.MeshStandardMaterial({ color: 0x9a8a70, roughness: 0.98, flatShading: true }),
    white: new THREE.MeshStandardMaterial({ color: 0xd8d5cc, roughness: 0.7 }),
    redLight: new THREE.MeshStandardMaterial({ color: 0x330000, emissive: 0xff2a1a, emissiveIntensity: 2.2 }),
    greenLight: new THREE.MeshStandardMaterial({ color: 0x00330a, emissive: 0x2aff55, emissiveIntensity: 1.8 }),
    amberLight: new THREE.MeshStandardMaterial({ color: 0x332200, emissive: 0xffaa22, emissiveIntensity: 2.0 }),
  };
  ctx.baseMaterials = M;

  const addBox = (mat, w, h, d, x, y, z, { rot = 0, castShadow = true, parent = group, collide = false } = {}) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    m.rotation.y = rot;
    m.castShadow = castShadow;
    m.receiveShadow = true;
    parent.add(m);
    if (collide) colliders.push(makeColliderBox(worldX(m, parent), worldZ(m, parent), w / 2 + 0.12, d / 2 + 0.12, rot + parentYaw(parent), 0, y + h / 2 + 0.4));
    return m;
  };
  const worldX = (m, parent) => (parent === group ? m.position.x : m.getWorldPosition(_wv).x);
  const worldZ = (m, parent) => (parent === group ? m.position.z : _wv.z);
  const parentYaw = (parent) => (parent === group ? 0 : parent.rotation.y);
  const _wv = new THREE.Vector3();

  // geometry helpers: clone + transform (for merging), UV scaling, instancing
  const _pv = new THREE.Vector3();
  const _pq = new THREE.Quaternion();
  const _pe = new THREE.Euler();
  const _pm = new THREE.Matrix4();
  const placeGeo = (geo, x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = sx, sz = sx) => {
    const g2 = geo.clone();
    _pe.set(rx, ry, rz);
    _pq.setFromEuler(_pe);
    _pm.compose(_pv.set(x, y, z), _pq, new THREE.Vector3(sx, sy, sz));
    g2.applyMatrix4(_pm);
    return g2;
  };
  const scaleUV = (geo, ru, rv) => {
    const uv = geo.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * ru, uv.getY(i) * rv);
    return geo;
  };
  // items: { x,y,z, rx,ry,rz, s|sx/sy/sz, c(THREE.Color) }
  const makeInstanced = (geo, mat, items, { shadow = true, receive = true, parent = group } = {}) => {
    const im = new THREE.InstancedMesh(geo, mat, items.length);
    const sv = new THREE.Vector3();
    items.forEach((it, i) => {
      _pe.set(it.rx ?? 0, it.ry ?? 0, it.rz ?? 0);
      _pq.setFromEuler(_pe);
      sv.set(it.sx ?? it.s ?? 1, it.sy ?? it.s ?? 1, it.sz ?? it.s ?? 1);
      _pm.compose(_pv.set(it.x, it.y ?? 0, it.z), _pq, sv);
      im.setMatrixAt(i, _pm);
      if (it.c) im.setColorAt(i, it.c);
    });
    im.castShadow = shadow;
    im.receiveShadow = receive;
    parent.add(im);
    return im;
  };

  // ============================================================ TERRAIN
  {
    const size = 16000, segs = 220;
    const geo = new THREE.PlaneGeometry(size, size, segs, segs);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    const col = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i);
      const h = terrainHeight(x, z);
      pos.setY(i, h);
      // macro tint variation + anisotropic windrow bands (darker, slightly
      // redder streaks running with the prevailing wind)
      let tint = 0.80 + fbm2D(x * 0.0012 + 3, z * 0.0012 + 9, 3) * 0.40;
      const wind = fbm2D(x * 0.00034 - z * 0.00062 + 40, x * 0.00021 + z * 0.00013 - 17, 2);
      const wr = clamp((0.46 - wind) * 2.4, 0, 1);
      tint *= 1 - wr * 0.16;
      col.setRGB(tint * (1 + wr * 0.05), tint * 0.985, tint * (0.94 - wr * 0.045));
      colors[i * 3] = col.r; colors[i * 3 + 1] = col.g; colors[i * 3 + 2] = col.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    const mat = M.sand.clone();
    mat.vertexColors = true;
    const terrain = new THREE.Mesh(geo, mat);
    terrain.receiveShadow = true;
    terrain.name = 'terrain';
    group.add(terrain);
  }

  // ============================================================ MOUNTAINS
  // Layered arid ranges: three rings with noise-displaced silhouettes and
  // gaps, per-face vertex colors (scree feet -> rock -> bleached caps) and
  // baked atmospheric haze on the farther rings. Fog adds the rest.
  {
    const positions = [];
    const colors = [];
    const cScree = new THREE.Color(0xb3a184);
    const cRockA = new THREE.Color(0x6d5c46);
    const cRockB = new THREE.Color(0x9a875f);
    const cCap = new THREE.Color(0xbcae90);
    const cHaze = new THREE.Color(0xaebccb);
    const cA = new THREE.Color(), cB = new THREE.Color(), cFace = new THREE.Color();

    // push one quad (two tris) with a single flat color per tri
    const quad = (p0, p1, p2, p3, col0, col1) => {
      positions.push(...p0, ...p1, ...p2, ...p0, ...p2, ...p3);
      for (let k = 0; k < 3; k++) colors.push(col0.r, col0.g, col0.b);
      for (let k = 0; k < 3; k++) colors.push(col1.r, col1.g, col1.b);
    };

    const addRange = (R, spread, maxH, seed, hazeAmt, gapBias) => {
      const N = 448;
      const ring = [];
      for (let i = 0; i <= N; i++) {
        const a = (i / N) * TAU;
        const ca = Math.cos(a), sa = Math.sin(a);
        // arc mask opens gaps so ranges overlap instead of forming a wall;
        // soft slope so range ends taper into the plain instead of cliffing
        const mask = smooth01((fbm2D(ca * 1.35 + seed * 17.3, sa * 1.35 - seed * 9.1, 3) - gapBias) * 2.8);
        const jag = fbm2D(ca * 7.6 + seed * 3.1, sa * 7.6 + seed * 5.7, 5);
        const cluster = 0.45 + fbm2D(ca * 2.2 - seed * 7.7, sa * 2.2 + seed * 2.9, 3);
        const h = mask * Math.min(0.95, 0.14 + Math.pow(jag, 1.6) * 0.95 * cluster) * maxH;
        const r = R + (fbm2D(ca * 2.9 + seed, sa * 2.9 - seed, 3) - 0.5) * 2 * spread;
        ring.push({
          x: sa, z: ca, h, r,
          sh: h * (0.30 + fbm2D(ca * 9.1 + seed, sa * 9.1 - seed * 2, 2) * 0.30),
          shr: 0.30 + fbm2D(ca * 7.3 + seed * 5, sa * 7.3, 2) * 0.25,
          tint: fbm2D(ca * 12.7 + seed * 31, sa * 12.7 + seed, 3),
        });
      }
      const P = (n, rr, y) => [n.x * rr, y, n.z * rr];
      for (let i = 0; i < N; i++) {
        const n0 = ring[i], n1 = ring[i + 1];
        const hMax = Math.max(n0.h, n1.h);
        if (hMax < 6) continue; // skip fully masked arcs
        const rows0 = [
          P(n0, n0.r - n0.h * 1.45 - 420, 0),
          P(n0, n0.r - n0.h * n0.shr, n0.sh),
          P(n0, n0.r, n0.h),
          P(n0, n0.r + n0.h * 1.6 + 500, 0),
        ];
        const rows1 = [
          P(n1, n1.r - n1.h * 1.45 - 420, 0),
          P(n1, n1.r - n1.h * n1.shr, n1.sh),
          P(n1, n1.r, n1.h),
          P(n1, n1.r + n1.h * 1.6 + 500, 0),
        ];
        // band colors: scree foot, mid rock, upper rock/cap, back slope
        const t0 = n0.tint, t1 = n1.tint;
        const bandCol = (band, t, fJit) => {
          cA.copy(cRockA).lerp(cRockB, clamp(t * 1.5 - 0.2, 0, 1));
          if (band === 0) cFace.copy(cScree).lerp(cA, 0.35);
          else if (band === 1) cFace.copy(cA).lerp(cScree, 0.12);
          else cFace.copy(cA).lerp(cCap, clamp((hMax / maxH - 0.35) * 1.4, 0, 0.7));
          cFace.multiplyScalar(0.84 + fJit * 0.3);
          cFace.lerp(cHaze, hazeAmt);
          return cFace;
        };
        for (let band = 0; band < 3; band++) {
          const jit0 = fbm2D(i * 0.7 + seed * 9 + band * 3.7, seed * 4 - band, 2);
          const jit1 = fbm2D(i * 0.7 + 0.35 + seed * 9 + band * 3.7, seed * 4 - band, 2);
          cB.copy(bandCol(band, (t0 + t1) * 0.5, jit0));
          const c1 = bandCol(band, (t0 + t1) * 0.5, jit1);
          // winding: (seg i lower, seg i upper, seg i+1 upper, seg i+1 lower)
          // keeps front slopes facing the base like the original ridges
          quad(rows0[band], rows0[band + 1], rows1[band + 1], rows1[band], cB, c1);
        }
      }
    };
    // near foothills (warm, broken), mid range, far high range (hazed)
    addRange(5200, 650, 1050, 3, 0.05, 0.30);
    addRange(7400, 900, 1500, 11, 0.17, 0.28);
    addRange(9200, 1100, 2000, 23, 0.28, 0.20);

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true });
    const mountains = new THREE.Mesh(geo, mat);
    mountains.name = 'mountains';
    group.add(mountains);
  }

  // ============================================================ APRON + MARKINGS
  {
    // near-field sand albedo overlay: one big non-repeating mottle sheet so
    // the flat area around the base reads as patchy desert, not one tile
    const overlay = new THREE.Mesh(
      new THREE.CircleGeometry(540, 40),
      new THREE.MeshStandardMaterial({
        map: textures.sandOverlay(), transparent: true, roughness: 0.97,
        depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1,
      })
    );
    overlay.rotation.x = -Math.PI / 2;
    overlay.rotation.z = 0.7;
    overlay.position.y = 0.006;
    overlay.renderOrder = 1;
    overlay.receiveShadow = true;
    group.add(overlay);

    const apron = new THREE.Mesh(new THREE.PlaneGeometry(120, 96), M.concrete);
    apron.rotation.x = -Math.PI / 2;
    apron.position.y = 0.02;
    apron.receiveShadow = true;
    group.add(apron);

    // pad extensions under batteries
    for (const [x, z] of [[-46, 32], [2, 50], [48, 30]]) {
      const pad = new THREE.Mesh(new THREE.PlaneGeometry(26, 26), M.concretePad);
      pad.rotation.x = -Math.PI / 2;
      pad.position.set(x, 0.025, z);
      pad.receiveShadow = true;
      group.add(pad);
      // hazard ring (worn painted band)
      const ring = new THREE.Mesh(new THREE.RingGeometry(10.9, 11.55, 48), M.hazard.clone());
      ring.material.polygonOffset = true;
      ring.material.polygonOffsetFactor = -2;
      ring.material.color.setScalar(0.72);
      ring.material.transparent = true;
      ring.material.opacity = 0.85;
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(x, 0.035, z);
      ring.receiveShadow = true;
      group.add(ring);
    }

    const mkDecal = (tex, w, h, x, z, rot = 0, opacity = 0.85) => {
      const m = new THREE.Mesh(
        new THREE.PlaneGeometry(w, h),
        new THREE.MeshStandardMaterial({ map: tex, transparent: true, opacity, roughness: 0.9, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3 })
      );
      m.rotation.x = -Math.PI / 2;
      m.rotation.z = rot;
      m.position.set(x, 0.045, z);
      m.renderOrder = 2;
      group.add(m);
      return m;
    };
    mkDecal(textures.label('KEEP CLEAR', { fg: '#d8cf9f', w: 512, h: 96, font: 'bold 64px Arial' }), 16, 3, -20, 16);
    mkDecal(textures.label('LAUNCH AREA A', { fg: '#d8cf9f', w: 512, h: 96, font: 'bold 58px Arial' }), 14, 2.6, -46, 20, 0);
    mkDecal(textures.label('LAUNCH AREA B', { fg: '#d8cf9f', w: 512, h: 96, font: 'bold 58px Arial' }), 14, 2.6, 2, 37, 0);
    mkDecal(textures.label('LAUNCH AREA C', { fg: '#d8cf9f', w: 512, h: 96, font: 'bold 58px Arial' }), 14, 2.6, 48, 18, 0);
    mkDecal(textures.roundel(), 10, 10, 22, -8, 0, 0.5);
    // painted stencil warnings scattered where crews work
    mkDecal(textures.label('NO SMOKING — FUEL POINT', { fg: '#c98f7a', w: 512, h: 72, font: 'bold 44px Arial' }), 12, 1.7, -36, -2, 0.5, 0.8);
    mkDecal(textures.label('FOD CHECK POINT', { fg: '#d8cf9f', w: 512, h: 72, font: 'bold 46px Arial' }), 11, 1.6, 2, 58.5, 0, 0.8);
    mkDecal(textures.label('SLOW · 15', { fg: '#d8cf9f', w: 256, h: 96, font: 'bold 58px Arial' }), 5, 1.9, 0, 72, 0, 0.85);
    mkDecal(textures.label('AUTHORIZED VEHICLES ONLY', { fg: '#d8cf9f', w: 640, h: 64, font: 'bold 40px Arial' }), 15, 1.5, 24, 40, -0.35, 0.75);
    // big pad ident letters at each pad approach
    mkDecal(textures.label('A', { fg: '#d8cf9f', w: 128, h: 128, font: 'bold 108px Arial' }), 5.5, 5.5, -36, 26, 0.4, 0.7);
    mkDecal(textures.label('B', { fg: '#d8cf9f', w: 128, h: 128, font: 'bold 108px Arial' }), 5.5, 5.5, 0, 30, 0, 0.7);
    mkDecal(textures.label('C', { fg: '#d8cf9f', w: 128, h: 128, font: 'bold 108px Arial' }), 5.5, 5.5, 38, 24, -0.4, 0.7);

    // painted lane lines: apron border + taxi lanes branching to the pads
    const stripeGeo = new THREE.PlaneGeometry(1, 1);
    stripeGeo.rotateX(-Math.PI / 2);
    const stripeMat = new THREE.MeshStandardMaterial({
      map: textures.paintStripe(), transparent: true, opacity: 0.8, color: 0xcfc493,
      roughness: 0.9, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2,
    });
    const stripes = [];
    const stripe = (x0, z0, x1, z1, w = 0.35) => {
      const len = Math.hypot(x1 - x0, z1 - z0);
      stripes.push({ x: (x0 + x1) / 2, y: 0.032, z: (z0 + z1) / 2, ry: Math.atan2(x1 - x0, z1 - z0), sx: w, sz: len });
    };
    // border inset
    stripe(-58, -46, 58, -46); stripe(-58, 46, -6, 46); stripe(14, 46, 58, 46);
    stripe(-58, -46, -58, 46); stripe(58, -46, 58, 46);
    // taxi centerlines: entry -> hub -> pads
    stripe(0, 46, 0, 24, 0.4);
    stripe(0, 24, -34, 28, 0.4); stripe(-34, 28, -42, 30, 0.4);
    stripe(0, 24, 34, 26, 0.4); stripe(34, 26, 42, 28, 0.4);
    stripe(0, 24, 2, 40, 0.4);
    // parking bay tick marks along south edge
    for (let i = 0; i < 6; i++) stripe(-30 + i * 9, -38, -30 + i * 9, -44, 0.3);
    const stripeMesh = makeInstanced(stripeGeo, stripeMat, stripes, { shadow: false });
    stripeMesh.renderOrder = 1;

    // rubber tire marks arcing from the entry toward pads + parking
    const markGeo = new THREE.PlaneGeometry(1, 1);
    markGeo.rotateX(-Math.PI / 2);
    const markMat = new THREE.MeshStandardMaterial({
      map: textures.tireMarks(), transparent: true, opacity: 0.34, roughness: 0.95,
      depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2,
    });
    const marks = [];
    const mark = (x, z, ry, len = 15, w = 3.1) => marks.push({ x, y: 0.03, z, ry, sx: w, sz: len });
    mark(1.4, 36, 0.06, 18);
    mark(-6, 27, 1.05, 16); mark(-20, 29.5, 1.45, 15); mark(-33.5, 30.5, 1.62, 13);
    mark(8, 26, -1.2, 15); mark(22, 27.5, -1.5, 14); mark(36, 27.6, -1.62, 12);
    mark(2.4, 20, -0.12, 16);
    mark(-4, -20, 0.5, 17); mark(-12, -33, 0.25, 14);
    mark(18, -12, -0.6, 15); mark(30, -22, -0.5, 13);
    const markMesh = makeInstanced(markGeo, markMat, marks, { shadow: false });
    markMesh.renderOrder = 1;

    // oil drip stains at pads, generators and parking bays
    const oilGeo = new THREE.PlaneGeometry(1, 1);
    oilGeo.rotateX(-Math.PI / 2);
    const oilMat = new THREE.MeshStandardMaterial({
      map: textures.oilStain(), transparent: true, opacity: 0.55, roughness: 0.7,
      depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2,
    });
    // only where equipment actually parks (generators, truck bays) — stray
    // stains in open walk lanes read as rendering glitches up close
    const oils = [];
    for (const [x, z] of [[-46, 30], [3, 49], [47, 32], [-38, 24], [10, 41], [41, 35], [-14, -34], [-24, -37], [30, -20]]) {
      oils.push({ x: x + rng.range(-1.5, 1.5), y: 0.028, z: z + rng.range(-1.5, 1.5), ry: rng.next() * TAU, s: rng.range(1.5, 2.7) });
    }
    const oilMesh = makeInstanced(oilGeo, oilMat, oils, { shadow: false });
    oilMesh.renderOrder = 1;

    // drainage grates along the apron mid-line
    const grateGeo = new THREE.PlaneGeometry(1.5, 1.0);
    grateGeo.rotateX(-Math.PI / 2);
    const grateMat = new THREE.MeshStandardMaterial({ map: textures.drainGrate(), roughness: 0.6, metalness: 0.45, polygonOffset: true, polygonOffsetFactor: -2 });
    const grates = [];
    for (let i = 0; i < 6; i++) grates.push({ x: -50 + i * 20, y: 0.027, z: -8, ry: 0 });
    makeInstanced(grateGeo, grateMat, grates, { shadow: false });

    // tar expansion strips crossing the big pour
    const tarGeo = new THREE.PlaneGeometry(1, 1);
    tarGeo.rotateX(-Math.PI / 2);
    const tarMat = new THREE.MeshStandardMaterial({ color: 0x4a4741, roughness: 0.98, polygonOffset: true, polygonOffsetFactor: -1 });
    const tars = [];
    for (const x of [-40, -12, 16, 44]) tars.push({ x, y: 0.026, z: 0, ry: 0, sx: 0.13, sz: 96 });
    for (const z of [-24, 12] ) tars.push({ x: 0, y: 0.026, z, ry: Math.PI / 2, sx: 0.13, sz: 120 });
    makeInstanced(tarGeo, tarMat, tars, { shadow: false });

    // rutted tire tracks in the sand: gate approach + truck park exits
    const sandTrackGeo = new THREE.PlaneGeometry(1, 1);
    sandTrackGeo.rotateX(-Math.PI / 2);
    const sandTrackMat = new THREE.MeshStandardMaterial({
      map: textures.sandTracks(), transparent: true, opacity: 0.85, roughness: 1,
      depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2,
    });
    const struts = [];
    const sTrack = (x, z, ry, len = 26, w = 3.4) => struts.push({ x, y: 0.012, z, ry, sx: w, sz: len });
    sTrack(-9, -60, 0.25, 30); sTrack(-16, -86, 0.18, 28); sTrack(-26, -110, 0.4, 30);
    sTrack(70, -18, -0.9, 26); sTrack(92, -30, -1.1, 26);
    sTrack(-68, 74, 0.85, 30); sTrack(-92, 90, 0.7, 26);
    sTrack(26, 88, -0.5, 26); sTrack(44, 104, -0.75, 26);
    const sandTrackMesh = makeInstanced(sandTrackGeo, sandTrackMat, struts, { shadow: false });
    sandTrackMesh.renderOrder = 1;
  }

  // ============================================================ ROADS
  {
    const road = (x, z, len, wid, rot) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(wid, len), M.asphalt);
      m.rotation.x = -Math.PI / 2;
      m.rotation.z = rot;
      m.position.set(x, 0.012, z);
      m.receiveShadow = true;
      group.add(m);
      const line = new THREE.Mesh(
        new THREE.PlaneGeometry(0.7, len),
        new THREE.MeshStandardMaterial({ map: textures.roadLine(), transparent: true, roughness: 0.9, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 })
      );
      line.rotation.copy(m.rotation);
      line.position.set(x, 0.03, z);
      line.renderOrder = 1;
      group.add(line);
    };
    road(0, 96, 100, 8, 0);        // gate to apron
    road(-70, 60, 90, 6, Math.PI / 4);  // west loop
    road(80, 62, 84, 6, -Math.PI / 5);  // east loop
    road(-100, -20, 120, 6, Math.PI / 2 + 0.35);
  }

  // ============================================================ PERIMETER FENCE
  {
    const HX = 165, HZ = 145, gateHalf = 5;
    const postGeo = new THREE.CylinderGeometry(0.05, 0.05, 2.9, 6);
    const posts = [];
    const walk = (x0, z0, x1, z1) => {
      const len = Math.hypot(x1 - x0, z1 - z0);
      const n = Math.floor(len / 4);
      for (let i = 0; i <= n; i++) {
        posts.push([x0 + (x1 - x0) * (i / n), z0 + (z1 - z0) * (i / n)]);
      }
    };
    walk(-HX, -HZ, HX, -HZ);
    walk(HX, -HZ, HX, HZ);
    walk(HX, HZ, gateHalf, HZ);
    walk(-gateHalf, HZ, -HX, HZ);
    walk(-HX, HZ, -HX, -HZ);
    const postMesh = new THREE.InstancedMesh(postGeo, M.darkMetal, posts.length);
    const mtx = new THREE.Matrix4();
    posts.forEach(([x, z], i) => {
      mtx.makeTranslation(x, 1.45, z);
      postMesh.setMatrixAt(i, mtx);
    });
    postMesh.castShadow = false;
    group.add(postMesh);

    const linkMat = new THREE.MeshStandardMaterial({
      map: textures.chainlink(), transparent: true, alphaTest: 0.3, side: THREE.DoubleSide,
      color: 0xd0d4d8, roughness: 0.6, metalness: 0.55,
    });
    const fencePanel = (x, z, len, rot) => {
      const geo = new THREE.PlaneGeometry(len, 2.5);
      const m = new THREE.Mesh(geo, linkMat.clone());
      m.material.map = m.material.map.clone();
      m.material.map.repeat.set(len / 1.6, 1.6);
      m.material.map.needsUpdate = true;
      m.position.set(x, 1.3, z);
      m.rotation.y = rot;
      group.add(m);
      // top barbed rail
      const rail = new THREE.Mesh(new THREE.BoxGeometry(len, 0.03, 0.03), M.darkMetal);
      rail.position.set(x, 2.68, z);
      rail.rotation.y = rot;
      group.add(rail);
    };
    fencePanel(0, -HZ, HX * 2, 0);
    fencePanel(HX, 0, HZ * 2, Math.PI / 2);
    fencePanel(-HX, 0, HZ * 2, Math.PI / 2);
    fencePanel((HX + gateHalf) / 2, HZ, HX - gateHalf, 0);
    fencePanel(-(HX + gateHalf) / 2, HZ, HX - gateHalf, 0);
    colliders.push(makeColliderBox(0, -HZ, HX, 0.25, 0, 0, 3));
    colliders.push(makeColliderBox(HX, 0, 0.25, HZ, 0, 0, 3));
    colliders.push(makeColliderBox(-HX, 0, 0.25, HZ, 0, 0, 3));
    colliders.push(makeColliderBox((HX + gateHalf) / 2 + 1, HZ, (HX - gateHalf) / 2, 0.25, 0, 0, 3));
    colliders.push(makeColliderBox(-(HX + gateHalf) / 2 - 1, HZ, (HX - gateHalf) / 2, 0.25, 0, 0, 3));

    // gate: slid-open panel + guard hut
    const gatePanel = new THREE.Mesh(new THREE.PlaneGeometry(9, 2.4), linkMat);
    gatePanel.position.set(gateHalf + 5.5, 1.25, HZ + 0.6);
    group.add(gatePanel);
    addBox(M.tan, 3, 2.7, 2.6, -gateHalf - 3, 1.35, HZ - 2, { collide: true });
    // warning signs on fence
    const signTex = textures.label('RESTRICTED AREA — USE OF FORCE AUTHORIZED', { fg: '#fff', bg: '#8c1c13', w: 512, h: 96, font: 'bold 30px Arial' });
    for (let i = -2; i <= 2; i++) {
      const s = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.5), new THREE.MeshBasicMaterial({ map: signTex, side: THREE.DoubleSide }));
      s.position.set(i * 60 + 10, 1.7, HZ - 0.08);
      group.add(s);
    }
  }

  // ============================================================ COMMAND SHELTER
  const shelter = new THREE.Group();
  shelter.position.set(-32, 0, -18);
  group.add(shelter);
  let consoleScreen, holoAnchor, consolePos, auxScreens, interiorLights;
  {
    const W = 9, H = 3.1, D = 6, t = 0.16;
    const sx = shelter.position.x, sz = shelter.position.z;
    // floor + roof
    addBox(M.concrete, W, 0.14, D, 0, 0.07, 0, { parent: shelter });
    addBox(M.tan, W + 0.3, 0.18, D + 0.3, 0, H + 0.09, 0, { parent: shelter });
    // walls: back(-z), left, right, front two segments around door at +z
    addBox(M.tan, W, H, t, 0, H / 2, -D / 2, { parent: shelter });
    addBox(M.tan, t, H, D, -W / 2, H / 2, 0, { parent: shelter });
    addBox(M.tan, t, H, D, W / 2, H / 2, 0, { parent: shelter });
    const doorW = 1.5, doorX = 1.6;
    const seg1W = W / 2 + (doorX - doorW / 2);
    const seg2W = W / 2 - (doorX + doorW / 2);
    addBox(M.tan, seg1W, H, t, -W / 2 + seg1W / 2, H / 2, D / 2, { parent: shelter });
    addBox(M.tan, seg2W, H, t, W / 2 - seg2W / 2, H / 2, D / 2, { parent: shelter });
    addBox(M.tan, doorW, H - 2.15, t, doorX, 2.15 + (H - 2.15) / 2, D / 2, { parent: shelter }); // lintel
    colliders.push(makeColliderBox(sx, sz - D / 2, W / 2, t, 0, 0, H));
    colliders.push(makeColliderBox(sx - W / 2, sz, t, D / 2, 0, 0, H));
    colliders.push(makeColliderBox(sx + W / 2, sz, t, D / 2, 0, 0, H));
    colliders.push(makeColliderBox(sx - W / 2 + seg1W / 2, sz + D / 2, seg1W / 2, t, 0, 0, H));
    colliders.push(makeColliderBox(sx + W / 2 - seg2W / 2, sz + D / 2, seg2W / 2, t, 0, 0, H));

    // door (open, swung outward)
    const door = addBox(M.olive, doorW - 0.1, 2.1, 0.06, doorX + doorW / 2 + 0.62, 1.06, D / 2 + 0.7, { parent: shelter, rot: -1.25 });
    door.castShadow = true;

    // local deterministic stream for interior detail — must NOT touch `rng`
    // (its call count feeds every section after the shelter)
    const srng = new Rand(9107);
    const wallT = 0.012; // liner offset off the structural wall
    const iw = W / 2 - t - wallT, id = D / 2 - t - wallT;

    // interior material set (shared across merged buckets)
    const IM = {
      wall: new THREE.MeshStandardMaterial({ map: textures.interiorWall(), roughness: 0.9 }),
      ceil: new THREE.MeshStandardMaterial({ map: textures.interiorCeiling(), roughness: 0.92 }),
      deck: new THREE.MeshStandardMaterial({ map: textures.paintedFloor(), roughness: 0.82 }),
      conBody: new THREE.MeshStandardMaterial({ color: 0x4d5551, roughness: 0.58, metalness: 0.3 }),
      conDesk: new THREE.MeshStandardMaterial({ color: 0x2c2f31, roughness: 0.68, metalness: 0.2 }),
      bezel: new THREE.MeshStandardMaterial({ color: 0x1b1d1f, roughness: 0.42, metalness: 0.5 }),
      panelTex: new THREE.MeshStandardMaterial({ map: textures.consolePanel(), roughness: 0.55, metalness: 0.25 }),
      fabric: new THREE.MeshStandardMaterial({ color: 0x2e332c, roughness: 0.96 }),
      red: new THREE.MeshStandardMaterial({ color: 0x8c2016, roughness: 0.5, metalness: 0.2 }),
      steel: M.steel,
      white: M.white,
      cable: M.cable,
    };

    // ---- interior liner: acoustic-panel walls (v spans full wall height)
    {
      const panel = (w) => scaleUV(new THREE.PlaneGeometry(w, H), w / 2.4, 1);
      const parts = [];
      parts.push(placeGeo(panel(W - 2 * t), 0, H / 2, -id));
      parts.push(placeGeo(panel(D - 2 * t), -iw, H / 2, 0, 0, Math.PI / 2));
      parts.push(placeGeo(panel(D - 2 * t), iw, H / 2, 0, 0, -Math.PI / 2));
      const f1w = iw + (doorX - doorW / 2);
      const f2w = iw - (doorX + doorW / 2);
      parts.push(placeGeo(panel(f1w), -iw + f1w / 2, H / 2, id, 0, Math.PI));
      parts.push(placeGeo(panel(f2w), iw - f2w / 2, H / 2, id, 0, Math.PI));
      // lintel interior face: remap v to its true wall band so no wainscot floats
      const lintelH = H - 2.15;
      const lintel = new THREE.PlaneGeometry(doorW, lintelH);
      {
        const uv = lintel.attributes.uv;
        for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * (doorW / 2.4), 2.15 / H + uv.getY(i) * (lintelH / H));
      }
      parts.push(placeGeo(lintel, doorX, 2.15 + lintelH / 2, id, 0, Math.PI));
      const liner = new THREE.Mesh(mergeGeoms(parts), IM.wall);
      liner.receiveShadow = true;
      shelter.add(liner);

      // ceiling (pale acoustic tile, own texture)
      const ceil = new THREE.Mesh(
        scaleUV(new THREE.PlaneGeometry(W - 2 * t, D - 2 * t), (W - 2 * t) / 1.2, (D - 2 * t) / 1.2),
        IM.ceil
      );
      ceil.rotation.x = Math.PI / 2;
      ceil.position.y = H - 0.065;
      ceil.receiveShadow = true;
      shelter.add(ceil);

      // painted deck floor (one-shot texture: tiles, border, chevrons, wear)
      const deck = new THREE.Mesh(
        new THREE.PlaneGeometry(W - 2 * t - 0.02, D - 2 * t - 0.02),
        IM.deck
      );
      deck.rotation.x = -Math.PI / 2;
      deck.position.y = 0.148;
      deck.receiveShadow = true;
      shelter.add(deck);
    }

    // ============================ FIRE-DIRECTION CONSOLE SUITE (back wall)
    // Three bays: [aux display | main PPI | annunciator+switches], one
    // continuous plinth/body/desktop/slope/monitor-wall profile, side cheeks.
    const CB = -id;                 // interior back-wall z
    const CX0 = -3.45, CX1 = 0.75;  // console span
    const CW = CX1 - CX0, CCX = (CX0 + CX1) / 2;
    const SLOPE_A = 0.62;           // slope lean-back from vertical
    const sCos = Math.cos(SLOPE_A), sSin = Math.sin(SLOPE_A);
    const slopeBaseY = 0.79, slopeBaseZ = CB + 0.62, slopeLen = 0.46;
    // point on the slope face: s along face from bottom edge, out along normal
    const slopePt = (x, s, out = 0) => [x, slopeBaseY + s * sCos + out * sSin, slopeBaseZ - s * sSin + out * sCos];
    {
      const bodyParts = [
        placeGeo(new THREE.BoxGeometry(CW - 0.1, 0.12, 0.66), CCX, 0.06, CB + 0.37),          // plinth (kick recess)
        placeGeo(new THREE.BoxGeometry(CW, 0.62, 0.94), CCX, 0.43, CB + 0.47),                // body
        placeGeo(new THREE.BoxGeometry(CW, 0.86, 0.12), CCX, 1.615, CB + 0.24, -0.10),        // monitor wall
        placeGeo(new THREE.BoxGeometry(CW + 0.12, 0.1, 0.4), CCX, 2.075, CB + 0.26, -0.06),   // brow visor
        // side cheeks
        placeGeo(new THREE.BoxGeometry(0.06, 0.79, 1.06), CX0 - 0.03, 0.395, CB + 0.53),
        placeGeo(new THREE.BoxGeometry(0.06, 0.79, 1.06), CX1 + 0.03, 0.395, CB + 0.53),
        placeGeo(new THREE.BoxGeometry(0.06, 1.4, 0.56), CX0 - 0.03, 1.44, CB + 0.30),
        placeGeo(new THREE.BoxGeometry(0.06, 1.4, 0.56), CX1 + 0.03, 1.44, CB + 0.30),
        // bay divider strips on the monitor wall
        placeGeo(new THREE.BoxGeometry(0.035, 0.86, 0.14), -2.15, 1.615, CB + 0.25, -0.10),
        placeGeo(new THREE.BoxGeometry(0.035, 0.86, 0.14), -0.25, 1.615, CB + 0.25, -0.10),
      ];
      const body = new THREE.Mesh(mergeGeoms(bodyParts), IM.conBody);
      body.castShadow = true;
      body.receiveShadow = true;
      shelter.add(body);
      colliders.push(makeColliderBox(sx + CCX, sz + CB + 0.5, CW / 2 + 0.14, 0.62, 0, 0, 2.2));

      // desktop slab + rounded front lip strip
      const deskParts = [
        placeGeo(new THREE.BoxGeometry(CW, 0.05, 1.06), CCX, 0.765, CB + 0.53),
        placeGeo(new THREE.CylinderGeometry(0.026, 0.026, CW, 8), CCX, 0.765, CB + 1.055, 0, 0, Math.PI / 2),
      ];
      const desk = new THREE.Mesh(mergeGeoms(deskParts), IM.conDesk);
      desk.castShadow = true;
      desk.receiveShadow = true;
      shelter.add(desk);

      // sloped switch panels, one full-texture per bay
      {
        const bays = [[-3.45, -2.15], [-2.15, -0.25], [-0.25, 0.75]];
        const parts = [];
        for (const [x0, x1] of bays) {
          const [px, py, pz] = slopePt((x0 + x1) / 2, slopeLen / 2, 0.002);
          parts.push(placeGeo(new THREE.PlaneGeometry(x1 - x0 - 0.06, slopeLen), px, py, pz, -SLOPE_A));
        }
        const slope = new THREE.Mesh(mergeGeoms(parts), IM.panelTex);
        slope.receiveShadow = true;
        shelter.add(slope);
      }

      // ---- screens: main PPI (contract mesh) + two aux displays
      const SCR_RX = -0.10;
      const bezelParts = [];
      const frameAround = (cx, cy, w, h2) => {
        // slab behind + proud frame strips around the glass
        bezelParts.push(placeGeo(new THREE.BoxGeometry(w + 0.14, h2 + 0.14, 0.075), cx, cy, CB + 0.305, SCR_RX));
        const fz = CB + 0.352;
        const oy = h2 / 2 + 0.045; // strip offset along the tilted screen's up axis
        bezelParts.push(placeGeo(new THREE.BoxGeometry(w + 0.14, 0.05, 0.045), cx, cy + oy * Math.cos(SCR_RX), fz + oy * Math.sin(SCR_RX), SCR_RX));
        bezelParts.push(placeGeo(new THREE.BoxGeometry(w + 0.14, 0.05, 0.045), cx, cy - oy * Math.cos(SCR_RX), fz - oy * Math.sin(SCR_RX), SCR_RX));
        bezelParts.push(placeGeo(new THREE.BoxGeometry(0.05, h2 + 0.14, 0.045), cx - w / 2 - 0.045, cy, fz, SCR_RX));
        bezelParts.push(placeGeo(new THREE.BoxGeometry(0.05, h2 + 0.14, 0.045), cx + w / 2 + 0.045, cy, fz, SCR_RX));
      };
      frameAround(-1.2, 1.60, 1.9, 1.05);
      frameAround(-2.85, 1.60, 0.98, 0.56);
      frameAround(0.25, 1.46, 0.64, 0.42);
      // annunciator housing
      bezelParts.push(placeGeo(new THREE.BoxGeometry(0.82, 0.37, 0.07), 0.25, 1.895, CB + 0.31, SCR_RX));
      const bezels = new THREE.Mesh(mergeGeoms(bezelParts), IM.bezel);
      bezels.castShadow = true;
      bezels.receiveShadow = true;
      shelter.add(bezels);

      consoleScreen = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 1.05), new THREE.MeshBasicMaterial({ color: 0x0a1408 }));
      consoleScreen.position.set(-1.2, 1.60, CB + 0.353);
      consoleScreen.rotation.x = SCR_RX;
      shelter.add(consoleScreen);
      const auxL = new THREE.Mesh(new THREE.PlaneGeometry(0.98, 0.56), new THREE.MeshBasicMaterial({ map: textures.statusScreen(), toneMapped: false }));
      auxL.position.set(-2.85, 1.60, CB + 0.353);
      auxL.rotation.x = SCR_RX;
      shelter.add(auxL);
      const auxR = new THREE.Mesh(new THREE.PlaneGeometry(0.64, 0.42), new THREE.MeshBasicMaterial({ map: textures.statusScreen(), toneMapped: false }));
      auxR.position.set(0.25, 1.46, CB + 0.353);
      auxR.rotation.x = SCR_RX;
      shelter.add(auxR);
      auxScreens = { left: auxL, right: auxR };
      const annun = new THREE.Mesh(new THREE.PlaneGeometry(0.76, 0.315), new THREE.MeshBasicMaterial({ map: textures.annunciator(), toneMapped: false }));
      annun.position.set(0.25, 1.895, CB + 0.35);
      annun.rotation.x = SCR_RX;
      shelter.add(annun);

      // power LEDs + brand plates under the screens (emissive dots)
      {
        const dotGeo = new THREE.PlaneGeometry(0.022, 0.022);
        const dots = [];
        for (const [dx, dy] of [[-0.35, 1.035], [-2.5, 1.29], [0.5, 1.22]]) {
          dots.push(placeGeo(dotGeo, dx, dy, CB + 0.36, SCR_RX));
        }
        const dotMesh = new THREE.Mesh(mergeGeoms(dots), new THREE.MeshBasicMaterial({ color: 0x53e07c }));
        shelter.add(dotMesh);
      }

      // ---- keyboard, trackball, mug, pencil, phone
      const kb = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.022, 0.22), new THREE.MeshStandardMaterial({ map: textures.keyboard(), roughness: 0.6 }));
      kb.position.set(-1.35, 0.802, CB + 0.83);
      kb.rotation.y = 0.03;
      kb.castShadow = true;
      shelter.add(kb);
      {
        const whiteParts = [
          placeGeo(new THREE.CylinderGeometry(0.041, 0.036, 0.1, 10), -0.32, 0.845, CB + 0.84),          // mug
          placeGeo(new THREE.TorusGeometry(0.028, 0.008, 6, 10), -0.275, 0.845, CB + 0.84, 0, 0, 0),     // handle
          placeGeo(new THREE.CylinderGeometry(0.05, 0.06, 0.02, 12), -0.85, 0.80, CB + 0.85),            // trackball base
        ];
        const wm = new THREE.Mesh(mergeGeoms(whiteParts), new THREE.MeshStandardMaterial({ color: 0xc9c2ae, roughness: 0.62 }));
        wm.castShadow = true;
        shelter.add(wm);
        const ball = new THREE.Mesh(new THREE.SphereGeometry(0.034, 12, 10), new THREE.MeshStandardMaterial({ color: 0x8c2016, roughness: 0.3 }));
        ball.position.set(-0.85, 0.822, CB + 0.85);
        shelter.add(ball);
        // grease pencil
        const pencil = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.14, 6), new THREE.MeshStandardMaterial({ color: 0xc9a227, roughness: 0.6 }));
        pencil.position.set(-1.95, 0.80, CB + 0.9);
        pencil.rotation.set(Math.PI / 2, 0, 0.5);
        shelter.add(pencil);
        // open duty logbook on the right bay
        const bookCover = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.012, 0.24), new THREE.MeshStandardMaterial({ color: 0x2a3325, roughness: 0.85 }));
        bookCover.position.set(-0.15, 0.795, CB + 0.86);
        bookCover.rotation.y = -0.12;
        bookCover.castShadow = true;
        shelter.add(bookCover);
        const pages = new THREE.Mesh(
          new THREE.PlaneGeometry(0.31, 0.21),
          new THREE.MeshStandardMaterial({ map: textures.clipboard(), roughness: 0.92 })
        );
        pages.rotation.set(-Math.PI / 2, 0, -0.12 + Math.PI / 2);
        pages.position.set(-0.15, 0.8025, CB + 0.86);
        shelter.add(pages);
      }
      // phone handset on a cradle at the right end + coiled cord
      {
        const darkParts = [
          placeGeo(new THREE.BoxGeometry(0.22, 0.05, 0.1), 0.52, 0.815, CB + 0.72),                // cradle
          placeGeo(new THREE.BoxGeometry(0.06, 0.045, 0.075), 0.455, 0.87, CB + 0.72),             // handset ear
          placeGeo(new THREE.BoxGeometry(0.06, 0.045, 0.075), 0.585, 0.87, CB + 0.72),             // handset mouth
          placeGeo(new THREE.BoxGeometry(0.15, 0.028, 0.05), 0.52, 0.878, CB + 0.72),              // handset bar
        ];
        const ph = new THREE.Mesh(mergeGeoms(darkParts), IM.bezel);
        ph.castShadow = true;
        shelter.add(ph);
      }

      // ---- switches (instanced), knobs, guard covers, blinking auth button
      {
        const swGeo = mergeGeoms([
          placeGeo(new THREE.CylinderGeometry(0.013, 0.015, 0.01, 8), 0, 0, 0),
          placeGeo(new THREE.CylinderGeometry(0.0045, 0.006, 0.042, 6), 0, 0.02, 0.008, 0.42),
        ]);
        swGeo.rotateX(Math.PI / 2 - SLOPE_A); // lie on the slope face
        const swItems = [];
        const swRow = (bayX0, n, s, pitch = 0.075) => {
          for (let i = 0; i < n; i++) {
            const [px, py, pz] = slopePt(bayX0 + i * pitch, s, 0.012);
            swItems.push({ x: px, y: py, z: pz, ry: srng.next() < 0.4 ? Math.PI : 0 });
          }
        };
        swRow(-3.28, 4, 0.30); swRow(-3.28, 4, 0.13);
        swRow(-1.62, 5, 0.30, 0.08);
        swRow(-0.06, 4, 0.30); swRow(-0.06, 4, 0.13);
        makeInstanced(swGeo, IM.steel, swItems, { parent: shelter, shadow: false });

        // rotary knobs on the PPI bay slope
        const knobGeo = mergeGeoms([
          placeGeo(new THREE.CylinderGeometry(0.02, 0.024, 0.025, 10), 0, 0.012, 0),
          placeGeo(new THREE.BoxGeometry(0.006, 0.014, 0.02), 0, 0.03, 0.006),
        ]);
        knobGeo.rotateX(Math.PI / 2 - SLOPE_A);
        const knobItems = [];
        for (let i = 0; i < 4; i++) {
          const [px, py, pz] = slopePt(-1.86 + i * 0.12, 0.115, 0.012);
          knobItems.push({ x: px, y: py, z: pz, ry: srng.range(-1.2, 1.2) });
        }
        makeInstanced(knobGeo, IM.bezel, knobItems, { parent: shelter, shadow: false });

        // red switch guards (U-channel covers) over the launch-auth pair
        const guardParts = [];
        const guardAt = (gx, s, open) => {
          const [px, py, pz] = slopePt(gx, s, 0.03);
          const rx = -SLOPE_A + (open ? -1.35 : 0);
          guardParts.push(placeGeo(new THREE.BoxGeometry(0.05, 0.09, 0.035), px, py + (open ? 0.045 : 0), pz + (open ? -0.02 : 0), rx));
        };
        guardAt(0.24, 0.30, false);
        guardAt(0.34, 0.30, true);
        const guards = new THREE.Mesh(mergeGeoms(guardParts), IM.red);
        guards.castShadow = true;
        shelter.add(guards);

        // blinking ENGAGE AUTH button (kept from the original console)
        const [bx, by, bz] = slopePt(0.5, 0.13, 0.02);
        const btn = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.042, 0.035, 14), new THREE.MeshStandardMaterial({ color: 0xaa1111, emissive: 0xcc2211, emissiveIntensity: 0.9, roughness: 0.4 }));
        btn.position.set(bx, by, bz);
        btn.rotation.x = Math.PI / 2 - SLOPE_A;
        shelter.add(btn);
        dynamic.push((dt, t2) => { btn.material.emissiveIntensity = 0.9 + Math.sin(t2 * 3.1) * 0.5; });
        // guard ring around it
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.052, 0.008, 6, 14), IM.red);
        ring.position.set(bx, by, bz);
        ring.rotation.x = -SLOPE_A + Math.PI / 2;
        shelter.add(ring);
      }

      // ---- headset on a hook (right cheek) + taped note (left cheek)
      {
        const hs = mergeGeoms([
          placeGeo(new THREE.TorusGeometry(0.085, 0.011, 6, 12, Math.PI), 0, 0, 0),
          placeGeo(new THREE.CylinderGeometry(0.042, 0.042, 0.028, 10), -0.085, -0.03, 0, 0, 0, Math.PI / 2),
          placeGeo(new THREE.CylinderGeometry(0.042, 0.042, 0.028, 10), 0.085, -0.03, 0, 0, 0, Math.PI / 2),
          placeGeo(new THREE.BoxGeometry(0.02, 0.05, 0.02), 0, 0.11, -0.02), // hook
        ]);
        const headset = new THREE.Mesh(hs, IM.bezel);
        headset.position.set(CX1 + 0.062, 1.42, CB + 0.52);
        headset.rotation.y = Math.PI / 2;
        headset.castShadow = true;
        shelter.add(headset);
        const note = new THREE.Mesh(
          new THREE.PlaneGeometry(0.14, 0.1),
          new THREE.MeshStandardMaterial({ map: textures.label('CHECK IFF CODES\nBEFORE RADIATE', { fg: '#3c3e38', bg: '#ddd8c4', w: 128, h: 96, font: 'bold 13px Arial' }), roughness: 0.9 })
        );
        note.position.set(CX0 - 0.065, 1.5, CB + 0.42);
        note.rotation.y = -Math.PI / 2;
        note.rotation.z = 0.06;
        shelter.add(note);
      }

      // ---- desk lamp at the left end (warm task light pool)
      {
        const arm = mergeGeoms([
          placeGeo(new THREE.CylinderGeometry(0.045, 0.055, 0.02, 10), 0, 0.01, 0),
          placeGeo(new THREE.CylinderGeometry(0.008, 0.008, 0.24, 6), 0.02, 0.12, 0.02, 0.25, 0, 0.15),
          placeGeo(new THREE.CylinderGeometry(0.007, 0.007, 0.2, 6), 0.09, 0.30, 0.1, 1.0, 0, 0.5),
        ]);
        const lampArm = new THREE.Mesh(arm, IM.bezel);
        lampArm.position.set(-3.15, 0.79, CB + 0.62);
        lampArm.castShadow = true;
        shelter.add(lampArm);
        const head = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.09, 12, 1, true), IM.bezel);
        head.position.set(-2.99, 1.06, CB + 0.72);
        head.rotation.set(1.1, 0, -0.5);
        shelter.add(head);
        const bulb = new THREE.Mesh(new THREE.CircleGeometry(0.04, 10), new THREE.MeshStandardMaterial({ color: 0xffe2b0, emissive: 0xffc873, emissiveIntensity: 1.25 }));
        bulb.position.copy(head.position);
        bulb.rotation.set(1.1 - Math.PI / 2, 0, -0.5);
        bulb.translateZ(-0.02);
        shelter.add(bulb);
      }
    }

    // ============================ HOLOGRAPHIC PLOT TABLE
    {
      const HTX = 2.4, HTZ = -0.6;
      const bodyParts = [
        placeGeo(new THREE.CylinderGeometry(0.74, 0.82, 0.16, 8), HTX, 0.08, HTZ),          // plinth
        placeGeo(new THREE.CylinderGeometry(0.95, 0.9, 0.13, 24), HTX, 0.845, HTZ),         // tabletop
      ];
      const tbody = new THREE.Mesh(mergeGeoms(bodyParts), IM.conBody);
      tbody.castShadow = true;
      tbody.receiveShadow = true;
      shelter.add(tbody);
      // darker column with vertical rib strips + chamfer collar under the top
      {
        const colParts = [
          placeGeo(new THREE.CylinderGeometry(0.6, 0.68, 0.62, 8), HTX, 0.47, HTZ),
          placeGeo(new THREE.CylinderGeometry(0.72, 0.62, 0.09, 24), HTX, 0.745, HTZ),      // collar
        ];
        for (let k = 0; k < 8; k++) {
          const a = (k / 8) * TAU + Math.PI / 8;
          colParts.push(placeGeo(new THREE.BoxGeometry(0.045, 0.5, 0.03), HTX + Math.cos(a) * 0.655, 0.45, HTZ + Math.sin(a) * 0.655, 0, -a + Math.PI / 2));
        }
        const col = new THREE.Mesh(mergeGeoms(colParts), IM.conDesk);
        col.castShadow = true;
        col.receiveShadow = true;
        shelter.add(col);
        // power feed from the column base into the floor channel
        const feed = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
          new THREE.Vector3(HTX - 0.32, 0.32, HTZ - 0.5),
          new THREE.Vector3(HTX - 0.42, 0.2, HTZ - 0.44),
          new THREE.Vector3(2.05, 0.165, -0.98),
        ]), 8, 0.022, 5), M.cable);
        feed.castShadow = false;
        shelter.add(feed);
      }
      // side control wedge facing the console
      const wedge = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.1, 0.26), IM.conDesk);
      wedge.position.set(HTX - 0.78, 0.85, HTZ - 0.3);
      wedge.rotation.y = 0.36;
      wedge.rotation.z = 0.16;
      wedge.castShadow = true;
      shelter.add(wedge);
      const wedgeTex = new THREE.Mesh(
        new THREE.PlaneGeometry(0.42, 0.22),
        new THREE.MeshStandardMaterial({ map: textures.consolePanel(), roughness: 0.55, metalness: 0.25, emissive: 0x16281c, emissiveIntensity: 0.5, emissiveMap: textures.consolePanel() })
      );
      wedgeTex.position.copy(wedge.position);
      wedgeTex.rotation.set(-Math.PI / 2 + 0.16, 0.0, -0.36, 'ZYX');
      wedgeTex.translateZ(0.052);
      shelter.add(wedgeTex);
      // engraved bearing ring on the tabletop
      const ringTex = new THREE.Mesh(
        new THREE.CircleGeometry(0.95, 32),
        new THREE.MeshStandardMaterial({ map: textures.holoRing(), transparent: true, roughness: 0.5, metalness: 0.3, polygonOffset: true, polygonOffsetFactor: -1 })
      );
      ringTex.rotation.x = -Math.PI / 2;
      ringTex.rotation.z = Math.PI / 2; // 000 at -z (north)
      ringTex.position.set(HTX, 0.9115, HTZ);
      shelter.add(ringTex);
      // recessed dark glass well
      const glass = new THREE.Mesh(
        new THREE.CylinderGeometry(0.8, 0.8, 0.03, 32),
        new THREE.MeshStandardMaterial({ color: 0x05171d, roughness: 0.16, metalness: 0.8 })
      );
      glass.position.set(HTX, 0.9, HTZ);
      shelter.add(glass);
      // soft emissive rim ring (kept below bloom-blowout levels)
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.835, 0.014, 8, 48), new THREE.MeshStandardMaterial({ color: 0x06222a, emissive: 0x27c4de, emissiveIntensity: 1.05 }));
      rim.position.set(HTX, 0.916, HTZ);
      rim.rotation.x = Math.PI / 2;
      shelter.add(rim);
      // projector emitter posts at 45° corners + emissive tips + center lens
      {
        const posts = [];
        const tips = [];
        for (let k = 0; k < 4; k++) {
          const a = Math.PI / 4 + (k * Math.PI) / 2;
          const px = HTX + Math.cos(a) * 0.7, pz = HTZ + Math.sin(a) * 0.7;
          posts.push(placeGeo(new THREE.CylinderGeometry(0.02, 0.026, 0.07, 8), px, 0.945, pz));
          tips.push(placeGeo(new THREE.CylinderGeometry(0.013, 0.013, 0.012, 8), px, 0.985, pz));
        }
        const postMesh = new THREE.Mesh(mergeGeoms(posts), IM.bezel);
        shelter.add(postMesh);
        const tipMat = new THREE.MeshStandardMaterial({ color: 0x0a2e36, emissive: 0x36d8ec, emissiveIntensity: 1.5 });
        const tipMesh = new THREE.Mesh(mergeGeoms(tips), tipMat);
        shelter.add(tipMesh);
        dynamic.push((dt, t2) => { tipMat.emissiveIntensity = 1.5 + Math.sin(t2 * 2.2) * 0.35; });
        const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.1, 0.018, 16), new THREE.MeshStandardMaterial({ color: 0x0a2e36, emissive: 0x2fc0d8, emissiveIntensity: 1.2 }));
        lens.position.set(HTX, 0.923, HTZ);
        shelter.add(lens);
      }
      colliders.push(makeColliderCyl(sx + HTX, sz + HTZ, 1.02, 0, 1.0));
      holoAnchor = new THREE.Object3D();
      holoAnchor.position.set(HTX, 0.98, HTZ);
      shelter.add(holoAnchor);
    }

    // equipment racks with detailed faces + blinking status LEDs
    addBox(M.darkMetal, 0.7, 2.1, 1.8, -W / 2 + 0.55, 1.05, 0.9, { parent: shelter, collide: true });
    addBox(M.darkMetal, 0.7, 2.1, 1.2, -W / 2 + 0.55, 1.05, -1.4, { parent: shelter, collide: true });
    {
      const faceX = -W / 2 + 0.55 + 0.36;
      const rackFaceMat = new THREE.MeshStandardMaterial({ map: textures.rackFace(), roughness: 0.7, metalness: 0.25 });
      const faces = mergeGeoms([
        placeGeo(scaleUV(new THREE.PlaneGeometry(1.8, 2.06), 2, 1), faceX, 1.05, 0.9, 0, Math.PI / 2),
        placeGeo(scaleUV(new THREE.PlaneGeometry(1.2, 2.06), 1, 1), faceX, 1.05, -1.4, 0, Math.PI / 2),
      ]);
      const faceMesh = new THREE.Mesh(faces, rackFaceMat);
      faceMesh.receiveShadow = true;
      shelter.add(faceMesh);

      // LEDs: one InstancedMesh, per-instance blink via instanceColor
      const ledGeo = new THREE.PlaneGeometry(0.038, 0.038);
      ledGeo.rotateY(Math.PI / 2);
      const ledMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const ledDefs = [];
      const ledCols = [];
      const zones = [[0.18, 1.62], [-1.92, -0.88]];
      for (let i = 0; i < 26; i++) {
        const [z0, z1] = zones[i % 2];
        ledDefs.push({ x: faceX + 0.006, y: 0.4 + rng.next() * 1.5, z: rng.range(z0, z1) });
        const base = new THREE.Color(rng.next() < 0.55 ? 0x2bff5e : rng.next() < 0.72 ? 0xffaa22 : 0xff3324);
        ledCols.push([base, rng.next() * 6, rng.range(1.6, 8)]);
      }
      const ledMesh = makeInstanced(ledGeo, ledMat, ledDefs, { shadow: false, receive: false, parent: shelter });
      const dim = new THREE.Color();
      ledCols.forEach(([c], i) => ledMesh.setColorAt(i, c));
      dynamic.push((dt, t2) => {
        for (let i = 0; i < ledCols.length; i++) {
          const [c, ph, fr] = ledCols[i];
          const on = Math.sin(t2 * fr + ph * 9) > -0.55;
          dim.copy(c).multiplyScalar(on ? 1 : 0.08);
          ledMesh.setColorAt(i, dim);
        }
        ledMesh.instanceColor.needsUpdate = true;
      });
    }

    // cable trays along ceiling + conduit drops + overhead looms (merged)
    {
      const trays = mergeGeoms([
        placeGeo(new THREE.BoxGeometry(0.34, 0.05, 4.6), -3.8, 2.72, -0.2),
        placeGeo(new THREE.BoxGeometry(4.9, 0.05, 0.34), -1.45, 2.72, -2.62),
        placeGeo(new THREE.BoxGeometry(0.24, 0.56, 0.06), -0.25, 2.42, -2.75), // drop into console (clear of the placard text)
        placeGeo(new THREE.BoxGeometry(0.3, 0.62, 0.3), -3.9, 2.41, 0.9),
        placeGeo(new THREE.BoxGeometry(0.3, 0.62, 0.3), -3.9, 2.41, -1.4),
      ]);
      const trayMesh = new THREE.Mesh(trays, M.darkMetal);
      trayMesh.castShadow = false;
      trayMesh.receiveShadow = true;
      shelter.add(trayMesh);
      // sagging cable bundles: rack loom into console top; console tail into
      // the floor channel toward the holo table; phone coil to the cheek
      const loomA = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
        new THREE.Vector3(-3.85, 2.14, 0.2),
        new THREE.Vector3(-3.72, 2.5, -1.1),
        new THREE.Vector3(-3.4, 2.2, -2.1),
        new THREE.Vector3(-3.1, 2.06, -2.5),
      ]), 16, 0.03, 5);
      const loomA2 = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
        new THREE.Vector3(-3.85, 2.1, 0.35),
        new THREE.Vector3(-3.66, 2.42, -0.9),
        new THREE.Vector3(-3.3, 2.12, -2.05),
        new THREE.Vector3(-3.0, 2.04, -2.45),
      ]), 16, 0.022, 5);
      const tail = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
        new THREE.Vector3(0.62, 0.7, -2.15),
        new THREE.Vector3(0.75, 0.18, -2.0),
        new THREE.Vector3(0.9, 0.06, -1.85),
      ]), 10, 0.024, 5);
      // coiled phone cord: helix desk -> right cheek
      const coilPts = [];
      for (let i = 0; i <= 60; i++) {
        const k = i / 60;
        coilPts.push(new THREE.Vector3(
          0.55 + k * 0.24 + Math.cos(k * 26) * 0.016,
          0.82 - Math.sin(k * Math.PI) * 0.1 - k * 0.02,
          -2.12 + Math.sin(k * 26) * 0.016
        ));
      }
      const coil = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(coilPts), 60, 0.006, 5);
      const cables = new THREE.Mesh(mergeGeoms([loomA, loomA2, tail, coil]), M.cable);
      cables.castShadow = false;
      shelter.add(cables);

      // floor cable channels: racks -> console, console -> holo table
      const chan = (x0, z0, x1, z1) => {
        const len = Math.hypot(x1 - x0, z1 - z0);
        const ry = Math.atan2(x1 - x0, z1 - z0);
        return { x: (x0 + x1) / 2, z: (z0 + z1) / 2, len, ry };
      };
      const runs = [chan(-3.5, -1.15, -2.7, -2.0), chan(0.68, -1.8, 2.05, -0.98)];
      const chanBodies = [];
      const chanTops = [];
      for (const r of runs) {
        chanBodies.push(placeGeo(new THREE.BoxGeometry(0.3, 0.02, r.len), r.x, 0.159, r.z, 0, r.ry));
        chanTops.push(placeGeo(scaleUV(new THREE.PlaneGeometry(0.3, r.len), 1, r.len / 0.9), r.x, 0.1705, r.z, -Math.PI / 2, r.ry));
      }
      const chanBodyMesh = new THREE.Mesh(mergeGeoms(chanBodies), M.rubber);
      chanBodyMesh.receiveShadow = true;
      shelter.add(chanBodyMesh);
      const chanTopMesh = new THREE.Mesh(mergeGeoms(chanTops), new THREE.MeshStandardMaterial({ map: textures.floorChannel(), roughness: 0.95 }));
      chanTopMesh.receiveShadow = true;
      shelter.add(chanTopMesh);
    }

    // wall furniture: sector map + clipboard (right wall over the holo table),
    // notice board, binder shelf, fire extinguisher + placards, breaker panel
    {
      // backing slab flush to the wall, map proud of it, thin frame strips proud of the map
      addBox(M.darkMetal, 0.04, 1.34, 1.76, iw - 0.026, 1.78, -1.35, { parent: shelter, castShadow: false });
      const map = new THREE.Mesh(
        new THREE.PlaneGeometry(1.64, 1.22),
        new THREE.MeshStandardMaterial({ map: textures.mapBoard(), roughness: 0.9 })
      );
      map.position.set(iw - 0.052, 1.78, -1.35);
      map.rotation.y = -Math.PI / 2;
      map.receiveShadow = true;
      shelter.add(map);
      const mapFrame = new THREE.Mesh(mergeGeoms([
        placeGeo(new THREE.BoxGeometry(0.026, 0.06, 1.76), iw - 0.055, 1.78 + 0.64, -1.35),
        placeGeo(new THREE.BoxGeometry(0.026, 0.06, 1.76), iw - 0.055, 1.78 - 0.64, -1.35),
        placeGeo(new THREE.BoxGeometry(0.026, 1.34, 0.06), iw - 0.055, 1.78, -1.35 - 0.85),
        placeGeo(new THREE.BoxGeometry(0.026, 1.34, 0.06), iw - 0.055, 1.78, -1.35 + 0.85),
      ]), IM.bezel);
      mapFrame.castShadow = false;
      shelter.add(mapFrame);
      const clip = new THREE.Mesh(
        new THREE.PlaneGeometry(0.2, 0.27),
        new THREE.MeshStandardMaterial({ map: textures.clipboard(), roughness: 0.9 })
      );
      clip.position.set(iw - 0.02, 1.5, -0.28);
      clip.rotation.y = -Math.PI / 2;
      clip.rotation.z = 0.05;
      shelter.add(clip);

      const notice = new THREE.Mesh(
        new THREE.PlaneGeometry(1.05, 0.78),
        new THREE.MeshStandardMaterial({ map: textures.noticeBoard(), roughness: 0.95 })
      );
      notice.position.set(iw - 0.02, 1.74, 0.55);
      notice.rotation.y = -Math.PI / 2;
      notice.receiveShadow = true;
      shelter.add(notice);

      // binder shelf + spines
      addBox(M.darkMetal, 0.05, 0.035, 0.92, iw - 0.14, 1.36, 1.62, { parent: shelter, castShadow: false });
      addBox(M.darkMetal, 0.05, 0.14, 0.03, iw - 0.03, 1.31, 1.25, { parent: shelter, castShadow: false });
      addBox(M.darkMetal, 0.05, 0.14, 0.03, iw - 0.03, 1.31, 1.99, { parent: shelter, castShadow: false });
      const spines = new THREE.Mesh(
        new THREE.PlaneGeometry(0.88, 0.42),
        new THREE.MeshStandardMaterial({ map: textures.binderSpines(), roughness: 0.9 })
      );
      spines.position.set(iw - 0.125, 1.59, 1.62);
      spines.rotation.y = -Math.PI / 2;
      spines.castShadow = false;
      shelter.add(spines);

      // fire extinguisher: bottle + hose + gauge + bracket + sign
      const extParts = mergeGeoms([
        placeGeo(new THREE.CylinderGeometry(0.072, 0.075, 0.5, 12), 0, 0, 0),
        placeGeo(new THREE.SphereGeometry(0.072, 12, 6), 0, 0.25, 0),
        placeGeo(new THREE.CylinderGeometry(0.02, 0.02, 0.1, 6), 0, 0.31, 0),
        placeGeo(new THREE.BoxGeometry(0.045, 0.045, 0.15), 0, 0.3, 0.06),
      ]);
      const ext = new THREE.Mesh(extParts, new THREE.MeshStandardMaterial({ color: 0x9e1c12, roughness: 0.42, metalness: 0.25 }));
      ext.position.set(iw - 0.15, 0.66, 2.25);
      ext.castShadow = true;
      shelter.add(ext);
      const hose = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
        new THREE.Vector3(iw - 0.15, 0.93, 2.33),
        new THREE.Vector3(iw - 0.1, 0.78, 2.38),
        new THREE.Vector3(iw - 0.12, 0.55, 2.34),
      ]), 8, 0.011, 5), M.cable);
      shelter.add(hose);
      addBox(M.darkMetal, 0.04, 0.1, 0.2, iw - 0.045, 0.62, 2.25, { parent: shelter, castShadow: false });
      const extSign = new THREE.Mesh(
        new THREE.PlaneGeometry(0.3, 0.3),
        new THREE.MeshBasicMaterial({ map: textures.label('FIRE', { fg: '#fff', bg: '#8c1c13', w: 96, h: 96, font: 'bold 40px Arial' }) })
      );
      extSign.position.set(iw - 0.02, 1.35, 2.25);
      extSign.rotation.y = -Math.PI / 2;
      shelter.add(extSign);

      // breaker panel on the left wall near the door end
      addBox(M.metal, 0.07, 0.72, 0.5, -iw + 0.05, 1.5, 2.15, { parent: shelter, castShadow: false });
      const bkLabel = new THREE.Mesh(
        new THREE.PlaneGeometry(0.42, 0.1),
        new THREE.MeshBasicMaterial({ map: textures.label('PWR DIST — 28V DC', { fg: '#d8d4c4', bg: '#3a3d33', w: 256, h: 48, font: 'bold 22px Arial' }) })
      );
      bkLabel.position.set(-iw + 0.095, 1.94, 2.15);
      bkLabel.rotation.y = Math.PI / 2;
      shelter.add(bkLabel);
      // UPS box beside the racks (+ kettle on top: crew comfort)
      addBox(M.darkMetal, 0.5, 0.42, 0.55, -W / 2 + 0.5, 0.36, -0.35, { parent: shelter });
      {
        const kettleParts = mergeGeoms([
          placeGeo(new THREE.CylinderGeometry(0.07, 0.082, 0.15, 12), 0, 0.075, 0),
          placeGeo(new THREE.CylinderGeometry(0.02, 0.02, 0.02, 8), 0, 0.16, 0),
          placeGeo(new THREE.TorusGeometry(0.045, 0.009, 6, 10, Math.PI), 0.078, 0.085, 0, 0, 0, -Math.PI / 2),
        ]);
        const kettle = new THREE.Mesh(kettleParts, new THREE.MeshStandardMaterial({ color: 0x3c3f42, roughness: 0.35, metalness: 0.7 }));
        kettle.position.set(-W / 2 + 0.42, 0.57, -0.28);
        kettle.castShadow = true;
        shelter.add(kettle);
      }

      // left wall near the door: first-aid kit, intercom, conduit, stencil
      {
        addBox(M.white, 0.055, 0.3, 0.34, -iw + 0.04, 1.42, 1.32, { parent: shelter, castShadow: false });
        const cross = new THREE.Mesh(
          new THREE.PlaneGeometry(0.16, 0.16),
          new THREE.MeshBasicMaterial({ map: textures.label('+', { fg: '#ffffff', bg: '#2e7d32', w: 64, h: 64, font: 'bold 52px Arial' }) })
        );
        cross.position.set(-iw + 0.07, 1.42, 1.32);
        cross.rotation.y = Math.PI / 2;
        shelter.add(cross);
        // intercom box + handset on its face
        addBox(M.tan, 0.07, 0.34, 0.24, -iw + 0.05, 1.5, 0.6, { parent: shelter, castShadow: false });
        const icParts = mergeGeoms([
          placeGeo(new THREE.BoxGeometry(0.03, 0.2, 0.07), 0, 0, 0),
          placeGeo(new THREE.BoxGeometry(0.035, 0.05, 0.075), 0, 0.085, 0),
          placeGeo(new THREE.BoxGeometry(0.035, 0.05, 0.075), 0, -0.085, 0),
        ]);
        const ic = new THREE.Mesh(icParts, IM.bezel);
        ic.position.set(-iw + 0.1, 1.5, 0.68);
        shelter.add(ic);
        const icLabel = new THREE.Mesh(
          new THREE.PlaneGeometry(0.18, 0.05),
          new THREE.MeshBasicMaterial({ map: textures.label('TA-343 INTERCOM', { fg: '#d8d4c4', bg: '#4a4d40', w: 192, h: 48, font: 'bold 19px Arial' }) })
        );
        icLabel.position.set(-iw + 0.087, 1.7, 0.6);
        icLabel.rotation.y = Math.PI / 2;
        shelter.add(icLabel);
        // vertical conduit with junction boxes feeding the breaker panel
        const conduitParts = mergeGeoms([
          placeGeo(new THREE.CylinderGeometry(0.018, 0.018, 2.2, 6), -iw + 0.04, 1.5, 1.78),
          placeGeo(new THREE.BoxGeometry(0.06, 0.12, 0.1), -iw + 0.045, 1.05, 1.78),
          placeGeo(new THREE.CylinderGeometry(0.014, 0.014, 0.32, 6), -iw + 0.04, 2.52, 1.96, Math.PI / 2),
        ]);
        const conduit = new THREE.Mesh(conduitParts, M.metal);
        conduit.castShadow = false;
        shelter.add(conduit);
        const bayStencil = new THREE.Mesh(
          new THREE.PlaneGeometry(0.5, 0.09),
          new THREE.MeshBasicMaterial({ map: textures.label('C2 BAY — SIGNAL PWR', { fg: '#c9c4ae', bg: null, w: 320, h: 56, font: 'bold 26px Arial' }), transparent: true })
        );
        bayStencil.position.set(-iw + 0.02, 2.16, 1.55);
        bayStencil.rotation.y = Math.PI / 2;
        shelter.add(bayStencil);
      }
    }

    // back-wall trim above the console: unit placard, clocks, ops status box
    {
      const placard = new THREE.Mesh(
        new THREE.PlaneGeometry(1.72, 0.21),
        new THREE.MeshBasicMaterial({ map: textures.label('IRONVEIL FIRE DIRECTION CENTER', { fg: '#d9d6c8', bg: '#31342c', w: 768, h: 92, font: 'bold 44px Arial' }) })
      );
      placard.position.set(-1.35, 2.40, -id + 0.012);
      shelter.add(placard);
      const clockHousings = mergeGeoms([
        placeGeo(new THREE.CylinderGeometry(0.155, 0.155, 0.045, 20), -2.75, 2.42, -id + 0.03, Math.PI / 2),
        placeGeo(new THREE.CylinderGeometry(0.155, 0.155, 0.045, 20), -3.35, 2.42, -id + 0.03, Math.PI / 2),
      ]);
      const clockMesh = new THREE.Mesh(clockHousings, M.darkMetal);
      clockMesh.castShadow = false;
      shelter.add(clockMesh);
      const clockA = new THREE.Mesh(new THREE.CircleGeometry(0.145, 20), new THREE.MeshStandardMaterial({ map: textures.clockFace('LOCAL', 1.1, 2.6), roughness: 0.5 }));
      clockA.position.set(-2.75, 2.42, -id + 0.056);
      shelter.add(clockA);
      const clockB = new THREE.Mesh(new THREE.CircleGeometry(0.145, 20), new THREE.MeshStandardMaterial({ map: textures.clockFace('ZULU', 4.2, 2.6), roughness: 0.5 }));
      clockB.position.set(-3.35, 2.42, -id + 0.056);
      shelter.add(clockB);
      // ops condition light box
      addBox(M.darkMetal, 0.56, 0.24, 0.07, 0.3, 2.42, -id + 0.045, { parent: shelter, castShadow: false });
      const opsOn = new THREE.Mesh(
        new THREE.PlaneGeometry(0.24, 0.16),
        new THREE.MeshBasicMaterial({ map: textures.label('OPS', { fg: '#0c2010', bg: '#57d879', w: 96, h: 64, font: 'bold 34px Arial' }), toneMapped: false })
      );
      opsOn.position.set(0.165, 2.42, -id + 0.085);
      shelter.add(opsOn);
      const opsOff = new THREE.Mesh(
        new THREE.PlaneGeometry(0.24, 0.16),
        new THREE.MeshStandardMaterial({ map: textures.label('RAID', { fg: '#4a1410', bg: '#241210', w: 96, h: 64, font: 'bold 34px Arial' }), roughness: 0.6 })
      );
      opsOff.position.set(0.435, 2.42, -id + 0.085);
      shelter.add(opsOff);
    }

    // door dressing: EXIT sign inside + threshold strip
    {
      const exit = new THREE.Mesh(
        new THREE.PlaneGeometry(0.42, 0.155),
        new THREE.MeshBasicMaterial({ map: textures.exitSign(), toneMapped: false })
      );
      exit.position.set(doorX, 2.32, id - 0.02);
      exit.rotation.y = Math.PI;
      shelter.add(exit);
      addBox(M.darkMetal, 0.46, 0.02, 0.05, doorX, 2.41, id - 0.045, { parent: shelter, castShadow: false });
      const thresh = new THREE.Mesh(new THREE.PlaneGeometry(doorW - 0.05, 0.16), M.hazard.clone());
      thresh.material.map = thresh.material.map.clone();
      thresh.material.map.repeat.set(3, 0.5);
      thresh.material.map.needsUpdate = true;
      thresh.rotation.x = -Math.PI / 2;
      thresh.position.set(doorX, 0.152, id - 0.1);
      shelter.add(thresh);
    }

    // operator chairs (two, merged buckets: dark fabric + near-black frame)
    {
      const chairFrameMat = new THREE.MeshStandardMaterial({ color: 0x17191a, roughness: 0.5, metalness: 0.55 });
      const chairFabMat = new THREE.MeshStandardMaterial({ color: 0x1a1d18, roughness: 0.98 });
      const chairAt = (cx, cz, yaw) => {
        const fab = [];
        const stl = [];
        const place = (geo, x, y, z, rx = 0, ry = 0, rz = 0) => {
          // rotate the part around the chair pivot by yaw, then translate
          const ca = Math.cos(yaw), sa = Math.sin(yaw);
          return placeGeo(geo, cx + x * ca + z * sa, y, cz - x * sa + z * ca, rx, ry + yaw, rz);
        };
        // five-star base with casters
        for (let k = 0; k < 5; k++) {
          const a = (k / 5) * TAU + 0.3;
          stl.push(place(new THREE.BoxGeometry(0.24, 0.03, 0.045), Math.cos(a) * 0.15, 0.055, Math.sin(a) * 0.15, 0, -a));
          stl.push(place(new THREE.SphereGeometry(0.026, 8, 6), Math.cos(a) * 0.255, 0.03, Math.sin(a) * 0.255));
        }
        // gas lift: sleeve + column
        stl.push(place(new THREE.CylinderGeometry(0.032, 0.038, 0.14, 8), 0, 0.13, 0));
        stl.push(place(new THREE.CylinderGeometry(0.02, 0.022, 0.26, 8), 0, 0.32, 0));
        stl.push(place(new THREE.BoxGeometry(0.3, 0.024, 0.2), 0, 0.445, 0)); // seat pan mount
        // seat: cushion + slightly smaller top pad (soft bevel read)
        fab.push(place(new THREE.BoxGeometry(0.45, 0.07, 0.43), 0, 0.49, 0.01));
        fab.push(place(new THREE.BoxGeometry(0.40, 0.024, 0.38), 0, 0.535, 0.01));
        // back post rising behind the seat, leaning back
        stl.push(place(new THREE.BoxGeometry(0.045, 0.36, 0.035), 0, 0.63, -0.245, -0.18));
        // backrest: main pad + lumbar pad, both leaning
        fab.push(place(new THREE.BoxGeometry(0.42, 0.5, 0.055), 0, 0.93, -0.29, -0.18));
        fab.push(place(new THREE.BoxGeometry(0.44, 0.16, 0.07), 0, 0.65, -0.245, -0.14));
        // armrests: L posts + pads
        for (const s of [-1, 1]) {
          stl.push(place(new THREE.BoxGeometry(0.026, 0.17, 0.03), s * 0.245, 0.585, 0.06));
          stl.push(place(new THREE.BoxGeometry(0.026, 0.03, 0.14), s * 0.245, 0.66, 0.0));
          fab.push(place(new THREE.BoxGeometry(0.055, 0.026, 0.22), s * 0.245, 0.685, 0.0));
        }
        return [fab, stl];
      };
      const [fabA, stlA] = chairAt(-1.25, -1.3, Math.PI - 0.15);
      const [fabB, stlB] = chairAt(-2.88, -1.36, Math.PI + 0.3);
      const fabMesh = new THREE.Mesh(mergeGeoms([...fabA, ...fabB]), chairFabMat);
      fabMesh.castShadow = true;
      shelter.add(fabMesh);
      const stlMesh = new THREE.Mesh(mergeGeoms([...stlA, ...stlB]), chairFrameMat);
      stlMesh.castShadow = true;
      shelter.add(stlMesh);
      colliders.push(makeColliderCyl(sx - 1.25, sz - 1.3, 0.34, 0, 1.2));
      colliders.push(makeColliderCyl(sx - 2.88, sz - 1.36, 0.34, 0, 1.2));
    }

    // ---- interior lighting rig (time-of-day aware; see handler below)
    // main light hangs below the ceiling plane so the tiles don't blow out
    const lamp = new THREE.PointLight(0xe8f0ff, 7, 12, 2);
    lamp.position.set(0, H - 0.95, 0.3);
    shelter.add(lamp);
    const consoleGlow = new THREE.PointLight(0x86e8bc, 1.7, 2.7, 2);
    consoleGlow.position.set(-1.2, 1.5, -1.5);
    shelter.add(consoleGlow);
    // moderately desaturated cyan: a pure-cyan point light turns any warm
    // floor paint lime green at night
    const holoGlow = new THREE.PointLight(0x66c8dc, 1.6, 3.0, 2);
    holoGlow.position.set(2.4, 1.55, -0.6);
    shelter.add(holoGlow);
    // warm task-light pool from the desk lamp at the console's left end
    const deskPool = new THREE.PointLight(0xffd9a0, 0.9, 1.9, 2);
    deskPool.position.set(-2.99, 1.12, CB + 0.75);
    shelter.add(deskPool);
    // twin louvered troffers (emissive lens + dark ribs so they never blow out)
    const troffMat = new THREE.MeshStandardMaterial({ color: 0xf4f6f0, emissive: 0xdfe8ff, emissiveIntensity: 0.62 });
    {
      const housings = mergeGeoms([
        placeGeo(new THREE.BoxGeometry(1.0, 0.055, 0.42), -1.5, H - 0.095, 0.25),
        placeGeo(new THREE.BoxGeometry(1.0, 0.055, 0.42), 1.5, H - 0.095, 0.25),
      ]);
      const hMesh = new THREE.Mesh(housings, M.metal);
      hMesh.castShadow = false;
      shelter.add(hMesh);
      const lenses = mergeGeoms([
        placeGeo(new THREE.PlaneGeometry(0.9, 0.34), -1.5, H - 0.124, 0.25, Math.PI / 2),
        placeGeo(new THREE.PlaneGeometry(0.9, 0.34), 1.5, H - 0.124, 0.25, Math.PI / 2),
      ]);
      const lensMesh = new THREE.Mesh(lenses, troffMat);
      lensMesh.castShadow = false;
      shelter.add(lensMesh);
      const ribs = [];
      for (const fx of [-1.5, 1.5]) {
        for (let k = -2; k <= 2; k++) ribs.push(placeGeo(new THREE.BoxGeometry(0.02, 0.02, 0.36), fx + k * 0.18, H - 0.128, 0.25));
      }
      const ribMesh = new THREE.Mesh(mergeGeoms(ribs), M.darkMetal);
      ribMesh.castShadow = false;
      shelter.add(ribMesh);
    }
    // red battle lamps (dark by day, glowing at night)
    const domeMat = new THREE.MeshStandardMaterial({ color: 0x481410, emissive: 0xff2a1a, emissiveIntensity: 0.0, roughness: 0.35 });
    {
      const domes = mergeGeoms([
        placeGeo(new THREE.SphereGeometry(0.075, 12, 8, 0, TAU, 0, Math.PI / 2), -0.6, H - 0.07, -1.9, Math.PI),
        placeGeo(new THREE.SphereGeometry(0.075, 12, 8, 0, TAU, 0, Math.PI / 2), 1.7, H - 0.07, 1.9, Math.PI),
      ]);
      const domeMesh = new THREE.Mesh(domes, domeMat);
      domeMesh.castShadow = false;
      shelter.add(domeMesh);
      const cages = [];
      for (const [dx, dz] of [[-0.6, -1.9], [1.7, 1.9]]) {
        for (let k = 0; k < 3; k++) {
          cages.push(placeGeo(new THREE.TorusGeometry(0.08, 0.005, 4, 10, Math.PI), dx, H - 0.07, dz, Math.PI / 2, (k * Math.PI) / 3));
        }
      }
      const cageMesh = new THREE.Mesh(mergeGeoms(cages), M.darkMetal);
      cageMesh.castShadow = false;
      shelter.add(cageMesh);
    }
    interiorLights = { lamp, consoleGlow, holoGlow, deskPool, troffMat, domeMat, panelMat: IM.panelTex };

    // roof antennas + AC
    addBox(M.metal, 1.1, 0.8, 0.9, W / 2 - 1, H + 0.55, -1.4, { parent: shelter });
    const whip = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.02, 3.4, 5), M.darkMetal);
    whip.position.set(-W / 2 + 0.7, H + 1.85, -2);
    shelter.add(whip);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 8), M.white);
    dome.position.set(-2, H + 0.3, 1.8);
    shelter.add(dome);
    // (sandbag revetment at the door is placed by the clutter pass below)
    // signage
    const plate = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.42), new THREE.MeshBasicMaterial({ map: textures.label('BATTERY CONTROL — C2 SHELTER', { fg: '#e5e2d4', bg: '#3a3d33', w: 512, h: 80, font: 'bold 34px Arial' }) }));
    plate.position.set(0.4, 2.6, D / 2 + 0.09);
    shelter.add(plate);

    // every interior surface must sample the sun shadow map, or direct sun
    // "leaks" through the roof and bleaches whatever has receiveShadow=false
    shelter.traverse((o) => {
      if (o.isMesh) o.receiveShadow = true;
    });

    consolePos = new THREE.Vector3(sx - 1.2, 0, sz - D / 2 + 2.0);
  }

  // ============================================================ RADAR INSTALLATION
  // Centerpiece: raised octagonal platform with railing + stairs, big rotating
  // phased array on a proper pedestal, support cabin, IFF dish, cable run to
  // the C2 shelter, warning signage.
  const radarGroup = new THREE.Group();
  radarGroup.position.set(36, 0, -28);
  group.add(radarGroup);
  let radarHead;
  {
    const RX = 36, RZ = -28; // world center
    // gravel skirt + platform + hazard edge band
    const gravelTex = textures.gravel().clone();
    gravelTex.repeat.set(9, 9);
    gravelTex.needsUpdate = true;
    const skirt = new THREE.Mesh(new THREE.CircleGeometry(12, 36), new THREE.MeshStandardMaterial({ map: gravelTex, color: 0x99805e, roughness: 1 }));
    skirt.rotation.x = -Math.PI / 2;
    skirt.position.y = 0.013;
    skirt.receiveShadow = true;
    radarGroup.add(skirt);
    // platform: darker aged pour than the apron so the step reads clearly
    const platMat = M.concretePad.clone();
    platMat.color.setHex(0x7e7c74);
    const platform = new THREE.Mesh(new THREE.CylinderGeometry(8, 8.5, 0.6, 8), platMat);
    platform.position.y = 0.3;
    platform.castShadow = true;
    platform.receiveShadow = true;
    radarGroup.add(platform);
    const platTopTex = textures.concrete().clone();
    platTopTex.repeat.set(1.6, 1.6);
    platTopTex.needsUpdate = true;
    const platTop = new THREE.Mesh(
      new THREE.CircleGeometry(7.99, 8),
      new THREE.MeshStandardMaterial({ map: platTopTex, color: 0x8d8b83, roughness: 0.94, polygonOffset: true, polygonOffsetFactor: -1 })
    );
    platTop.rotation.x = -Math.PI / 2;
    platTop.position.y = 0.602;
    platTop.receiveShadow = true;
    radarGroup.add(platTop);
    const edgeBand = new THREE.Mesh(new THREE.RingGeometry(7.35, 7.95, 8), M.hazard.clone());
    edgeBand.material.color.setScalar(0.62);
    edgeBand.material.transparent = true;
    edgeBand.material.opacity = 0.8;
    edgeBand.material.polygonOffset = true;
    edgeBand.material.polygonOffsetFactor = -2;
    edgeBand.rotation.x = -Math.PI / 2;
    edgeBand.rotation.z = Math.PI / 8;
    edgeBand.position.y = 0.605;
    edgeBand.receiveShadow = true;
    radarGroup.add(edgeBand);
    colliders.push(makeColliderCyl(RX, RZ, 8.7, 0, 1.9));

    // railing (posts + two rails, gap on the -x side for the stairs) + ladder
    {
      const parts = [];
      const NPOST = 18, RR = 7.62;
      const gapAt = Math.PI; // stairs face -x
      const postGeo = new THREE.CylinderGeometry(0.028, 0.028, 1.05, 6);
      const ang = [];
      for (let k = 0; k < NPOST; k++) {
        const a = (k / NPOST) * TAU;
        if (Math.abs(((a - gapAt + Math.PI * 3) % TAU) - Math.PI) < 0.24) continue;
        ang.push(a);
        parts.push(placeGeo(postGeo, Math.cos(a) * RR, 1.12, Math.sin(a) * RR));
      }
      const railGeo = new THREE.CylinderGeometry(0.02, 0.02, 1, 6);
      railGeo.rotateX(Math.PI / 2); // axis along +z so yaw + z-scale aims it
      for (let k = 0; k < ang.length; k++) {
        const a0 = ang[k], a1 = ang[(k + 1) % ang.length];
        let d = a1 - a0;
        if (d < 0) d += TAU;
        if (d > (TAU / NPOST) * 1.5) continue; // skip across the stairs gap
        const x0 = Math.cos(a0) * RR, z0 = Math.sin(a0) * RR;
        const x1 = Math.cos(a1) * RR, z1 = Math.sin(a1) * RR;
        const len = Math.hypot(x1 - x0, z1 - z0);
        const ry = Math.atan2(x1 - x0, z1 - z0);
        for (const y of [1.6, 1.18]) {
          parts.push(placeGeo(railGeo, (x0 + x1) / 2, y, (z0 + z1) / 2, 0, ry, 0, 1, 1, len));
        }
      }
      // pedestal access ladder rungs+rails on +z side
      for (let i = 0; i < 8; i++) parts.push(placeGeo(new THREE.BoxGeometry(0.34, 0.03, 0.03), 0, 0.9 + i * 0.42, 1.62));
      parts.push(placeGeo(new THREE.CylinderGeometry(0.022, 0.022, 3.5, 5), -0.18, 2.35, 1.62));
      parts.push(placeGeo(new THREE.CylinderGeometry(0.022, 0.022, 3.5, 5), 0.18, 2.35, 1.62));
      const railing = new THREE.Mesh(mergeGeoms(parts), M.steel);
      railing.castShadow = true;
      radarGroup.add(railing);
    }

    // steel stairs down the -x side (treads, stringers, sloped handrails)
    {
      const parts = [];
      for (let i = 0; i < 4; i++) {
        parts.push(placeGeo(new THREE.BoxGeometry(0.4, 0.05, 1.7), -8.15 - i * 0.38, 0.5 - i * 0.15, 0));
      }
      for (const s of [-1, 1]) {
        parts.push(placeGeo(new THREE.BoxGeometry(1.9, 0.07, 0.05), -8.75, 0.32, s * 0.86, 0, 0, 0.34));
        parts.push(placeGeo(new THREE.BoxGeometry(1.9, 0.05, 0.04), -8.75, 0.95, s * 0.86, 0, 0, 0.34));
        parts.push(placeGeo(new THREE.BoxGeometry(0.04, 0.67, 0.04), -8.1, 0.84, s * 0.86));
        parts.push(placeGeo(new THREE.BoxGeometry(0.04, 0.72, 0.04), -9.4, 0.37, s * 0.86));
      }
      const stairs = new THREE.Mesh(mergeGeoms(parts), M.darkMetal);
      stairs.castShadow = true;
      radarGroup.add(stairs);
      colliders.push(makeColliderBox(RX - 8.9, RZ, 0.85, 1.0, 0, 0, 1.4));
    }

    // pedestal: base drum + tower + junction boxes + waveguide
    {
      const parts = [
        placeGeo(new THREE.CylinderGeometry(1.75, 2.0, 0.55, 12), 0, 0.87, 0),
        placeGeo(new THREE.CylinderGeometry(1.0, 1.5, 2.9, 12), 0, 2.6, 0),
        placeGeo(new THREE.BoxGeometry(0.55, 0.75, 0.3), 1.2, 1.6, 0.6, 0, -0.5),
        placeGeo(new THREE.BoxGeometry(0.4, 0.5, 0.25), -1.15, 1.5, -0.6, 0, 0.6),
      ];
      // desert-tan pedestal so the olive array reads separately from its mount
      const pedestal = new THREE.Mesh(mergeGeoms(parts), M.tan);
      pedestal.castShadow = true;
      pedestal.receiveShadow = true;
      radarGroup.add(pedestal);
      const bearing = new THREE.Mesh(new THREE.CylinderGeometry(0.78, 0.95, 0.45, 12), M.darkMetal);
      bearing.position.y = 4.25;
      bearing.castShadow = true;
      radarGroup.add(bearing);
    }

    // rotating head: yoke, trunnions, big tilted array, truss, IFF bar
    radarHead = new THREE.Group();
    radarHead.position.y = 4.5;
    radarGroup.add(radarHead);
    {
      const metalParts = [
        placeGeo(new THREE.BoxGeometry(2.7, 0.55, 1.7), 0, 0.27, 0),                 // yoke
        placeGeo(new THREE.BoxGeometry(0.38, 1.5, 0.55), -1.35, 1.15, 0),            // trunnion arms
        placeGeo(new THREE.BoxGeometry(0.38, 1.5, 0.55), 1.35, 1.15, 0),
        placeGeo(new THREE.CylinderGeometry(0.16, 0.16, 3.05, 8), 0, 1.8, 0, 0, 0, Math.PI / 2), // elevation axle
        placeGeo(new THREE.BoxGeometry(0.85, 0.8, 0.75), -0.85, 1.75, 0.95),         // counterweights (behind face)
        placeGeo(new THREE.BoxGeometry(0.85, 0.8, 0.75), 0.85, 1.75, 0.95),
        placeGeo(new THREE.CylinderGeometry(0.05, 0.05, 2.6, 6), -1.7, 1.55, 0.75, 0.65),  // truss struts
        placeGeo(new THREE.CylinderGeometry(0.05, 0.05, 2.6, 6), 1.7, 1.55, 0.75, 0.65),
        placeGeo(new THREE.CylinderGeometry(0.06, 0.06, 1.6, 6), 0, 0.9, 0.65, 0.5), // waveguide up the back
      ];
      const headMetal = new THREE.Mesh(mergeGeoms(metalParts), M.metal);
      headMetal.castShadow = true;
      radarHead.add(headMetal);

      const panel = new THREE.Group();
      panel.position.set(0, 2.15, 0.1);
      panel.rotation.x = -0.30;
      radarHead.add(panel);
      const face = new THREE.Mesh(new THREE.BoxGeometry(6.3, 4.05, 0.42), M.olive);
      face.castShadow = true;
      panel.add(face);
      const grid = new THREE.Mesh(
        new THREE.PlaneGeometry(5.85, 3.65),
        new THREE.MeshStandardMaterial({ map: textures.radarArray(), roughness: 0.82 })
      );
      grid.position.z = 0.215;
      panel.add(grid);
      // IFF bar antenna riding on top of the array
      const iffParts = mergeGeoms([
        placeGeo(new THREE.BoxGeometry(2.6, 0.07, 0.07), 0, 2.35, 0),
        placeGeo(new THREE.BoxGeometry(0.05, 0.32, 0.05), -0.9, 2.19, 0),
        placeGeo(new THREE.BoxGeometry(0.05, 0.32, 0.05), 0.9, 2.19, 0),
      ]);
      const iff = new THREE.Mesh(iffParts, M.darkMetal);
      iff.castShadow = true;
      panel.add(iff);
      // obstruction light on the array's top edge
      const obl = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), M.redLight.clone());
      obl.position.set(0, 2.25, 0.12);
      panel.add(obl);
      dynamic.push((dt, t2) => {
        radarHead.rotation.y = (t2 * 0.85) % TAU;
        obl.material.emissiveIntensity = Math.sin(t2 * 2.4) > 0 ? 2.6 : 0.15;
      });
    }

    // small IFF/comms dish on its own mount, counter-rotating slowly
    {
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 2.0, 8), M.darkMetal);
      mast.position.set(5.0, 1.6, 3.4);
      mast.castShadow = true;
      radarGroup.add(mast);
      const dishPivot = new THREE.Group();
      dishPivot.position.set(5.0, 2.7, 3.4);
      radarGroup.add(dishPivot);
      const pts = [];
      for (let i = 0; i <= 8; i++) {
        const r = (i / 8) * 0.62;
        pts.push(new THREE.Vector2(r, r * r * 0.55));
      }
      const dish = new THREE.Mesh(new THREE.LatheGeometry(pts, 14), new THREE.MeshStandardMaterial({ color: 0xb8bdb2, roughness: 0.55, metalness: 0.4, side: THREE.DoubleSide }));
      dish.rotation.x = -0.95;
      dish.castShadow = true;
      dishPivot.add(dish);
      const feed = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.5, 5), M.steel);
      feed.rotation.x = -0.95;
      feed.position.set(0, 0.22, 0.1);
      dishPivot.add(feed);
      dynamic.push((dt, t2) => { dishPivot.rotation.y = Math.sin(t2 * 0.22) * 1.4 + 0.6; });
    }

    // support cabin on the platform + door label
    {
      const cabin = addBox(M.olive, 2.5, 1.75, 1.55, 4.1, 0.6 + 0.875, -3.3, { parent: radarGroup, rot: -0.25 });
      void cabin;
      const vent = addBox(M.darkMetal, 0.7, 0.35, 0.1, 4.1 + 0.5, 1.9, -3.3 + 0.72, { parent: radarGroup, rot: -0.25, castShadow: false });
      void vent;
      // door plate on the cabin's outward (-z local) face
      const nx = Math.sin(-0.25) * -1, nz = Math.cos(-0.25) * -1; // world normal of -z face
      const doorPlate = new THREE.Mesh(
        new THREE.PlaneGeometry(0.62, 1.3),
        new THREE.MeshStandardMaterial({ map: textures.label('R-1', { fg: '#d8d4c4', bg: '#4b503f', w: 96, h: 192, font: 'bold 40px Arial' }), roughness: 0.85 })
      );
      doorPlate.position.set(4.1 + nx * 0.79, 1.3, -3.3 + nz * 0.79);
      doorPlate.rotation.y = Math.atan2(nx, nz);
      radarGroup.add(doorPlate);
    }

    // warning signage hung on the railing (placed by ring angle, facing out)
    {
      const sign = (tex, a, w = 1.15, h = 0.6) => {
        const s = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide }));
        s.position.set(Math.cos(a) * 7.66, 1.35, Math.sin(a) * 7.66);
        s.rotation.y = Math.atan2(Math.cos(a), Math.sin(a));
        radarGroup.add(s);
      };
      sign(textures.label('DANGER — RF RADIATION HAZARD', { fg: '#fff', bg: '#8c1c13', w: 512, h: 120, font: 'bold 34px Arial' }), Math.PI * 0.86);
      sign(textures.label('RADAR SITE R-1 — AUTHORIZED PERSONNEL ONLY', { fg: '#e8e4d4', bg: '#3a3d33', w: 640, h: 110, font: 'bold 30px Arial' }), Math.PI * 0.38);
    }

    // buried-cable run to the C2 shelter with junction boxes en route
    {
      const path = new THREE.CatmullRomCurve3([
        new THREE.Vector3(28.2, 0.07, -27.6),
        new THREE.Vector3(14, 0.06, -24.5),
        new THREE.Vector3(-2, 0.06, -21.5),
        new THREE.Vector3(-16, 0.06, -19.5),
        new THREE.Vector3(-27.2, 0.5, -18.4),
      ].map((v) => v.sub(new THREE.Vector3(RX, 0, RZ)))); // to radarGroup space
      const tube = new THREE.Mesh(new THREE.TubeGeometry(path, 42, 0.05, 6), M.cable);
      tube.castShadow = false;
      radarGroup.add(tube);
      const jboxes = mergeGeoms([
        placeGeo(new THREE.BoxGeometry(0.5, 0.42, 0.35), 14 - RX, 0.21, -24.5 - RZ, 0, 0.2),
        placeGeo(new THREE.BoxGeometry(0.5, 0.42, 0.35), -16 - RX, 0.21, -19.5 - RZ, 0, -0.15),
      ]);
      const jb = new THREE.Mesh(jboxes, M.tan);
      jb.castShadow = true;
      radarGroup.add(jb);
    }

    // support trailer parked off the platform (world collider)
    {
      const TLX = 13.5, TLZ = 3.6, TROT = 0.35;
      const trailer = addBox(M.olive, 4.6, 1.5, 2.2, TLX, 1.05, TLZ, { parent: radarGroup, rot: TROT });
      void trailer;
      colliders.push(makeColliderBox(RX + TLX, RZ + TLZ, 2.5, 1.3, TROT, 0, 2));
      const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.3, 14);
      const wheels = [];
      for (const [wx, wz] of [[-1.5, -1.05], [1.5, -1.05], [-1.5, 1.05], [1.5, 1.05]]) {
        wheels.push(placeGeo(wheelGeo, TLX + wx * Math.cos(TROT) - wz * Math.sin(TROT), 0.42, TLZ + wx * Math.sin(TROT) + wz * Math.cos(TROT), 0, TROT, Math.PI / 2));
      }
      const wheelMesh = new THREE.Mesh(mergeGeoms(wheels), M.rubber);
      wheelMesh.castShadow = true;
      radarGroup.add(wheelMesh);
      // feeder cable trailer -> pedestal
      const feed = new THREE.Mesh(
        new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
          new THREE.Vector3(TLX - 2.0, 0.7, TLZ - 0.6),
          new THREE.Vector3(8.5, 0.1, 2.2),
          new THREE.Vector3(2.2, 0.65, 0.8),
        ]), 16, 0.035, 5),
        M.cable
      );
      feed.castShadow = false;
      radarGroup.add(feed);
    }
  }

  // ============================================================ FLOODLIGHT TOWERS
  const floodlights = [];
  {
    const spots = [[-52, -40], [52, -40], [-52, 44], [56, 44]];
    for (const [x, z] of spots) {
      const tw = new THREE.Group();
      tw.position.set(x, 0, z);
      group.add(tw);
      // galvanized pole — a pure-black 11m silhouette against the sky reads
      // as a rendering artifact from across the apron
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.22, 11, 8), M.steel);
      mast.position.y = 5.5;
      mast.castShadow = true;
      tw.add(mast);
      colliders.push(makeColliderCyl(x, z, 0.45, 0, 11));
      const cross = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.16, 0.16), M.steel);
      cross.position.y = 10.6;
      tw.add(cross);
      const headMat = new THREE.MeshStandardMaterial({ color: 0x83888e, emissive: 0x000000, roughness: 0.5, metalness: 0.4 });
      const headGeo = mergeGeoms([-0.8, 0, 0.8].map((s) =>
        placeGeo(new THREE.BoxGeometry(0.5, 0.34, 0.3), s, 10.45, 0.15, 0.7)
      ));
      const heads = new THREE.Mesh(headGeo, headMat);
      heads.castShadow = true;
      tw.add(heads);
      const spot = new THREE.SpotLight(0xdfe8ff, 0, 90, 0.62, 0.5, 1.4);
      spot.position.set(0, 10.4, 0);
      spot.target.position.set(x * -0.35, 0, z * -0.35);
      tw.add(spot);
      group.add(spot.target);
      spot.target.position.set(x * 0.55, 0, z * 0.55);
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: textures.hardFlare(), color: 0xcfe0ff, transparent: true, opacity: 0, depthWrite: false }));
      glow.scale.setScalar(3.2);
      glow.position.y = 10.5;
      tw.add(glow);
      floodlights.push({ spot, glow, headMat });
    }
  }

  // ============================================================ GENERATORS + CABLES
  const generators = [];
  {
    const genAt = (x, z, rot, cableTo) => {
      const g2 = new THREE.Group();
      g2.position.set(x, 0, z);
      g2.rotation.y = rot;
      group.add(g2);
      addBox(M.olive, 2.3, 1.35, 1.3, 0, 0.75, 0, { parent: g2 });
      colliders.push(makeColliderBox(x, z, 1.3, 0.8, rot, 0, 1.6));
      addBox(M.darkMetal, 2.0, 0.12, 1.1, 0, 1.48, 0, { parent: g2, castShadow: false });
      const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.7, 8), M.darkMetal);
      pipe.position.set(0.8, 1.75, -0.3);
      g2.add(pipe);
      const vent = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.7), M.rubber);
      vent.position.set(1.16, 0.75, 0);
      vent.rotation.y = Math.PI / 2;
      g2.add(vent);
      const lightM = M.greenLight.clone();
      const led = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), lightM);
      led.position.set(-1.0, 1.2, 0.66);
      g2.add(led);
      // fuel can + blob shadow
      addBox(M.tan, 0.4, 0.5, 0.25, -1.6, 0.25, 0.3, { parent: g2 });
      // sagging cable to consumer
      if (cableTo) {
        const from = new THREE.Vector3(x, 1.0, z);
        const to = new THREE.Vector3(cableTo[0], cableTo[2] ?? 0.5, cableTo[1]);
        const mid = from.clone().lerp(to, 0.5);
        mid.y = Math.min(from.y, to.y) * 0.5 - 0.1;
        mid.y = Math.max(0.08, mid.y);
        const curve = new THREE.CatmullRomCurve3([from, mid, to]);
        const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 20, 0.035, 6), M.cable);
        group.add(tube);
      }
      generators.push({ position: new THREE.Vector3(x, 0.8, z) });
      return g2;
    };
    genAt(-38, 24, 0.4, [-46, 30, 1.2]);
    genAt(10, 42, -0.5, [2, 48, 1.2]);
    genAt(40, 36, 0.9, [48, 30, 1.2]);
    genAt(-25, -13, 1.57, [-28, -16, 1.0]);
    genAt(30, -21, -0.7, [34, -26, 1.4]);
  }

  // ============================================================ SUPPORT TRUCKS
  {
    const wheelItems = [];
    const ribItems = [];
    const blobItems = [];
    const local = (x, z, rot, lx, lz) => [x + lx * Math.cos(rot) + lz * Math.sin(rot), z - lx * Math.sin(rot) + lz * Math.cos(rot)];
    const truckAt = (x, z, rot) => {
      const t2 = new THREE.Group();
      t2.position.set(x, 0, z);
      t2.rotation.y = rot;
      group.add(t2);
      // chassis + cab + bed
      addBox(M.darkMetal, 2.3, 0.5, 7.2, 0, 0.75, 0, { parent: t2 });
      const cab = addBox(M.tan, 2.3, 1.5, 1.9, 0, 1.75, 2.55, { parent: t2 });
      void cab;
      const winShield = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 0.62), M.glassDark);
      winShield.position.set(0, 2.05, 3.51);
      winShield.rotation.x = -0.18;
      t2.add(winShield);
      const bed = addBox(M.olive, 2.4, 1.55, 4.6, 0, 1.85, -0.9, { parent: t2 });
      void bed;
      // canvas ribs + wheels + ground blob collected for instancing
      for (let i = 0; i < 4; i++) {
        const [rx2, rz2] = local(x, z, rot, 0, -2.9 + i * 1.35);
        ribItems.push({ x: rx2, y: 1.9, z: rz2, rx: 0, ry: Math.PI / 2 + rot, rz: Math.PI / 2 });
      }
      for (const [wx, wz] of [[-1.05, 2.4], [1.05, 2.4], [-1.05, -0.2], [1.05, -0.2], [-1.05, -1.6], [1.05, -1.6], [-1.05, -2.9], [1.05, -2.9]]) {
        const [wx2, wz2] = local(x, z, rot, wx, wz);
        wheelItems.push({ x: wx2, y: 0.55, z: wz2, ry: rot, rz: Math.PI / 2 });
      }
      blobItems.push({ x, y: 0.05, z, rx: -Math.PI / 2, rz: -rot });
      colliders.push(makeColliderBox(x, z, 1.4, 3.8, rot, 0, 3.2));
      return t2;
    };
    truckAt(-16, -36, 0.12);
    truckAt(-26, -36, -0.06);
    truckAt(78, 10, 1.2);
    makeInstanced(new THREE.TorusGeometry(1.18, 0.03, 6, 12, Math.PI), M.olive, ribItems, { shadow: false });
    makeInstanced(new THREE.CylinderGeometry(0.55, 0.55, 0.4, 16), M.rubber, wheelItems);
    const blobGeo = new THREE.PlaneGeometry(3.6, 8.4);
    const blobMesh = makeInstanced(blobGeo, new THREE.MeshBasicMaterial({ map: textures.softPuff(), color: 0x000000, transparent: true, opacity: 0.4, depthWrite: false }), blobItems, { shadow: false, receive: false });
    blobMesh.renderOrder = 1;
  }

  // ============================================================ ANTENNA MAST FARM
  {
    const masts = [[16, -44, 17], [24, -48, 12], [10, -50, 14]];
    const wirePts = [];
    for (const [x, z, h] of masts) {
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.16, h, 6), M.steel);
      mast.position.set(x, h / 2, z);
      mast.castShadow = true;
      group.add(mast);
      colliders.push(makeColliderCyl(x, z, 0.35, 0, h));
      const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), M.redLight.clone());
      beacon.position.set(x, h + 0.15, z);
      group.add(beacon);
      const ph = rng.next() * 6;
      dynamic.push((dt, t2) => { beacon.material.emissiveIntensity = Math.sin(t2 * 1.8 + ph) > 0.2 ? 2.8 : 0.1; });
      // guy wires (batched into one LineSegments below)
      for (let k = 0; k < 3; k++) {
        const a = (k / 3) * TAU + 0.4;
        wirePts.push(new THREE.Vector3(x, h * 0.85, z), new THREE.Vector3(x + Math.cos(a) * h * 0.55, 0, z + Math.sin(a) * h * 0.55));
      }
      // crossarms
      const arm = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.05, 0.05), M.steel);
      arm.position.set(x, h * 0.82, z);
      arm.rotation.y = rng.next() * 3;
      group.add(arm);
    }
    const wires = new THREE.LineSegments(
      new THREE.BufferGeometry().setFromPoints(wirePts),
      new THREE.LineBasicMaterial({ color: 0x333639, transparent: true, opacity: 0.7 })
    );
    group.add(wires);
  }

  // ============================================================ BARRIERS & CLUTTER
  {
    // HESCO-style bastions around pads (geotextile + wire-grid texture)
    const hescoGeo = new THREE.BoxGeometry(1.35, 1.35, 1.35);
    const hescoMat = new THREE.MeshStandardMaterial({ map: textures.hescoFabric(), roughness: 0.95 });
    const hescoPositions = [];
    const ringAt = (cx, cz, r, a0, a1, step = 1.5) => {
      const arc = a1 - a0;
      const n = Math.max(2, Math.floor((arc * r) / step));
      for (let i = 0; i <= n; i++) {
        const a = a0 + (arc * i) / n;
        hescoPositions.push([cx + Math.cos(a) * r, cz + Math.sin(a) * r, a]);
      }
    };
    ringAt(-46, 32, 13.5, Math.PI * 0.7, Math.PI * 1.65);
    ringAt(2, 50, 13.5, Math.PI * 0.15, Math.PI * 0.95);
    ringAt(48, 30, 13.5, Math.PI * 1.3, Math.PI * 2.15);
    const hesco = new THREE.InstancedMesh(hescoGeo, hescoMat, hescoPositions.length);
    const m4 = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const eul = new THREE.Euler();
    hescoPositions.forEach(([x, z, a], i) => {
      eul.set(0, -a + rng.range(-0.06, 0.06), 0);
      q.setFromEuler(eul);
      m4.compose(new THREE.Vector3(x, 0.675, z), q, new THREE.Vector3(1, 1, 1));
      hesco.setMatrixAt(i, m4);
    });
    hesco.castShadow = true;
    hesco.receiveShadow = true;
    group.add(hesco);
    // collide as coarse arcs (a few boxes)
    colliders.push(makeColliderBox(-52, 40, 9, 1.4, -0.8, 0, 1.5));
    colliders.push(makeColliderBox(9, 57, 9, 1.4, 0.5, 0, 1.5));
    colliders.push(makeColliderBox(55, 24, 9, 1.4, 0.7, 0, 1.5));

    // jersey barriers along entry road (instanced)
    const jerseyGeo = (() => {
      const shape = new THREE.Shape();
      shape.moveTo(-0.4, 0); shape.lineTo(0.4, 0); shape.lineTo(0.16, 0.55);
      shape.lineTo(0.16, 0.9); shape.lineTo(-0.16, 0.9); shape.lineTo(-0.16, 0.55);
      shape.closePath();
      const g3 = new THREE.ExtrudeGeometry(shape, { depth: 3, bevelEnabled: false });
      g3.translate(0, 0, -1.5);
      return g3;
    })();
    const jerseyItems = [];
    for (let i = 0; i < 8; i++) {
      const side = i % 2 === 0 ? -5 : 5;
      const jz = 58 + Math.floor(i / 2) * 16;
      jerseyItems.push({ x: side, y: 0, z: jz });
      colliders.push(makeColliderBox(side, jz, 0.45, 1.55, 0, 0, 1));
    }
    makeInstanced(jerseyGeo, M.concrete, jerseyItems);

    // equipment cases near shelter & pads (instanced, unit box scaled)
    const caseMat = new THREE.MeshStandardMaterial({ color: 0x24301f, roughness: 0.85 });
    const caseItems = [];
    const caseSpots = [[-27, -12], [-26.2, -11.2], [-25.6, -12.4], [-44, 25], [5, 44], [44, 25], [-27, -12.7]];
    for (const [x, z] of caseSpots) {
      for (let s = 0; s < 3; s++) {
        const cw = rng.range(0.7, 1.1), cd = rng.range(0.45, 0.7), ch = rng.range(0.3, 0.42);
        caseItems.push({
          x: x + rng.range(-0.6, 0.6),
          y: ch / 2 + s * 0.36 * (rng.next() < 0.5 ? 1 : 0),
          z: z + rng.range(-0.6, 0.6),
          ry: rng.next() * 1.2, sx: cw, sy: ch, sz: cd,
        });
      }
    }
    makeInstanced(new THREE.BoxGeometry(1, 1, 1), caseMat, caseItems);
    colliders.push(makeColliderCyl(-26.2, -12, 1.6, 0, 1.2));

    // cable protector ramps crossing the apron: yellow/black hazard tops so
    // they read as equipment (a plain black hump looks like a glitch stripe)
    {
      const hazTex = textures.hazardStripes().clone();
      hazTex.needsUpdate = true;
      hazTex.repeat.set(6, 1);
      const hazMat = new THREE.MeshStandardMaterial({ map: hazTex, roughness: 0.85 });
      const topGeo = new THREE.PlaneGeometry(1, 0.3);
      topGeo.rotateX(-Math.PI / 2);
      for (const [x, z, len, rot] of [[-10, 6, 18, 0.35], [18, 22, 14, -0.5]]) {
        const body = new THREE.Mesh(new THREE.BoxGeometry(len, 0.075, 0.46), M.rubber);
        body.position.set(x, 0.037, z);
        body.rotation.y = rot;
        group.add(body);
        const top = new THREE.Mesh(topGeo, hazMat);
        top.scale.x = len;
        top.rotation.y = rot;
        top.position.set(x, 0.078, z);
        group.add(top);
      }
    }

    // ---------------- clutter zones: pallets, crates, barrels, drums,
    // sandbag emplacements, tents, light masts (all instanced/merged)
    const woodMat = new THREE.MeshStandardMaterial({ map: textures.woodPallet(), roughness: 0.92 });

    // pallets (7 boxes merged into one geometry, instanced)
    const palletGeo = (() => {
      const parts = [];
      for (const z of [-0.4, -0.135, 0.135, 0.4]) parts.push(placeGeo(new THREE.BoxGeometry(1.2, 0.032, 0.2), 0, 0.132, z));
      for (const x of [-0.55, 0, 0.55]) parts.push(placeGeo(new THREE.BoxGeometry(0.09, 0.1, 1.0), x, 0.05, 0));
      return mergeGeoms(parts);
    })();
    const palletItems = [];
    const palletStack = (x, z, n, ry = 0) => {
      for (let i = 0; i < n; i++) {
        palletItems.push({ x: x + rng.range(-0.03, 0.03), y: i * 0.152, z: z + rng.range(-0.03, 0.03), ry: ry + rng.range(-0.09, 0.09) });
      }
    };
    palletStack(17.2, 59.4, 5, 0.3); palletStack(18.8, 60.6, 3, 0.2); palletStack(16.4, 61.4, 1, 1.2);
    palletStack(52.8, 6.2, 4, -0.6); palletStack(54.4, 7.8, 2, -0.4);
    palletStack(-19.5, -45.5, 3, 0.15); palletStack(-17.8, -44.4, 1, 0.8);
    // leaning pallet against the supply stack
    palletItems.push({ x: 15.6, y: 0.62, z: 60.2, rx: 1.25, ry: 0.4 });
    makeInstanced(palletGeo, woodMat, palletItems);
    colliders.push(makeColliderBox(17.5, 60.3, 2.0, 1.6, 0.25, 0, 1.2));
    colliders.push(makeColliderBox(53.6, 7.0, 1.7, 1.5, -0.5, 0, 1));
    colliders.push(makeColliderBox(-18.8, -45, 1.6, 1.3, 0.15, 0, 0.8));

    // crates (unit box, per-instance scale + tint)
    const crateItems = [];
    const cTint = () => new THREE.Color().setHSL(0.1, rng.range(0.18, 0.34), rng.range(0.38, 0.56));
    const crateCluster = (x, z, n, baseRy = 0) => {
      for (let i = 0; i < n; i++) {
        const s = rng.range(0.55, 1.0);
        crateItems.push({
          x: x + rng.range(-1.0, 1.0), y: s * 0.5, z: z + rng.range(-1.0, 1.0),
          ry: baseRy + rng.range(-0.5, 0.5), sx: s * rng.range(1, 1.5), sy: s, sz: s * rng.range(0.8, 1.2), c: cTint(),
        });
      }
    };
    crateCluster(21.5, 61.5, 5, 0.4);
    crateCluster(-25.5, -7.5, 4, 0.2);
    crateCluster(56.5, 9.0, 3, -0.5);
    crateCluster(-22.5, -47, 4, 0.1);
    // one stacked pair
    crateItems.push({ x: 21.2, y: 1.32, z: 61.2, ry: 0.7, sx: 0.8, sy: 0.7, sz: 0.75, c: cTint() });
    makeInstanced(new THREE.BoxGeometry(1, 1, 1), woodMat, crateItems);
    colliders.push(makeColliderCyl(21.5, 61.5, 1.9, 0, 1.4));
    colliders.push(makeColliderCyl(-25.5, -7.5, 1.7, 0, 1));
    colliders.push(makeColliderCyl(56.5, 9.0, 1.5, 0, 1));
    colliders.push(makeColliderCyl(-22.5, -47, 1.7, 0, 1));

    // fuel barrels (instanced cylinders, mixed colors, a couple tipped)
    const barrelGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.9, 12);
    const barrelCols = [0x4a4f38, 0x6e3f2a, 0x9a8a62, 0x3d4a55, 0x54563e];
    const barrelItems = [];
    const barrelRow = (x, z, n, ry) => {
      for (let i = 0; i < n; i++) {
        barrelItems.push({
          x: x + Math.cos(ry) * i * 0.68 + rng.range(-0.05, 0.05), y: 0.45,
          z: z + Math.sin(ry) * i * 0.68 + rng.range(-0.05, 0.05),
          ry: rng.next() * TAU, c: new THREE.Color(barrelCols[rng.int(0, 4)]),
        });
      }
    };
    barrelRow(-40.5, -5.5, 6, 0.35); barrelRow(-40.1, -4.2, 5, 0.35);
    barrelRow(57.5, 4.5, 4, -1.1);
    barrelRow(-15.4, -47.4, 3, 0.2);
    barrelRow(24.5, 63.8, 3, 0.9);
    // tipped barrels (rz sets the lying heading under Euler XYZ)
    barrelItems.push({ x: -37.9, y: 0.3, z: -6.7, rx: Math.PI / 2, rz: 0.9, c: new THREE.Color(0x6e3f2a) });
    barrelItems.push({ x: 58.6, y: 0.3, z: 6.4, rx: Math.PI / 2, rz: -0.4, c: new THREE.Color(0x4a4f38) });
    const barrelMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.62, metalness: 0.35 });
    makeInstanced(barrelGeo, barrelMat, barrelItems);
    colliders.push(makeColliderBox(-39.2, -4.8, 2.4, 1.3, 0.35, 0, 1.1));
    colliders.push(makeColliderCyl(58, 5.4, 1.6, 0, 1.1));

    // cable drums (two flanges + core merged)
    const drumGeo = mergeGeoms([
      placeGeo(new THREE.CylinderGeometry(0.55, 0.55, 0.07, 14), 0, 0, -0.33, Math.PI / 2),
      placeGeo(new THREE.CylinderGeometry(0.55, 0.55, 0.07, 14), 0, 0, 0.33, Math.PI / 2),
      placeGeo(new THREE.CylinderGeometry(0.22, 0.22, 0.6, 10), 0, 0, 0, Math.PI / 2),
    ]);
    const drumItems = [
      { x: -19.2, y: 0.55, z: -8.6, ry: 0.5 },
      { x: -18.1, y: 0.55, z: -7.5, ry: 1.2 },
      { x: 24.2, y: 0.55, z: 59.4, ry: -0.4 },
      // one lying flat on its flange
      { x: 53.3, y: 0.075, z: 10.9, rx: -Math.PI / 2 },
    ];
    makeInstanced(drumGeo, woodMat, drumItems);
    colliders.push(makeColliderCyl(-18.6, -8, 1.35, 0, 1.2));

    // sandbag emplacements (instanced squashed capsules)
    const bagGeo = new THREE.CapsuleGeometry(0.125, 0.3, 3, 7);
    bagGeo.rotateZ(Math.PI / 2);
    bagGeo.scale(1, 0.58, 1);
    const bagMat = new THREE.MeshStandardMaterial({ color: 0xa8946e, roughness: 1 });
    const bagItems = [];
    const bagC = () => new THREE.Color().setHSL(0.09, rng.range(0.14, 0.26), rng.range(0.42, 0.58));
    // crescent wall: courses of bags along an arc, brick-laid
    const bagArc = (cx, cz, r, a0, a1, courses) => {
      for (let c = 0; c < courses; c++) {
        const rr = r - c * 0.05;
        const n = Math.max(3, Math.floor(((a1 - a0) * rr) / 0.5));
        for (let i = 0; i <= n; i++) {
          const a = a0 + ((a1 - a0) * (i + (c % 2) * 0.5)) / n;
          bagItems.push({
            x: cx + Math.cos(a) * rr + rng.range(-0.03, 0.03),
            y: 0.08 + c * 0.148,
            z: cz + Math.sin(a) * rr + rng.range(-0.03, 0.03),
            ry: -a + Math.PI / 2 + rng.range(-0.12, 0.12), c: bagC(),
          });
        }
      }
    };
    // straight wall segment
    const bagWall = (x0, z0, x1, z1, courses) => {
      const len = Math.hypot(x1 - x0, z1 - z0);
      const n = Math.max(2, Math.floor(len / 0.5));
      const dx = (x1 - x0) / n, dz = (z1 - z0) / n;
      const yaw = Math.atan2(x1 - x0, z1 - z0) + Math.PI / 2;
      for (let c = 0; c < courses; c++) {
        for (let i = 0; i <= n - (c % 2); i++) {
          bagItems.push({
            x: x0 + dx * (i + (c % 2) * 0.5) + rng.range(-0.03, 0.03),
            y: 0.08 + c * 0.148,
            z: z0 + dz * (i + (c % 2) * 0.5) + rng.range(-0.03, 0.03),
            ry: yaw + rng.range(-0.1, 0.1), c: bagC(),
          });
        }
      }
    };
    // revetment at the shelter door
    bagWall(-28.9, -13.4, -26.6, -13.4, 4);
    bagWall(-26.7, -13.5, -26.7, -15.3, 4);
    // observation post west of the gate road
    bagArc(-12, 68, 2.2, -0.5, Math.PI + 0.5, 4);
    // fighting position covering the radar approach
    bagArc(20, -14, 1.9, Math.PI * 0.6, Math.PI * 1.7, 3);
    // low ring guarding the fuel point
    bagWall(-43.4, -7.6, -43.4, -1.8, 2);
    makeInstanced(bagGeo, bagMat, bagItems);
    colliders.push(makeColliderBox(-27.8, -13.4, 1.3, 0.3, 0, 0, 0.9));
    colliders.push(makeColliderBox(-26.7, -14.4, 0.3, 1.1, 0, 0, 0.9));
    colliders.push(makeColliderCyl(-12, 68, 2.6, 0, 0.9));
    colliders.push(makeColliderCyl(20, -14, 2.3, 0, 0.7));
    colliders.push(makeColliderBox(-43.4, -4.7, 0.3, 3.1, 0, 0, 0.55));

    // GP tents (extruded A-frame profile, both merged into one mesh)
    {
      const shape = new THREE.Shape();
      shape.moveTo(-2.2, 0.02); shape.lineTo(2.2, 0.02); shape.lineTo(2.25, 0.95);
      shape.lineTo(0, 2.25); shape.lineTo(-2.25, 0.95);
      shape.closePath();
      const prof = new THREE.ExtrudeGeometry(shape, { depth: 5.4, bevelEnabled: false });
      prof.translate(0, 0, -2.7);
      const tents = mergeGeoms([
        placeGeo(prof, -45, 0, -12, 0, 0.72),
        placeGeo(prof, 66, 0, 16, 0, -0.52),
      ]);
      const tentMesh = new THREE.Mesh(tents, M.olive);
      tentMesh.castShadow = true;
      tentMesh.receiveShadow = true;
      group.add(tentMesh);
      colliders.push(makeColliderBox(-45, -12, 2.4, 2.9, 0.72, 0, 2.4));
      colliders.push(makeColliderBox(66, 16, 2.4, 2.9, -0.52, 0, 2.4));
    }

    // work-light masts near the clutter zones (instanced). Galvanized pole +
    // gray housings with visible lamp faces — an all-black silhouette reads
    // as a rendering artifact against the sky.
    const mastGeo = mergeGeoms([
      placeGeo(new THREE.CylinderGeometry(0.055, 0.09, 5.6, 7), 0, 2.8, 0),
      placeGeo(new THREE.BoxGeometry(1.3, 0.08, 0.08), 0, 5.42, 0),
      placeGeo(new THREE.BoxGeometry(0.34, 0.18, 0.22), -0.48, 5.32, 0.06, 0.55),
      placeGeo(new THREE.BoxGeometry(0.34, 0.18, 0.22), 0.48, 5.32, 0.06, 0.55),
    ]);
    const mastItems = [
      { x: 13, z: 65, ry: 2.6 }, { x: -39.5, z: -11.5, ry: 0.8 }, { x: 60, z: 1.5, ry: -1.9 },
    ];
    makeInstanced(mastGeo, M.steel, mastItems);
    // lamp faces (slightly warm, faint emissive so they read as glass)
    const faceGeo = mergeGeoms([
      placeGeo(new THREE.PlaneGeometry(0.28, 0.14), -0.48, 5.3, 0.185, 0.55),
      placeGeo(new THREE.PlaneGeometry(0.28, 0.14), 0.48, 5.3, 0.185, 0.55),
    ]);
    const faceMat = new THREE.MeshStandardMaterial({ color: 0xd8d2b8, emissive: 0xb9a878, emissiveIntensity: 0.25, roughness: 0.4 });
    makeInstanced(faceGeo, faceMat, mastItems, { shadow: false });
    for (const it of mastItems) colliders.push(makeColliderCyl(it.x, it.z, 0.3, 0, 5.6));

    // fuel point signage
    {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.9, 6), M.darkMetal);
      post.position.set(-41.8, 0.95, -8.4);
      post.castShadow = true;
      group.add(post);
      const face = new THREE.Mesh(
        new THREE.PlaneGeometry(1.7, 0.5),
        new THREE.MeshBasicMaterial({ map: textures.label('FUEL POINT — NO SMOKING', { fg: '#fff', bg: '#8c1c13', w: 512, h: 96, font: 'bold 36px Arial' }), side: THREE.DoubleSide })
      );
      face.position.set(-41.8, 1.62, -8.4);
      face.rotation.y = 0.6;
      group.add(face);
    }
  }

  // ============================================================ SEARCHLIGHTS (night raid)
  const searchlights = [];
  {
    for (const [x, z, ph] of [[-62, -58, 0], [72, -52, 2.4]]) {
      const sl = new THREE.Group();
      sl.position.set(x, 0, z);
      group.add(sl);
      addBox(M.olive, 1.8, 0.9, 1.8, 0, 0.5, 0, { parent: sl, collide: true });
      const pivot = new THREE.Group();
      pivot.position.y = 1.3;
      sl.add(pivot);
      const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.8, 16), M.metal);
      drum.rotation.x = Math.PI / 2;
      pivot.add(drum);
      const lens = new THREE.Mesh(new THREE.CircleGeometry(0.5, 20), new THREE.MeshBasicMaterial({ color: 0xeaf2ff }));
      lens.position.z = 0.42;
      pivot.add(lens);
      const beamLen = 900;
      // soft volumetric-looking beam: alpha peaks when looking through the
      // cone's middle (view-facing) and fades at silhouette edges + far end,
      // so it never reads as a solid pipe from the side.
      const beamMat = new THREE.ShaderMaterial({
        uniforms: {
          uColor: { value: new THREE.Color(0xbfd4ff) },
          uOpacity: { value: 0.28 },
        },
        vertexShader: /* glsl */ `
          varying vec2 vUv;
          varying vec3 vNormal;
          varying vec3 vViewDir;
          void main() {
            vUv = uv;
            vNormal = normalize(normalMatrix * normal);
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            vViewDir = normalize(-mv.xyz);
            gl_Position = projectionMatrix * mv;
          }
        `,
        fragmentShader: /* glsl */ `
          precision mediump float;
          uniform vec3 uColor;
          uniform float uOpacity;
          varying vec2 vUv;
          varying vec3 vNormal;
          varying vec3 vViewDir;
          void main() {
            float facing = abs(dot(normalize(vNormal), normalize(vViewDir)));
            float radial = pow(facing, 3.0);
            float axial = pow(clamp(vUv.y, 0.0, 1.0), 1.5); // v=1 at the lens
            float a = uOpacity * radial * (0.15 + 0.85 * axial);
            gl_FragColor = vec4(uColor, a);
          }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending,
        side: THREE.BackSide,
        depthWrite: false,
      });
      const beam = new THREE.Mesh(
        new THREE.CylinderGeometry(0.5, 26, beamLen, 20, 1, true),
        beamMat
      );
      beam.rotation.x = -Math.PI / 2;
      beam.position.z = beamLen / 2;
      pivot.add(beam);
      sl.visible = true;
      beam.visible = false;
      lens.visible = false;
      searchlights.push({ group: sl, pivot, beam, lens, phase: ph });
    }
  }

  // ============================================================ ROCKS + SCRUB
  {
    const rockGeo = new THREE.DodecahedronGeometry(1, 0);
    const rocks = new THREE.InstancedMesh(rockGeo, M.rock, 300);
    const m4 = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const col = new THREE.Color();
    let placed = 0;
    let guard = 0;
    while (placed < 300 && guard++ < 4000) {
      const a = rng.next() * TAU;
      const r = rng.range(190, 2600);
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      const s = rng.range(0.3, 2.6);
      const y = terrainHeight(x, z);
      e.set(rng.next() * 3, rng.next() * 3, rng.next() * 3);
      q.setFromEuler(e);
      m4.compose(new THREE.Vector3(x, y + s * 0.2, z), q, new THREE.Vector3(s, s * rng.range(0.55, 0.9), s));
      rocks.setMatrixAt(placed, m4);
      col.setHSL(0.09, rng.range(0.12, 0.25), rng.range(0.38, 0.6));
      rocks.setColorAt(placed, col);
      placed++;
    }
    rocks.castShadow = false;
    rocks.receiveShadow = true;
    group.add(rocks);

    // scrub bushes: crossed planes
    const plane = new THREE.PlaneGeometry(1.6, 1.1);
    plane.translate(0, 0.5, 0);
    const crossGeo = plane.clone();
    const p2 = plane.clone();
    p2.rotateY(Math.PI / 2);
    const merged = mergeGeoms([crossGeo, p2]);
    const scrubMat = new THREE.MeshStandardMaterial({ map: textures.scrub(), transparent: true, alphaTest: 0.35, side: THREE.DoubleSide, roughness: 1 });
    const scrub = new THREE.InstancedMesh(merged, scrubMat, 420);
    placed = 0; guard = 0;
    while (placed < 420 && guard++ < 6000) {
      const a = rng.next() * TAU;
      const r = rng.range(175, 1900);
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      const s = rng.range(0.5, 1.6);
      e.set(0, rng.next() * TAU, 0);
      q.setFromEuler(e);
      m4.compose(new THREE.Vector3(x, terrainHeight(x, z), z), q, new THREE.Vector3(s, s, s));
      scrub.setMatrixAt(placed, m4);
      placed++;
    }
    scrub.castShadow = false;
    group.add(scrub);

    // dry grass tufts: clustered in patches so the near field reads as
    // vegetated desert pavement rather than uniform sand
    const tuftMat = new THREE.MeshStandardMaterial({ map: textures.grassTuft(), transparent: true, alphaTest: 0.3, side: THREE.DoubleSide, roughness: 1 });
    const tufts = new THREE.InstancedMesh(merged.clone(), tuftMat, 380);
    placed = 0; guard = 0;
    let cx = 0, cz = 0, inCluster = 0;
    while (placed < 380 && guard++ < 8000) {
      if (inCluster <= 0) {
        const a = rng.next() * TAU;
        const r = rng.range(180, 1100);
        cx = Math.cos(a) * r; cz = Math.sin(a) * r;
        inCluster = rng.int(4, 12);
      }
      const x = cx + rng.range(-14, 14), z = cz + rng.range(-14, 14);
      inCluster--;
      if (Math.hypot(x, z) < 178) continue;
      const s = rng.range(0.25, 0.7);
      e.set(0, rng.next() * TAU, 0);
      q.setFromEuler(e);
      m4.compose(new THREE.Vector3(x, terrainHeight(x, z), z), q, new THREE.Vector3(s, s * rng.range(0.7, 1), s));
      tufts.setMatrixAt(placed, m4);
      placed++;
    }
    tufts.castShadow = false;
    group.add(tufts);
  }

  function mergeGeoms(geoms) {
    // minimal merge: concatenates position/normal/uv of non-indexed clones
    const gs = geoms.map((g) => g.toNonIndexed ? g.toNonIndexed() : g);
    let total = 0;
    for (const g of gs) total += g.attributes.position.count;
    const out = new THREE.BufferGeometry();
    for (const name of ['position', 'normal', 'uv']) {
      const item = gs[0].attributes[name].itemSize;
      const arr = new Float32Array(total * item);
      let off = 0;
      for (const g of gs) {
        arr.set(g.attributes[name].array, off);
        off += g.attributes[name].array.length;
      }
      out.setAttribute(name, new THREE.BufferAttribute(arr, item));
    }
    return out;
  }

  // ============================================================ time-of-day reactions
  ctx.events.on('time-of-day', () => {
    const on = ctx.weather.floodlightsOn;
    for (const f of floodlights) {
      f.spot.intensity = on ? 260 : 0;
      f.glow.material.opacity = on ? 0.55 : 0;
      f.headMat.emissive.setHex(on ? 0xcfe0ff : 0x000000);
      f.headMat.emissiveIntensity = on ? 2.4 : 0;
    }
    // shelter interior: white troffers by day -> red battle lighting at night
    if (interiorLights) {
      const IL = interiorLights;
      const tod = ctx.weather.timeOfDay;
      if (tod === 'night') {
        IL.lamp.color.setHex(0xff4a28);
        IL.lamp.intensity = 5.5;
        IL.troffMat.emissive.setHex(0x66150c);
        IL.troffMat.emissiveIntensity = 0.3;
        IL.domeMat.emissiveIntensity = 3.2;
        IL.consoleGlow.intensity = 3.0;
        IL.holoGlow.intensity = 2.1;
        IL.deskPool.intensity = 1.5;
        IL.panelMat.emissive.setHex(0x2a1006);
        IL.panelMat.emissiveIntensity = 0.5;
      } else if (tod === 'sunset') {
        IL.lamp.color.setHex(0xffd9a8);
        IL.lamp.intensity = 6;
        IL.troffMat.emissive.setHex(0xe8d9b4);
        IL.troffMat.emissiveIntensity = 0.45;
        IL.domeMat.emissiveIntensity = 0.4;
        IL.consoleGlow.intensity = 2.0;
        IL.holoGlow.intensity = 1.8;
        IL.deskPool.intensity = 1.1;
        IL.panelMat.emissive.setHex(0x000000);
        IL.panelMat.emissiveIntensity = 0;
      } else {
        IL.lamp.color.setHex(0xe8f0ff);
        IL.lamp.intensity = 7.4;
        IL.troffMat.emissive.setHex(0xdfe8ff);
        IL.troffMat.emissiveIntensity = 0.62;
        IL.domeMat.emissiveIntensity = 0.0;
        IL.consoleGlow.intensity = 1.7;
        IL.holoGlow.intensity = 1.6;
        IL.deskPool.intensity = 0.9;
        IL.panelMat.emissive.setHex(0x000000);
        IL.panelMat.emissiveIntensity = 0;
      }
    }
  });

  // battery pads: positions + facing used by batteries.js
  const batteryPads = {
    patriot: { position: new THREE.Vector3(-46, 0, 32), heading: 0.9 },
    thaad: { position: new THREE.Vector3(2, 0, 50), heading: Math.PI * 0.72 },
    sentinel: { position: new THREE.Vector3(48, 0, 30), heading: -0.6 },
  };

  let searchlightsActive = false;

  const api = {
    group,
    consoleScreen,
    holoAnchor,
    consolePos,
    auxScreens,
    batteryPads,
    generators,
    radarHead,
    get searchlightsActive() { return searchlightsActive; },
    setSearchlights(on) {
      searchlightsActive = on;
      for (const s of searchlights) {
        s.beam.visible = on;
        s.lens.visible = on;
      }
    },
    update(dt, t) {
      for (const fn of dynamic) fn(dt, t);
      if (searchlightsActive) {
        for (const s of searchlights) {
          const t2 = t * 0.35 + s.phase;
          s.pivot.rotation.y = Math.sin(t2) * 1.1 + Math.sin(t2 * 0.37) * 0.6;
          s.pivot.rotation.x = -0.65 - Math.sin(t2 * 0.7) * 0.3;
        }
      }
    },
  };
  return api;
}
