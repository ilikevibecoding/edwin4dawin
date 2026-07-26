import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
import { getMaterialLib, tex, canvas, matWithRepeat, scaleBoxUVs } from './textures.js';
import { makeRNG, clamp } from '../core/math.js';
import { buildBuilding, buildRuinedBuilding, buildCompoundWall } from './buildings.js';
import {
  buildCar, buildBus, buildJerseyBarrier, buildSandbagWall, buildBarrel,
  buildTireStack, buildCrate, buildPowerPole, buildWire, buildStreetLight,
  buildDumpster, buildMarketStall, buildRubblePile, buildDistantScenery, shadow,
} from './props.js';

/**
 * DUST LINE — a sun-bleached desert-urban street map.
 * Main street runs east-west (X axis). Cross street runs north-south.
 * Returns spawns, cover points, minimap shapes; registers all colliders.
 */

const rng = makeRNG(777);

export function buildMap(scene, colliders) {
  const lib = getMaterialLib();
  const root = new THREE.Group();
  scene.add(root);

  const minimapShapes = [];
  const coverPoints = [];
  const addCover = (x, z) => coverPoints.push(new THREE.Vector3(x, 0, z));

  /* ------------------------------ ground ------------------------------ */

  const dirt = new THREE.Mesh(new THREE.PlaneGeometry(240, 240), matWithRepeat(lib.dirt, 52, 52));
  dirt.rotation.x = -Math.PI / 2;
  dirt.receiveShadow = true;
  root.add(dirt);

  // Main street asphalt (E-W)
  const road = new THREE.Mesh(new THREE.PlaneGeometry(150, 13), matWithRepeat(lib.asphalt, 30, 2.6));
  road.rotation.x = -Math.PI / 2;
  road.position.y = 0.02;
  road.receiveShadow = true;
  root.add(road);
  minimapShapes.push({ type: 'road', x: 0, z: 0, w: 150, d: 13 });

  // Cross street (N-S)
  const road2 = new THREE.Mesh(new THREE.PlaneGeometry(11, 150), matWithRepeat(lib.asphalt, 2.2, 30));
  road2.rotation.x = -Math.PI / 2;
  road2.position.y = 0.025;
  road2.receiveShadow = true;
  root.add(road2);
  minimapShapes.push({ type: 'road', x: 0, z: 0, w: 11, d: 150 });

  // Road markings baked into one worn overlay strip (dashes, crosswalk,
  // tar snakes, repair patches, skid marks) — no floating planes.
  {
    const c = canvas(2048, 256);
    const ctx = c.getContext('2d');
    const px = (wx) => ((wx + 75) / 150) * 2048;   // world-x → canvas-x
    const pz = (wz) => ((wz + 6.5) / 13) * 256;    // world-z → canvas-y
    // Repair patches
    for (let i = 0; i < 9; i++) {
      const x = rng.spread(66), z = rng.spread(4.6);
      ctx.fillStyle = `rgba(${rng.chance(0.5) ? '18,18,18' : '150,146,132'}, ${0.1 + rng() * 0.12})`;
      ctx.fillRect(px(x), pz(z), 30 + rng() * 90, 24 + rng() * 60);
    }
    // Polished wheel-track bands — two per lane, darker where tires run
    for (const z0 of [-3.25, -1.55, 1.55, 3.25]) {
      const y0 = pz(z0 - 0.44), y1 = pz(z0 + 0.44);
      const grd = ctx.createLinearGradient(0, y0, 0, y1);
      grd.addColorStop(0, 'rgba(24, 24, 27, 0)');
      grd.addColorStop(0.5, 'rgba(24, 24, 27, 0.32)');
      grd.addColorStop(1, 'rgba(24, 24, 27, 0)');
      ctx.fillStyle = grd;
      ctx.fillRect(0, Math.min(y0, y1), 2048, Math.abs(y1 - y0));
    }
    // Center dashes, worn but strong enough to survive full sun
    for (let x = -70; x < 74; x += 6) {
      if (Math.abs(x) < 7) continue;
      ctx.fillStyle = 'rgba(208, 200, 174, 0.65)';
      ctx.fillRect(px(x + rng.spread(0.3)), pz(rng.spread(0.1)) - 1.6, (2.6 / 150) * 2048, 3.2);
    }
    // Crosswalk stripes near the intersection
    for (let i = 0; i < 11; i++) {
      ctx.fillStyle = `rgba(208, 200, 174, ${0.55 + rng() * 0.28})`;
      ctx.fillRect(px(-9.6), pz(-5.5 + i * 1.1) - 4.5, (2.4 / 150) * 2048, 9);
    }
    // Sand-dust film blown in from the road edges (~25% alpha)
    for (const side of [-1, 1]) {
      const y0 = pz(side * 6.5), y1 = pz(side * 3.6);
      const grd = ctx.createLinearGradient(0, y0, 0, y1);
      grd.addColorStop(0, 'rgba(170, 150, 120, 0.42)');
      grd.addColorStop(1, 'rgba(170, 150, 120, 0)');
      ctx.fillStyle = grd;
      ctx.fillRect(0, Math.min(y0, y1), 2048, Math.abs(y1 - y0));
      // lumpy drift tongues licking toward the crown
      for (let i = 0; i < 130; i++) {
        const x = rng() * 2048;
        const z = side * (4.7 + rng() * 1.7);
        ctx.fillStyle = `rgba(176, 154, 122, ${0.08 + rng() * 0.18})`;
        ctx.beginPath();
        ctx.ellipse(x, pz(z), 12 + rng() * 42, 4 + rng() * 10, 0, 0, 7);
        ctx.fill();
      }
    }
    // Erosion: knock holes in the paint
    ctx.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 900; i++) {
      ctx.fillStyle = `rgba(0,0,0,${0.2 + rng() * 0.4})`;
      ctx.beginPath();
      ctx.arc(rng() * 2048, rng() * 256, 1 + rng() * 5, 0, 7);
      ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
    // Tar snakes
    ctx.strokeStyle = 'rgba(16, 16, 16, 0.65)';
    ctx.lineWidth = 2.4;
    for (let i = 0; i < 14; i++) {
      const x0 = rng() * 2048, y0 = rng() * 256;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.bezierCurveTo(x0 + rng.spread(120), y0 + rng.spread(90), x0 + rng.spread(200), y0 + rng.spread(120), x0 + rng.spread(300), y0 + rng.spread(160));
      ctx.stroke();
    }
    // Skid marks
    for (const [x, z, len] of [[14, 1.4, 9], [11, 2.2, 7], [-30, -2.4, 11]]) {
      ctx.fillStyle = 'rgba(14, 14, 14, 0.55)';
      ctx.fillRect(px(x), pz(z), (len / 150) * 2048, 5);
      ctx.fillRect(px(x), pz(z + 1.5), (len / 150) * 2048, 5);
    }
    const overlayTex = tex(c, { srgb: true });
    overlayTex.wrapS = overlayTex.wrapT = THREE.ClampToEdgeWrapping;
    const overlay = new THREE.Mesh(
      new THREE.PlaneGeometry(150, 13),
      new THREE.MeshStandardMaterial({ map: overlayTex, transparent: true, roughness: 0.96, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1 })
    );
    overlay.rotation.x = -Math.PI / 2;
    overlay.position.y = 0.032;
    overlay.receiveShadow = true;
    overlay.renderOrder = 1;
    root.add(overlay);
  }

  // Manhole covers — separate crisp discs (the road overlay is too coarse)
  {
    const mc = canvas(128, 128);
    const mctx = mc.getContext('2d');
    const grd = mctx.createRadialGradient(64, 64, 4, 64, 64, 64);
    grd.addColorStop(0, 'rgba(58, 54, 48, 0.95)');
    grd.addColorStop(0.78, 'rgba(44, 41, 36, 0.95)');
    grd.addColorStop(0.9, 'rgba(24, 22, 19, 0.95)');
    grd.addColorStop(1, 'rgba(24, 22, 19, 0)');
    mctx.fillStyle = grd;
    mctx.fillRect(0, 0, 128, 128);
    mctx.strokeStyle = 'rgba(20, 18, 16, 0.55)';
    mctx.lineWidth = 3;
    for (const rr of [18, 30, 42]) {
      mctx.beginPath(); mctx.arc(64, 64, rr, 0, 7); mctx.stroke();
    }
    mctx.lineWidth = 2.5;
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      mctx.beginPath();
      mctx.moveTo(64 + Math.cos(a) * 44, 64 + Math.sin(a) * 44);
      mctx.lineTo(64 + Math.cos(a) * 54, 64 + Math.sin(a) * 54);
      mctx.stroke();
    }
    // sun-side rim catch
    mctx.strokeStyle = 'rgba(232, 218, 188, 0.5)';
    mctx.lineWidth = 3;
    mctx.beginPath(); mctx.arc(64, 64, 56, Math.PI * 1.05, Math.PI * 1.6); mctx.stroke();
    const mhTex = tex(mc, { srgb: true });
    mhTex.wrapS = mhTex.wrapT = THREE.ClampToEdgeWrapping;
    const mhMat = new THREE.MeshStandardMaterial({
      map: mhTex, transparent: true, roughness: 0.55, metalness: 0.6,
      depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2,
    });
    for (const [mx, mz] of [[-20, 2.1], [26, -2.7]]) {
      const mh = new THREE.Mesh(new THREE.CircleGeometry(0.42, 24), mhMat);
      mh.rotation.x = -Math.PI / 2;
      mh.position.set(mx, 0.034, mz);
      mh.renderOrder = 1;
      mh.receiveShadow = true;
      root.add(mh);
    }
  }

  // Sidewalks: individual slabs with height/gap jitter (kills the ruler line)
  {
    const slabGeos = [];
    for (const side of [-1, 1]) {
      let x = -75;
      while (x < 75) {
        const len = 3 + rng() * 1.6;
        const h = 0.15 + rng.spread(0.018);
        const g = new THREE.BoxGeometry(len - 0.03, h, 3.2 + rng.spread(0.05));
        scaleBoxUVs(g, len, h, 3.2, 0.42, 0.42);
        // random uv offset per slab
        const uv = g.attributes.uv;
        const ou = rng() * 5, ov = rng() * 5;
        for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) + ou, uv.getY(i) + ov);
        g.translate(x + len / 2, h / 2, side * 8.2 + rng.spread(0.02));
        slabGeos.push(g);
        x += len;
      }
    }
    const merged = BufferGeometryUtils.mergeGeometries(slabGeos, false);
    const walk = new THREE.Mesh(merged, lib.sidewalk);
    walk.receiveShadow = true; walk.castShadow = true;
    root.add(walk);
    colliders.addBox(0, 0.075, -8.2, 150, 0.15, 3.2);
    colliders.addBox(0, 0.075, 8.2, 150, 0.15, 3.2);
  }

  // Sidewalk grime overlays: slab-edge chips, gum spots, dirt pooling
  // toward the walls — decal-carpets the big flat concrete read
  {
    const mkWalkOverlay = (side) => {
      const c = canvas(2048, 96);
      const octx = c.getContext('2d');
      const puX = (wx) => ((wx + 75) / 150) * 2048;
      // dirt pooling along the building side of the strip
      const wallY0 = side > 0 ? 96 : 0;
      const wallY1 = side > 0 ? 58 : 38;
      const grd = octx.createLinearGradient(0, wallY0, 0, wallY1);
      grd.addColorStop(0, 'rgba(88, 76, 58, 0.42)');
      grd.addColorStop(1, 'rgba(88, 76, 58, 0)');
      octx.fillStyle = grd;
      octx.fillRect(0, 0, 2048, 96);
      // slab joints: AO seam darkened ~25% so slabs read as separate units
      let jx = -74 + rng() * 2;
      while (jx < 74) {
        const jpx = puX(jx);
        octx.fillStyle = 'rgba(36, 30, 22, 0.55)';
        octx.fillRect(jpx - 1.5, 0, 3, 96);
        for (let i = 0; i < 7; i++) {
          if (rng.chance(0.55)) continue;
          octx.fillStyle = `rgba(30, 26, 20, ${0.35 + rng() * 0.35})`;
          octx.beginPath();
          octx.ellipse(jpx + rng.spread(3), rng() * 96, 2 + rng() * 5, 1.5 + rng() * 3, rng() * 3, 0, 7);
          octx.fill();
        }
        jx += 3 + rng() * 1.6;
      }
      // gum spots + small stains
      for (let i = 0; i < 240; i++) {
        const dark = rng.chance(0.7);
        octx.fillStyle = dark
          ? `rgba(26, 23, 20, ${0.3 + rng() * 0.35})`
          : `rgba(150, 143, 130, ${0.2 + rng() * 0.25})`;
        octx.beginPath();
        octx.arc(rng() * 2048, rng() * 96, 0.8 + rng() * 2.2, 0, 7);
        octx.fill();
      }
      // faint polished foot-traffic lane mid-strip
      const mid = octx.createLinearGradient(0, 26, 0, 70);
      mid.addColorStop(0, 'rgba(205, 196, 176, 0)');
      mid.addColorStop(0.5, 'rgba(205, 196, 176, 0.1)');
      mid.addColorStop(1, 'rgba(205, 196, 176, 0)');
      octx.fillStyle = mid;
      octx.fillRect(0, 0, 2048, 96);
      const t = tex(c, { srgb: true });
      t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
      const m = new THREE.Mesh(
        new THREE.PlaneGeometry(150, 3.2),
        new THREE.MeshStandardMaterial({
          map: t, transparent: true, roughness: 0.94,
          depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1,
        })
      );
      m.rotation.x = -Math.PI / 2;
      m.position.set(0, 0.172, side * 8.2);
      m.renderOrder = 1;
      m.receiveShadow = true;
      root.add(m);
    };
    mkWalkOverlay(-1);
    mkWalkOverlay(1);
  }

  // Silt drifts hugging both curbs — lumpy wind-blown mounds with a wavy
  // road-side edge (vertex-displaced, not a uniform ribbon)
  {
    const siltAlpha = canvas(64, 64);
    const sctx = siltAlpha.getContext('2d');
    const grd = sctx.createLinearGradient(0, 0, 0, 64);
    grd.addColorStop(0, 'rgba(255,255,255,0.9)');
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    sctx.fillStyle = grd;
    sctx.fillRect(0, 0, 64, 64);
    const siltAlphaTex = tex(siltAlpha);
    const nA = (x) => Math.sin(x * 0.37 + 1.7) * 0.5 + Math.sin(x * 0.91 + 0.4) * 0.32 + Math.sin(x * 2.3 + 2.2) * 0.18;
    const nB = (x) => Math.sin(x * 0.23 + 4.1) * 0.6 + Math.sin(x * 1.27 + 1.1) * 0.4;
    for (const side of [-1, 1]) {
      const siltMat = matWithRepeat(lib.dirt, 40, 0.5);
      siltMat.transparent = true;
      siltMat.alphaMap = siltAlphaTex;
      siltMat.depthWrite = false;
      const geo = new THREE.PlaneGeometry(150, 1.3, 240, 6);
      const pa = geo.attributes.position;
      // Tall drift mounds (0.12-0.2m) every ~17m that rise above the 0.15m
      // curb and break its ruler-straight silhouette
      const bumpAt = (x) => {
        let s = 0;
        for (let k = -4; k <= 4; k++) {
          const cx0 = k * 17 + side * 6 + Math.sin(k * 12.9 + side) * 3.2;
          const dx = x - cx0;
          s += Math.exp(-dx * dx / 7.5) * (0.12 + 0.08 * (Math.sin(k * 3.7 + side * 2.1) * 0.5 + 0.5));
        }
        return s;
      };
      for (let i = 0; i < pa.count; i++) {
        const x = pa.getX(i), y = pa.getY(i);
        const t = (y + 0.65) / 1.3;              // 0 = road edge, 1 = curb edge
        const mound = clamp(0.55 + 0.45 * nA(x + side * 31), 0, 1);
        const wk = 0.62 + 0.3 * (nB(x - side * 17) * 0.5 + 0.5);
        pa.setY(i, 0.65 - (0.65 - y) * wk);      // wavy width, curb edge fixed
        pa.setZ(i, mound * Math.pow(t, 1.35) * (0.07 + 0.06 * (nB(x * 1.7) * 0.5 + 0.5))
          + bumpAt(x) * Math.pow(t, 1.15));
      }
      geo.computeVertexNormals();
      const silt = new THREE.Mesh(geo, siltMat);
      silt.rotation.x = -Math.PI / 2;
      if (side > 0) silt.rotation.z = Math.PI;
      silt.position.set(0, 0.022, side * 5.95);
      silt.renderOrder = 1;
      silt.receiveShadow = true;
      root.add(silt);
    }
  }

  // Curb bump-outs / parking bays — two slab tongues that break the 150m
  // ruler line (south one doubles as the bay for the angled parked car)
  for (const [bx, side, bw] of [[-18, -1, 6.2], [-25, 1, 6.4]]) {
    const g = new THREE.BoxGeometry(bw, 0.15, 1.35);
    scaleBoxUVs(g, bw, 0.15, 1.35, 0.42, 0.42);
    const bo = new THREE.Mesh(g, lib.sidewalk);
    bo.position.set(bx, 0.075, side * 6.0);
    bo.receiveShadow = true;
    bo.castShadow = true;
    root.add(bo);
    colliders.addBox(bx, 0.075, side * 6.0, bw, 0.15, 1.35);
  }

  /* ----------------------------- buildings ---------------------------- */

  const placeBuilding = (opts, x, z, yaw = 0) => {
    const b = buildBuilding(opts);
    b.position.set(x + rng.spread(0.25), 0, z + rng.spread(0.25));
    b.rotation.y = yaw + rng.spread(0.012);
    root.add(b);
    const [w, d] = b.userData.footprint;
    const rot = Math.abs(Math.sin(yaw)) > 0.5;
    minimapShapes.push({ type: 'b', x, z, w: rot ? d : w, d: rot ? w : d });
    return b;
  };

  const shopNames = ['BAZAAR', 'HOTEL AMIR', 'CAFE SAHRA', 'MARKET', 'AL NOOR', 'TAILOR', 'PHARMACY', 'KEBAB'];
  let shopIdx = 0;

  // North row (front facades face +Z toward street at z≈-10)
  const northRow = [
    { w: 13, d: 11, stories: 2, storefront: true },
    { w: 10, d: 12, stories: 3 },
    { w: 15, d: 10, stories: 2, storefront: true },
    { w: 11, d: 12, stories: 2 },
    { w: 14, d: 11, stories: 3, storefront: true },
    { w: 12, d: 10, stories: 2 },
  ];
  let cx = -52;
  for (let i = 0; i < northRow.length; i++) {
    const o = northRow[i];
    const gap = i === 2 ? 4.5 : 0.6; // alley after 3rd building
    cx += o.w / 2;
    if (Math.abs(cx) < 9) cx = 9 + o.w / 2; // keep cross street open
    placeBuilding({
      ...o, seed: 100 + i, styleIdx: i % 5,
      // dusk practicals: warm glow panes near the market corner (HOTEL AMIR)
      glowWindows: i === 1 ? 1 : i === 2 ? 2 : 0,
      signText: o.storefront ? shopNames[shopIdx++ % shopNames.length] : null,
    }, cx, -10 - o.d / 2, 0);
    cx += o.w / 2 + gap;
  }

  // South row (facades face -Z; yaw PI)
  const southRow = [
    { w: 14, d: 10, stories: 2, storefront: true },
    { w: 11, d: 11, stories: 3 },
    { w: 12, d: 10, stories: 2, storefront: true },
    { w: 13, d: 12, stories: 2 },
    { w: 10, d: 10, stories: 3 },
    { w: 13, d: 11, stories: 2, storefront: true },
  ];
  cx = -54;
  for (let i = 0; i < southRow.length; i++) {
    const o = southRow[i];
    const gap = i === 3 ? 4 : 0.7;
    cx += o.w / 2;
    if (Math.abs(cx) < 9) cx = 9 + o.w / 2;
    placeBuilding({
      ...o, seed: 200 + i, styleIdx: (i + 2) % 5,
      // dusk practicals: warm glow panes near the market corner (AL NOOR)
      glowWindows: i === 1 ? 1 : i === 2 ? 2 : 0,
      signText: o.storefront ? shopNames[shopIdx++ % shopNames.length] : null,
    }, cx, 10 + o.d / 2, Math.PI);
    cx += o.w / 2 + gap;
  }

  // Cross-street buildings (north arm, facing street on X axis)
  placeBuilding({ w: 12, d: 10, stories: 2, seed: 301, styleIdx: 1 }, -12, -24, Math.PI / 2);
  placeBuilding({ w: 11, d: 10, stories: 3, seed: 302, styleIdx: 3 }, 12, -26, -Math.PI / 2);
  placeBuilding({ w: 12, d: 11, stories: 2, seed: 303, styleIdx: 2 }, -12, 26, Math.PI / 2);
  placeBuilding({ w: 12, d: 10, stories: 2, seed: 304, styleIdx: 4 }, 12, 25, -Math.PI / 2);

  // Ruined building — NE of intersection
  const ruin = buildRuinedBuilding({ w: 13, d: 11, seed: 401, styleIdx: 0, h: 7 });
  ruin.position.set(30, 0, -16.5);
  root.add(ruin);
  minimapShapes.push({ type: 'b', x: 30, z: -16.5, w: 13, d: 11 });
  addCover(24, -10); addCover(37, -11);

  /* --------------------------- boundary walls -------------------------- */

  const boundary = (x, z, len, yaw) => {
    const wSeg = buildCompoundWall(len, 3, rng.int(0, 4));
    wSeg.position.set(x, 0, z);
    wSeg.rotation.y = yaw;
    root.add(wSeg);
    minimapShapes.push({ type: 'w', x, z, w: yaw === 0 ? len : 0.6, d: yaw === 0 ? 0.6 : len });
  };
  // West end of street: rubble barricade + wall
  boundary(-62, -4, 9, Math.PI / 2);
  boundary(-62, 4, 9, Math.PI / 2);
  const westRubble = buildRubblePile(4.2, 1.7, 11);
  westRubble.position.set(-64, 0, 0);
  root.add(westRubble);
  colliders.addBox(-65, 2, 0, 6, 4, 14);
  // East end
  boundary(68, -4.5, 10, Math.PI / 2);
  boundary(68, 4.5, 10, Math.PI / 2);
  const eastBarr = buildJerseyBarrier(3);
  for (let i = 0; i < 3; i++) {
    const jb = eastBarr.clone();
    jb.position.set(60, 0, -4 + i * 3.2);
    jb.rotation.y = Math.PI / 2 + rng.spread(0.1);
    root.add(jb);
  }
  colliders.addBox(60.2, 0.5, 0, 1.2, 1, 10);
  addCover(57, -2); addCover(57, 2);
  // North & south arms
  boundary(-4.5, -46, 9, 0);
  boundary(4.5, -46, 9, 0);
  boundary(-4.5, 46, 9, 0);
  boundary(4.5, 46, 9, 0);

  // Hard invisible bounds
  colliders.addBox(0, 5, -75, 240, 10, 4);
  colliders.addBox(0, 5, 75, 240, 10, 4);
  colliders.addBox(-75, 5, 0, 4, 10, 240);
  colliders.addBox(75, 5, 0, 4, 10, 240);

  /* ------------------------------- props ------------------------------- */

  const place = (obj, x, z, yaw = 0, opts = {}) => {
    obj.position.set(x, opts.y ?? 0, z);
    obj.rotation.y = yaw;
    root.add(obj);
    if (opts.collide !== false) {
      obj.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(obj);
      if (opts.collH) box.max.y = box.min.y + opts.collH;
      colliders.boxes.push({ min: box.min.clone(), max: box.max.clone(), tag: opts.tag ?? 'prop' });
    }
    return obj;
  };

  // Wrecked bus — centerpiece mid-street
  place(buildBus({ burned: true }), 10, 1.2, 0, { collH: 3.4 });
  minimapShapes.push({ type: 'p', x: 10, z: 1.2, w: 10, d: 3 });
  addCover(3.5, 1.5); addCover(16.5, 1);

  // Parked / abandoned cars
  const carDefs = [
    [-38, 6.3, 0.15, {}], [-24, -6.6, -0.1, {}], [-13, 6.5, 3.2, {}],
    [20, -6.2, 0.28, { burned: true }], [30, 5.9, -3.05, {}], [44, -5.8, 0.1, { burned: true }],
    [-45, -6.4, 0.05, { pickup: true }], [38, 6.4, 2.9, { pickup: true }],
  ];
  for (const [x, z, yaw, o] of carDefs) {
    place(buildCar(o), x, z, yaw, { collH: 1.5 });
    minimapShapes.push({ type: 'p', x, z, w: 4.15, d: 2 });
    addCover(x - 3, z); addCover(x + 3, z);
  }

  // Composition breakers: a car parked at an angle, half up on the south
  // parking bay, and a toppled barrier flung diagonally near the crater —
  // both outside the down-street photo corridor
  {
    const angled = buildCar({ color: 0x9a8a5a });
    angled.rotation.x = -0.06; // raked — curb-side wheels ride the bay slab
    place(angled, -25, 6.3, 0.5, { collH: 1.5, y: 0.09 });
    minimapShapes.push({ type: 'p', x: -25, z: 6.3, w: 4.15, d: 2 });
    addCover(-27.6, 5.2);
    const toppled = buildJerseyBarrier(3);
    toppled.children[0].position.x = -3; // center the extruded segment
    toppled.rotation.x = 1.42;           // lying on its side
    place(toppled, 35, -1.8, 0.55, { collH: 0.8, y: 0.33 });
    addCover(35, -3.4);
  }

  // Jersey barrier chicane near intersection
  for (const [x, z, yaw] of [[-6, -3.4, 0.2], [-3, -3.8, -0.1], [6, 3.6, 0.15], [3, 4, -0.2]]) {
    place(buildJerseyBarrier(3), x, z, yaw, { collH: 0.9 });
    addCover(x, z + (z > 0 ? 1.4 : -1.4));
  }

  // Sandbag positions
  place(buildSandbagWall(4, 6), -46, 1.8, Math.PI / 2 + 0.1, { collH: 0.95 });
  addCover(-46, 3);
  place(buildSandbagWall(3, 5), 48, -1.5, -0.08, { collH: 0.75 });
  addCover(48, -3);
  place(buildSandbagWall(2, 4), 0, -12.5, 1.62, { collH: 0.55 });
  addCover(1.5, -12.5);

  // Market stalls on south sidewalk
  place(buildMarketStall(1), -22, 7.6, 0.06, { collH: 1.1, y: 0.152 });
  place(buildMarketStall(2), -17.4, 7.8, -0.1, { collH: 1.1, y: 0.152 });
  addCover(-19.5, 5.8);

  // Dusk practicals: string-bulb lines sagging over the market stalls with
  // a few warm point lights among them (tiny/subtle in full daylight)
  {
    const bulbGeo = new THREE.SphereGeometry(0.032, 8, 6);
    const bulbMat = new THREE.MeshStandardMaterial({
      color: 0x2a1a0c, emissive: 0xffb060, emissiveIntensity: 1.7, roughness: 0.4,
    });
    const strings = [
      [new THREE.Vector3(-24.6, 3.2, 9.6), new THREE.Vector3(-14.9, 3.4, 8.8), 0.5],
      [new THREE.Vector3(-24.2, 3.05, 6.6), new THREE.Vector3(-15.3, 3.25, 6.9), 0.45],
    ];
    for (const [a, b, sag] of strings) {
      root.add(buildWire(a, b, sag));
      const mid = a.clone().lerp(b, 0.5); mid.y -= sag;
      for (let i = 1; i < 14; i++) {
        const t = i / 14;
        const p = a.clone().multiplyScalar((1 - t) * (1 - t))
          .addScaledVector(mid, 2 * (1 - t) * t)
          .addScaledVector(b, t * t);
        const bulb = new THREE.Mesh(bulbGeo, bulbMat);
        bulb.position.set(p.x, p.y - 0.055, p.z);
        root.add(bulb);
      }
    }
    for (const [lx, ly, lz] of [[-22.3, 2.8, 8.4], [-19.2, 2.9, 7.5], [-16.4, 2.85, 8.1]]) {
      const pl = new THREE.PointLight(0xffb060, 2, 8, 2);
      pl.position.set(lx, ly, lz);
      root.add(pl);
    }
  }

  // Dumpster in north alley
  place(buildDumpster(), -14.5, -11.5, 0.3, { collH: 1.3 });
  addCover(-14.5, -9.6);

  // Barrels, tires, crates — seated on the sidewalk top where applicable
  // so their contact-shadow blobs stay visible
  const walkY = (z) => (Math.abs(z) > 6.62 ? 0.152 : 0);
  for (const [x, z] of [[-30.5, -7.4], [-29.7, -7.9], [25, 7.3], [52, 2.8], [51.2, 3.5]]) {
    place(buildBarrel({ color: rng.pick([0x5a6a52, 0x71624a, 0x4a5c66]) }), x, z, rng() * 3, { collH: 0.95, y: walkY(z) });
  }
  place(buildTireStack(4), -8.5, 7.6, 0, { collH: 1.1, y: 0.152 });
  place(buildTireStack(3), 33.5, -6.9, 0, { collH: 0.9, y: 0.152 });
  for (const [x, z] of [[42, 7.1], [42.9, 7.4], [42.4, 7.0]]) {
    place(buildCrate(0.75 + rng() * 0.3), x, z, rng(), { collH: 0.9, y: walkY(z) });
  }
  addCover(42, 5.6);

  // Power poles + wires along north sidewalk
  const poleXs = [-48, -30, -12, 6, 24, 42, 58];
  const poleTops = [];
  for (const px of poleXs) {
    place(buildPowerPole(8), px, -7.6, rng.spread(0.06), { collH: 8, tag: 'pole' });
    poleTops.push(new THREE.Vector3(px, 7.55, -7.6));
  }
  for (let i = 0; i < poleTops.length - 1; i++) {
    for (const off of [-0.6, 0, 0.6]) {
      const a = poleTops[i].clone(); a.x += off * 0.4; a.y += off === 0 ? 0.1 : 0;
      const b = poleTops[i + 1].clone(); b.x += off * 0.4; b.y += off === 0 ? 0.1 : 0;
      a.z += off * 0.12; b.z += off * 0.12;
      root.add(buildWire(a, b, 0.7 + rng() * 0.3));
    }
  }
  // Drop lines across the street to south buildings
  for (const i of [1, 3, 5]) {
    const a = poleTops[i].clone();
    const b = new THREE.Vector3(poleTops[i].x + 3, 6.2, 9.8);
    root.add(buildWire(a, b, 1.1));
  }

  // Laundry lines with small colored cloth quads strung between facing
  // balconies — overhead life on the long street axis
  {
    const clothMats = [0x9a5a48, 0x53707e, 0xb8a888, 0x86687e, 0xc0b090, 0x6d8a68]
      .map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.95, side: THREE.DoubleSide }));
    const clothGeo = new THREE.PlaneGeometry(0.42, 0.5);
    const laundry = [
      [new THREE.Vector3(-28, 5.2, -9.8), new THREE.Vector3(-27.4, 4.85, 9.8), 1.25],
      [new THREE.Vector3(20, 5.55, -9.8), new THREE.Vector3(20.6, 5.05, 9.8), 1.35],
      [new THREE.Vector3(44, 4.9, -9.8), new THREE.Vector3(44.6, 5.25, 9.8), 1.2],
    ];
    let ci = 0;
    for (const [a, b, sag] of laundry) {
      root.add(buildWire(a, b, sag));
      const mid = a.clone().lerp(b, 0.5); mid.y -= sag;
      for (let i = 0; i < 6; i++) {
        const t = 0.2 + i * 0.12 + rng.spread(0.03);
        const p = a.clone().multiplyScalar((1 - t) * (1 - t))
          .addScaledVector(mid, 2 * (1 - t) * t)
          .addScaledVector(b, t * t);
        const cloth = new THREE.Mesh(clothGeo, clothMats[ci++ % clothMats.length]);
        cloth.position.set(p.x + rng.spread(0.05), p.y - 0.26, p.z);
        cloth.rotation.y = Math.PI / 2 + rng.spread(0.3);
        cloth.rotation.z = rng.spread(0.07);
        cloth.castShadow = true;
        root.add(cloth);
      }
    }
  }

  // Street lights on south side
  for (const sx of [-40, -20, 16, 36, 54]) {
    place(buildStreetLight(6.4), sx, 7.4, Math.PI, { collH: 6.4, tag: 'pole' });
  }

  // Extra rubble piles + blast crater east
  place(buildRubblePile(2.6, 1.0, 21), 24, -8.7, 0, { collH: 1.0 });
  place(buildRubblePile(1.8, 0.7, 22), -34, 7.9, 0, { collH: 0.7 });
  const craterMat = new THREE.MeshStandardMaterial({ color: 0x241f1a, roughness: 1, transparent: true, opacity: 0.85 });
  const crater = new THREE.Mesh(new THREE.CircleGeometry(3.4, 24), craterMat);
  crater.rotation.x = -Math.PI / 2;
  crater.position.set(36, 0.05, 1.5);
  root.add(crater);
  place(buildRubblePile(2.0, 0.5, 23), 36, 1.5, 0, { collH: 0.5 });

  /* ---------------------------- street banner --------------------------- */

  const bannerCanvas = canvas(512, 128);
  {
    const c2 = bannerCanvas.getContext('2d');
    c2.fillStyle = '#6a2c22';
    c2.fillRect(0, 0, 512, 128);
    c2.strokeStyle = '#d8c9a8'; c2.lineWidth = 5;
    c2.strokeRect(14, 14, 484, 100);
    c2.fillStyle = '#d8c9a8';
    c2.font = 'bold 56px Georgia';
    c2.textAlign = 'center'; c2.textBaseline = 'middle';
    c2.fillText('\u0633\u0648\u0642 \u0627\u0644\u0645\u062F\u064A\u0646\u0629', 256, 64);
    for (let i = 0; i < 120; i++) {
      c2.fillStyle = `rgba(30,20,14,${rng() * 0.3})`;
      c2.fillRect(rng() * 512, rng() * 128, rng() * 26, rng() * 5);
    }
  }
  const bannerMat = new THREE.MeshStandardMaterial({ map: tex(bannerCanvas, { srgb: true }), roughness: 0.95 });
  const bannerGeo = new THREE.PlaneGeometry(11, 2.2, 12, 2);
  {
    const pa = bannerGeo.attributes.position;
    for (let i = 0; i < pa.count; i++) {
      const x = pa.getX(i);
      pa.setZ(i, Math.cos((x / 11) * Math.PI) * -0.5);
      pa.setY(i, pa.getY(i) - Math.cos((x / 11) * Math.PI * 2) * 0.18);
    }
    bannerGeo.computeVertexNormals();
  }
  // Two front-facing planes back-to-back so the text is never mirrored
  for (const dir of [1, -1]) {
    const banner = new THREE.Mesh(bannerGeo, bannerMat);
    banner.position.set(-14 - dir * 0.015, 6.4, 0);
    banner.rotation.y = dir * Math.PI / 2;
    banner.castShadow = true;
    root.add(banner);
  }
  // Suspension ropes anchoring the banner to the flanking parapets
  const ropeMat = new THREE.MeshStandardMaterial({ color: 0x2a241c, roughness: 0.9 });
  for (const side of [-1, 1]) {
    const a = new THREE.Vector3(-14, 7.15, side * 5.2);
    const b = new THREE.Vector3(-14 + rng.spread(1.2), 7.4, side * 9.9);
    const curve = new THREE.QuadraticBezierCurve3(a, a.clone().lerp(b, 0.5).add(new THREE.Vector3(0, -0.18, 0)), b);
    const rope = new THREE.Mesh(new THREE.TubeGeometry(curve, 8, 0.014, 5), ropeMat);
    rope.castShadow = true;
    root.add(rope);
  }

  /* --------------------------- ground scatter --------------------------- */

  // Every loose scatter piece registers a contact-shadow blob here; one
  // instanced plane mesh is built after the loops so nothing floats.
  const scatterBlobs = []; // [x, y, z, size]

  // Stones (lifted onto the slab top when they land on a sidewalk)
  const stoneGeo = new THREE.DodecahedronGeometry(0.07, 0);
  const stones = new THREE.InstancedMesh(stoneGeo, lib.rubble, 260);
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const eu = new THREE.Euler();
  for (let i = 0; i < 260; i++) {
    const x = rng.spread(66), z = rng.spread(66);
    eu.set(rng() * 3, rng() * 3, rng() * 3);
    q.setFromEuler(eu);
    const s = 0.5 + rng() * 1.6;
    const onWalk = Math.abs(z) > 6.62 && Math.abs(z) < 9.78;
    m4.compose(new THREE.Vector3(x, onWalk ? 0.19 : 0.04, z), q, new THREE.Vector3(s, s * 0.7, s));
    stones.setMatrixAt(i, m4);
    scatterBlobs.push([x, onWalk ? 0.176 : 0.038, z, s * 0.34]);
  }
  stones.castShadow = true;
  stones.receiveShadow = true;
  root.add(stones);

  // Papers / trash lying flat on the road
  const paperMat = new THREE.MeshStandardMaterial({ color: 0xcfc6b2, roughness: 1, side: THREE.DoubleSide });
  const paperGeo = new THREE.PlaneGeometry(0.28, 0.36);
  const papers = new THREE.InstancedMesh(paperGeo, paperMat, 140);
  for (let i = 0; i < 140; i++) {
    const x = rng.spread(64), z = rng.spread(18);
    eu.set(-Math.PI / 2 + rng.spread(0.06), 0, rng() * Math.PI);
    q.setFromEuler(eu);
    m4.compose(new THREE.Vector3(x, Math.abs(z) > 6.62 ? 0.165 : 0.012, z), q, new THREE.Vector3(1, 1, 1));
    papers.setMatrixAt(i, m4);
  }
  papers.receiveShadow = true;
  root.add(papers);

  // Bottles and cans hugging the curbs
  {
    const canGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.13, 8);
    const canMat = new THREE.MeshStandardMaterial({ color: 0x8a8378, roughness: 0.5, metalness: 0.6 });
    const cans = new THREE.InstancedMesh(canGeo, canMat, 48);
    for (let i = 0; i < 48; i++) {
      const x = rng.spread(64);
      const z = (rng.chance(0.5) ? -1 : 1) * (5.6 + rng() * 1.6);
      const lying = rng.chance(0.6);
      eu.set(lying ? Math.PI / 2 : 0, rng() * Math.PI, 0);
      q.setFromEuler(eu);
      const onWalk = Math.abs(z) > 6.62;
      m4.compose(new THREE.Vector3(x, (lying ? 0.045 : 0.065) + (onWalk ? 0.15 : 0), z), q, new THREE.Vector3(1, 1, 1));
      cans.setMatrixAt(i, m4);
      scatterBlobs.push([x, onWalk ? 0.176 : 0.038, z, 0.2]);
    }
    cans.castShadow = true;
    root.add(cans);
  }

  // Rolled carpets leaning against walls near the market (seated on the
  // sidewalk slab top, not buried in it)
  const carpetMat = new THREE.MeshStandardMaterial({ color: 0x7a4438, roughness: 0.95 });
  for (const [x, z, lean] of [[-25.5, 8.6, 0.28], [-24.9, 8.7, 0.2], [33, -8.6, -0.3]]) {
    const carpet = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 1.9, 10), carpetMat);
    carpet.position.set(x, 1.05, z);
    carpet.rotation.x = lean * (z > 0 ? -1 : 1);
    carpet.rotation.z = rng.spread(0.08);
    carpet.castShadow = true;
    root.add(carpet);
    scatterBlobs.push([x, 0.176, z, 0.55]);
  }

  // Pallet stacks near the crates
  for (const [x, z, n] of [[44.5, 7.6, 3], [-41, -7.2, 2]]) {
    for (let i = 0; i < n; i++) {
      const pallet = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.13, 0.95), lib.woodDark);
      pallet.position.set(x + rng.spread(0.08), 0.225 + i * 0.15, z + rng.spread(0.08));
      pallet.rotation.y = rng.spread(0.2);
      pallet.castShadow = true; pallet.receiveShadow = true;
      root.add(pallet);
    }
    scatterBlobs.push([x, 0.176, z, 1.55]);
  }

  // Instanced contact-shadow blobs under all registered scatter pieces
  {
    const bc = canvas(128, 128);
    const bctx = bc.getContext('2d');
    const bg = bctx.createRadialGradient(64, 64, 5, 64, 64, 64);
    bg.addColorStop(0, 'rgba(0,0,0,0.85)');
    bg.addColorStop(0.55, 'rgba(0,0,0,0.5)');
    bg.addColorStop(1, 'rgba(0,0,0,0)');
    bctx.fillStyle = bg;
    bctx.fillRect(0, 0, 128, 128);
    const bt = tex(bc);
    bt.wrapS = bt.wrapT = THREE.ClampToEdgeWrapping;
    const blobs = new THREE.InstancedMesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({ map: bt, transparent: true, opacity: 0.38, depthWrite: false }),
      scatterBlobs.length
    );
    const bq = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));
    for (let i = 0; i < scatterBlobs.length; i++) {
      const [x, y, z, s] = scatterBlobs[i];
      m4.compose(new THREE.Vector3(x, y, z), bq, new THREE.Vector3(s, s, 1));
      blobs.setMatrixAt(i, m4);
    }
    blobs.renderOrder = 3;
    blobs.frustumCulled = false;
    blobs.castShadow = false;
    root.add(blobs);
  }

  // A leaning, battle-worn power pole with a snapped wire
  {
    const lean = buildPowerPole(7.4);
    lean.rotation.z = 0.11;
    lean.position.set(50, 0, -7.4);
    root.add(lean);
    lean.updateMatrixWorld(true);
    const snapA = new THREE.Vector3(50 - 0.8, 6.9, -7.4);
    const snapB = new THREE.Vector3(49.2, 0.4, -6.2);
    root.add(buildWire(snapA, snapB, 0.2));
  }

  /* ---------------------------- distant scenery -------------------------- */

  buildDistantScenery(scene);

  // Vista terminator: a ~35m minaret silhouette down the eastern street
  // axis so the long sightline ends on a deliberate landmark
  {
    const lmMat = new THREE.MeshStandardMaterial({ color: 0xb1a084, roughness: 0.95 });
    const lmDark = new THREE.MeshStandardMaterial({ color: 0x86755c, roughness: 0.95 });
    const lm = new THREE.Group();
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(1.9, 2.7, 24, 10), lmMat);
    shaft.position.y = 12;
    lm.add(shaft);
    const balcony = new THREE.Mesh(new THREE.CylinderGeometry(2.7, 2.0, 1.3, 10), lmDark);
    balcony.position.y = 24.6;
    lm.add(balcony);
    const upper = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.7, 6.5, 10), lmMat);
    upper.position.y = 28.4;
    lm.add(upper);
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(1.7, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), lmDark);
    dome.position.y = 31.6;
    lm.add(dome);
    const finial = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.09, 2.6, 6), lmDark);
    finial.position.y = 34.3;
    lm.add(finial);
    // dark slit windows facing back down the street
    const slitMat = new THREE.MeshStandardMaterial({ color: 0x241f18, roughness: 1 });
    for (let i = 0; i < 4; i++) {
      const h = 6 + i * 5;
      const rr = 2.7 - (2.7 - 1.9) * (h / 24);
      const slit = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.6, 0.5), slitMat);
      slit.position.set(-rr + 0.06, h, 0);
      lm.add(slit);
    }
    lm.position.set(116, 0, 3);
    root.add(lm);
  }

  // Slow city-fire smoke columns on the horizon (static tapered billboards;
  // fog + distance sell the drift)
  {
    const mkSmokeTex = (seed) => {
      const c = canvas(128, 256);
      const sctx = c.getContext('2d');
      const r = makeRNG(seed);
      for (let i = 0; i < 130; i++) {
        const t = i / 130;                       // 0 bottom → 1 top
        const y = 246 - t * 236;
        const x = 64 + Math.sin(t * 5.2 + seed) * 13 * t + r.spread(6 + t * 16);
        const rad = 6 + t * 30 + r() * 8;
        const g2 = sctx.createRadialGradient(x, y, 0, x, y, rad);
        const lum = 52 + t * 26 + r() * 14;
        g2.addColorStop(0, `rgba(${lum}, ${lum * 0.96}, ${lum * 0.9}, ${0.16 + (1 - t) * 0.1})`);
        g2.addColorStop(1, 'rgba(0,0,0,0)');
        sctx.fillStyle = g2;
        sctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
      }
      return tex(c, { srgb: true });
    };
    const smokeDefs = [[236, -66, 52, 1], [268, 92, 66, 2], [-244, -142, 58, 3]];
    for (const [sx, sz, sh, seed] of smokeDefs) {
      const st = mkSmokeTex(seed * 991);
      st.wrapS = st.wrapT = THREE.ClampToEdgeWrapping;
      const smMat = new THREE.MeshBasicMaterial({
        map: st, transparent: true, depthWrite: false, side: THREE.DoubleSide, opacity: 0.85,
      });
      for (const ry of [0, Math.PI / 2]) {
        const p = new THREE.Mesh(new THREE.PlaneGeometry(sh * 0.5, sh), smMat);
        p.position.set(sx, 4 + sh / 2, sz);
        p.rotation.y = ry;
        root.add(p);
      }
    }
  }

  /* --------------------------- collider bake --------------------------- */

  root.updateMatrixWorld(true);
  root.traverse((o) => {
    if (o.userData && o.userData.collider) {
      o.updateWorldMatrix(true, false);
      const box = new THREE.Box3().setFromObject(o);
      colliders.boxes.push({ min: box.min.clone(), max: box.max.clone(), tag: 'building' });
    }
  });

  /* ------------------------------ metadata ------------------------------ */

  const enemySpawns = [
    new THREE.Vector3(58, 0, -2.5),
    new THREE.Vector3(58, 0, 3),
    new THREE.Vector3(2.5, 0, -42),
    new THREE.Vector3(-2.5, 0, 42),
    new THREE.Vector3(30, 0, -10.5),
    new THREE.Vector3(42, 0, 8.5),
  ];
  // Extra mid-street cover markers
  addCover(-6.5, -2); addCover(6.5, 4.4); addCover(-19, 6); addCover(30, 4.5);

  return {
    root,
    playerSpawn: { pos: new THREE.Vector3(-51, 0, 1.2), yaw: -Math.PI / 2 },
    enemySpawns,
    coverPoints,
    minimapShapes,
    halfSize: 70,
  };
}
