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
    // Center dashes — ~50% worn: visible but battered (round 5's fade
    // overshot and they vanished in the first 40m of the vista)
    for (let x = -70; x < 74; x += 6) {
      if (Math.abs(x) < 7) continue;
      ctx.fillStyle = `rgba(212, 204, 178, ${0.52 + rng() * 0.14})`;
      ctx.fillRect(px(x + rng.spread(0.3)), pz(rng.spread(0.1)) - 1.6, (2.6 / 150) * 2048, 3.2);
    }
    // Crosswalk stripes near the intersection
    for (let i = 0; i < 11; i++) {
      ctx.fillStyle = `rgba(208, 200, 174, ${0.38 + rng() * 0.22})`;
      ctx.fillRect(px(-9.6), pz(-5.5 + i * 1.1) - 4.5, (2.4 / 150) * 2048, 9);
    }
    // Paint-wear mask: erosion bites on the marking zones — enough to
    // batter the paint, not erase it (dashes must survive ~50% intact)
    ctx.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 210; i++) {
      const onCross = rng.chance(0.25);
      const wx = onCross ? -9.6 + rng.spread(1.6) : rng.spread(72);
      const wz = onCross ? rng.spread(5.5) : rng.spread(0.5);
      ctx.fillStyle = `rgba(0,0,0,${0.16 + rng() * 0.3})`;
      ctx.beginPath();
      ctx.arc(px(wx), pz(wz), 1 + rng() * 3.6, 0, 7);
      ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
    // Faded curb paint bands along the gutter near the market / ads corridor
    // (the later erosion pass eats ~30% of them)
    for (const [x0, x1, side, colA] of [
      [-27, -12, 1, '200,150,40'], [-16, -4, -1, '200,150,40'], [-6, 4, 1, '156,44,32'],
    ]) {
      ctx.fillStyle = `rgba(${colA}, 0.45)`;
      ctx.fillRect(px(x0), pz(side * 6.28) - 3, px(x1) - px(x0), 6);
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
    // Oil drip clusters at every parking position (kept in sync with
    // carDefs + the angled bay car below)
    const parkSpots = [
      [-38, 6.3], [-24, -6.6], [-13, 6.5], [20, -6.2], [30, 5.9], [44, -5.8],
      [-45, -6.4], [38, 6.4], [-34, -6.3], [-33, 6.3],
    ];
    for (const [ox, oz] of parkSpots) {
      const n = 3 + Math.floor(rng() * 3);
      for (let i = 0; i < n; i++) {
        ctx.fillStyle = `rgba(16, 14, 12, ${0.18 + rng() * 0.3})`;
        ctx.beginPath();
        ctx.ellipse(
          px(ox + rng.spread(1.6)), pz(oz * 0.92 + rng.spread(0.7)),
          (0.2 + rng() * 0.45) * 13.65, (0.15 + rng() * 0.3) * 19.7,
          rng() * 3, 0, 7);
        ctx.fill();
      }
      // engine-bay drip trail smeared along the parking direction
      ctx.fillStyle = `rgba(18, 15, 12, ${0.16 + rng() * 0.12})`;
      ctx.beginPath();
      ctx.ellipse(px(ox + rng.spread(0.6)), pz(oz * 0.92 + rng.spread(0.3)),
        (0.6 + rng() * 0.7) * 13.65, 0.09 * 19.7, rng.spread(0.1), 0, 7);
      ctx.fill();
    }
    // Large ~2m weathering stains around the mid-street strongpoint
    for (const [sxx, szz, sr] of [[0, -1, 1.1], [-2.6, 0.7, 0.9], [2.2, -2.3, 1.0]]) {
      ctx.save();
      ctx.translate(px(sxx), pz(szz));
      ctx.scale(1, 1.44);
      const g3 = ctx.createRadialGradient(0, 0, 2, 0, 0, sr * 13.65);
      g3.addColorStop(0, 'rgba(30, 24, 18, 0.34)');
      g3.addColorStop(0.7, 'rgba(34, 28, 20, 0.16)');
      g3.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g3;
      ctx.beginPath();
      ctx.arc(0, 0, sr * 13.65, 0, 7);
      ctx.fill();
      ctx.restore();
    }
    // Large irregular grime patches (4-6m, ~8-10% net opacity) — old
    // water/soot fields that break the asphalt's even tone
    for (const [gx2, gz2] of [[-46, 1.6], [-30, -2.2], [16, 2.4], [40, -1.4]]) {
      for (let i = 0; i < 7; i++) {
        const rr = (0.9 + rng() * 1.4) * 13.65;
        ctx.fillStyle = `rgba(24, 20, 16, ${0.022 + rng() * 0.02})`;
        ctx.beginPath();
        ctx.ellipse(px(gx2) + rng.spread(rr * 0.8), pz(gz2) + rng.spread(rr * 0.55),
          rr, rr * (0.75 + rng() * 0.6), rng() * 3, 0, 7);
        ctx.fill();
      }
    }
    // Crack webs radiating from the manhole collars
    ctx.strokeStyle = 'rgba(18, 16, 14, 0.5)';
    for (const [mx, mz] of [[-20, 2.1], [26, -2.7]]) {
      // subsidence ring stain around the collar
      const ring = ctx.createRadialGradient(px(mx), pz(mz), 4, px(mx), pz(mz), 20);
      ring.addColorStop(0, 'rgba(20, 17, 14, 0.3)');
      ring.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = ring;
      ctx.beginPath(); ctx.arc(px(mx), pz(mz), 20, 0, 7); ctx.fill();
      const nCr = 6;
      for (let i = 0; i < nCr; i++) {
        const a = (i / nCr) * Math.PI * 2 + rng.spread(0.4);
        let cxx = px(mx) + Math.cos(a) * 7, cyy = pz(mz) + Math.sin(a) * 9;
        ctx.lineWidth = 1.4 + rng() * 1.1;
        ctx.beginPath();
        ctx.moveTo(cxx, cyy);
        const segs = 3 + Math.floor(rng() * 2);
        for (let s2 = 0; s2 < segs; s2++) {
          cxx += Math.cos(a + rng.spread(0.7)) * (6 + rng() * 12);
          cyy += Math.sin(a + rng.spread(0.7)) * (7 + rng() * 13);
          ctx.lineTo(cxx, cyy);
        }
        ctx.stroke();
        if (rng.chance(0.5)) { // hairline branch
          ctx.lineWidth = 0.9;
          ctx.beginPath();
          ctx.moveTo(cxx, cyy);
          ctx.lineTo(cxx + rng.spread(14), cyy + rng.spread(14));
          ctx.stroke();
        }
      }
    }
    // 0.3m gutter-stain strip hugging both curbs, with blotchy pulses
    for (const side of [-1, 1]) {
      const yEdge = side > 0 ? 256 : 0;
      const yIn = side > 0 ? 256 - 0.32 * 19.7 : 0.32 * 19.7;
      const grd = ctx.createLinearGradient(0, yEdge, 0, yIn);
      grd.addColorStop(0, 'rgba(28, 24, 19, 0.44)');
      grd.addColorStop(0.65, 'rgba(28, 24, 19, 0.2)');
      grd.addColorStop(1, 'rgba(28, 24, 19, 0)');
      ctx.fillStyle = grd;
      ctx.fillRect(0, Math.min(yEdge, yIn), 2048, Math.abs(yEdge - yIn));
      for (let i = 0; i < 90; i++) {
        ctx.fillStyle = `rgba(24, 20, 16, ${0.1 + rng() * 0.22})`;
        ctx.beginPath();
        ctx.ellipse(rng() * 2048, yEdge + (side > 0 ? -1 : 1) * rng() * 5,
          6 + rng() * 26, 2 + rng() * 3.5, 0, 0, 7);
        ctx.fill();
      }
    }
    // Sand-drift wedges piling against the curbs. Round 5 marched these at
    // near-regular intervals and they read as a repeating blob pattern —
    // now they cluster 2-3 deep only where wind eddies would drop sand
    // (building corners / the checkpoint), sizes scattered, ~20% dimmer.
    {
      const driftClusters = [
        // [side, corner x positions] — mid-block stays clean
        [-1, [-52, -39, -12.8, 20.4, 47]],
        [1, [-54, -40, -15.6, 22.4, 46.4, 58]],
      ];
      for (const [side, xs] of driftClusters) {
        const yEdge = side > 0 ? 256 : 0;
        for (const cxr of xs) {
          const n = 2 + (rng.chance(0.45) ? 1 : 0);
          let wx = cxr + rng.spread(1.1);
          for (let i = 0; i < n; i++) {
            const big = i === 0; // one dominant tongue, smaller companions
            const wW = ((big ? 1.6 : 0.7) + rng() * (big ? 1.7 : 1.0)) * 13.65;
            const wD = ((big ? 0.55 : 0.3) + rng() * 0.5) * 19.7;
            const x0 = px(wx);
            ctx.fillStyle = `rgba(174, 154, 123, ${(big ? 0.24 : 0.16) + rng() * 0.18})`;
            ctx.beginPath();
            ctx.moveTo(x0 - wW / 2, yEdge);
            ctx.quadraticCurveTo(x0 + rng.spread(wW * 0.25), yEdge + (side > 0 ? -wD : wD), x0 + wW / 2, yEdge);
            ctx.closePath();
            ctx.fill();
            // brighter crest line on the dominant tongue only
            if (big) {
              ctx.fillStyle = 'rgba(192, 172, 139, 0.14)';
              ctx.beginPath();
              ctx.ellipse(x0, yEdge + (side > 0 ? -wD * 0.3 : wD * 0.3), wW * 0.3, wD * 0.16, 0, 0, 7);
              ctx.fill();
            }
            wx += (1.1 + rng() * 1.6) * (rng.chance(0.5) ? 1 : -1);
          }
        }
      }
    }
    // Baked micro-shadows (round 7): the shadow map skips thin cylinders
    // at 5.5cm texels, so street-furniture shadows are painted into the
    // bake. Sun (0.43, 0.60, 0.674) → ground shadows offset by
    // (-0.717, -1.124) per metre of occluder height (length ≈ h·1.33,
    // ~57° off the road axis, raking toward -x/-z).
    {
      const shX = -0.7168, shZ = -1.1243;
      // South-row street lights (base z=+7.4, h=6.4) stand inside the
      // building shadow band, so only the pole portion ABOVE the local
      // shadow line (h0) prints — each stub grows out of the macro shadow
      // edge instead of double-darkening inside it. h0≈5.0 in front of the
      // 2-storey row; the x=-40 lamp faces the 3-storey block (fully
      // shaded → no print) and x=54 stands past the row in full sun.
      for (const [sx, h0] of [[-20, 5.0], [16, 5.0], [36, 5.0], [54, 0]]) {
        const hTop = 6.4;
        const hStart = Math.max(0, h0 - 0.35); // slight overlap into the mass
        const steps = 7;
        for (let s = 0; s < steps; s++) {
          const hA = hStart + ((hTop - hStart) / steps) * s;
          const hB = hA + (hTop - hStart) / steps;
          const t = s / (steps - 1);
          const w = 3.2 - t * 1.7;             // pole tapers toward the tip
          const al = 0.34 - t * 0.2;           // ...and the penumbra eats it
          for (const [wMul, aMul] of [[2.3, 0.32], [1, 1]]) { // soft edge + core
            ctx.strokeStyle = `rgba(16, 14, 11, ${(al * aMul).toFixed(3)})`;
            ctx.lineWidth = w * wMul;
            ctx.beginPath();
            ctx.moveTo(px(sx + shX * hA), pz(7.4 + shZ * hA));
            ctx.lineTo(px(sx + shX * hB), pz(7.4 + shZ * hB));
            ctx.stroke();
          }
        }
        // Curved arm + luminaire head print at the streak tip
        ctx.strokeStyle = 'rgba(16, 14, 11, 0.2)';
        ctx.lineWidth = 1.7;
        ctx.beginPath();
        ctx.moveTo(px(sx + shX * hTop), pz(7.4 + shZ * hTop));
        ctx.lineTo(px(sx - 0.72 + shX * 6.63), pz(7.4 + shZ * 6.63));
        ctx.lineTo(px(sx - 1.5 + shX * 6.6), pz(7.4 + shZ * 6.6));
        ctx.stroke();
        ctx.fillStyle = 'rgba(16, 14, 11, 0.24)';
        ctx.beginPath();
        ctx.ellipse(px(sx - 1.55 + shX * 6.56), pz(7.4 + shZ * 6.56), 5.4, 2.6, -2.0, 0, 7);
        ctx.fill();
      }
      // Overhead wires print faint wavy lines where they cross sunlit
      // road: the three cross-street laundry lines (with a few cloth-quad
      // blobs) + the three service drops to the south row. Sag bows the
      // line; a small sine wobble stands in for wind.
      const wireShadow = (a, b, sag, alpha, cloths) => {
        ctx.strokeStyle = `rgba(14, 12, 10, ${alpha})`;
        ctx.lineWidth = 1.7;
        ctx.beginPath();
        for (let i = 0; i <= 26; i++) {
          const t = i / 26, omt = 1 - t;
          const wx = omt * omt * a[0] + 2 * omt * t * ((a[0] + b[0]) / 2) + t * t * b[0];
          const wy = omt * omt * a[1] + 2 * omt * t * ((a[1] + b[1]) / 2 - sag) + t * t * b[1];
          const wz = omt * omt * a[2] + 2 * omt * t * ((a[2] + b[2]) / 2) + t * t * b[2];
          const gx = px(wx + shX * wy + Math.sin(t * 8.5 + a[0]) * 0.05);
          const gz = pz(wz + shZ * wy);
          if (i === 0) ctx.moveTo(gx, gz); else ctx.lineTo(gx, gz);
        }
        ctx.stroke();
        if (cloths) {
          ctx.fillStyle = `rgba(14, 12, 10, ${alpha * 0.9})`;
          for (const t of [0.34, 0.52, 0.71]) {
            const omt = 1 - t;
            const wx = omt * omt * a[0] + 2 * omt * t * ((a[0] + b[0]) / 2) + t * t * b[0];
            const wy = omt * omt * a[1] + 2 * omt * t * ((a[1] + b[1]) / 2 - sag) + t * t * b[1] - 0.5;
            const wz = omt * omt * a[2] + 2 * omt * t * ((a[2] + b[2]) / 2) + t * t * b[2];
            ctx.fillRect(px(wx + shX * wy) - 2.6, pz(wz + shZ * wy) - 4.6, 5.2, 9.2);
          }
        }
      };
      wireShadow([-28, 5.2, -9.8], [-27.4, 4.85, 9.8], 1.25, 0.12, true);
      wireShadow([20, 5.55, -9.8], [20.6, 5.05, 9.8], 1.35, 0.12, true);
      wireShadow([44, 4.9, -9.8], [44.6, 5.25, 9.8], 1.2, 0.12, true);
      wireShadow([-30, 7.55, -7.6], [-27, 6.2, 9.8], 1.1, 0.11, false);
      wireShadow([6, 7.55, -7.6], [9, 6.2, 9.8], 1.1, 0.11, false);
      wireShadow([42, 7.55, -7.6], [45, 6.2, 9.8], 1.1, 0.11, false);
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

  // Foreground detail pass: the 0-15m road strip in front of every hero
  // camera (spawn vista, ads, combat) gets close-range surface incident —
  // crack decals, one patched-asphalt anchor, and fine grit scatter.
  {
    // Shared crack sheet, drawn at ~82px/m so hairlines resolve where the
    // overlay bake (13px/m) can't. Round 7 redo: the old pass stroked a
    // wide PALE halo under each core and the fissures wandered back over
    // themselves — on screen it read as a raised light-grey Voronoi web.
    // Now strictly darker-than-asphalt: 1-2px near-black cores over two
    // soft dark falloff passes, strict tree branching (paths only fork,
    // never rejoin — no closed cells), zero light strokes anywhere.
    const cc = canvas(512, 256);
    const cctx = cc.getContext('2d');
    cctx.lineCap = 'round';
    const crackSeg = (x0, y0, x1, y1, w, a) => {
      cctx.strokeStyle = `rgba(11, 10, 8, ${a})`;
      cctx.lineWidth = w;
      cctx.beginPath();
      cctx.moveTo(x0, y0);
      cctx.lineTo(x1, y1);
      cctx.stroke();
    };
    const drawCrack = (x0, y0, ang0, len, w0, yMin, yMax, depth = 0) => {
      let x = x0, y = y0, a = ang0;
      let travelled = 0;
      const aMax = depth ? 1.3 : 0.85; // mains stay east-running, no backtracking
      while (travelled < len && x < 512) {
        const seg = 14 + rng() * 22;
        a = clamp(a + rng.spread(0.34), -aMax, aMax);
        if (y < yMin && Math.sin(a) < 0) a = Math.abs(a) * 0.6;  // drift back in
        if (y > yMax && Math.sin(a) > 0) a = -Math.abs(a) * 0.6;
        const nx = x + Math.cos(a) * seg;
        const ny = y + Math.sin(a) * seg;
        const t = travelled / len;
        const taper = (0.35 + 0.65 * Math.sin(Math.PI * Math.min(1, t))) * (depth ? 0.6 : 1);
        // Soft dark falloff under a near-black core (multiply-style read)
        crackSeg(x, y, nx, ny, Math.max(1.8, w0 * 3.0 * taper), 0.08);
        crackSeg(x, y, nx, ny, Math.max(1.2, w0 * 1.55 * taper), 0.2);
        crackSeg(x + rng.spread(0.8), y + rng.spread(0.8), nx + rng.spread(0.8), ny + rng.spread(0.8),
          Math.max(0.9, Math.min(2.1, w0 * 0.62 * taper)), 0.6 + 0.24 * taper);
        // Fork a thinner branch off; it dies out on its own (tree topology)
        if (depth < 2 && rng.chance(depth ? 0.18 : 0.32)) {
          const ba = a + (rng.chance(0.5) ? 1 : -1) * (0.55 + rng() * 0.6);
          drawCrack(nx, ny, ba, len * (0.14 + rng() * 0.2), w0 * 0.5, yMin, yMax, depth + 1);
        }
        // spall chips hugging the fissure
        if (depth === 0 && rng.chance(0.3)) {
          cctx.fillStyle = `rgba(16, 14, 12, ${0.18 + rng() * 0.22})`;
          cctx.beginPath();
          cctx.ellipse(nx + rng.spread(4), ny + rng.spread(4), 1 + rng() * 2.6, 0.8 + rng() * 1.8, rng() * 3, 0, 7);
          cctx.fill();
        }
        x = nx; y = ny;
        travelled += seg;
      }
    };
    // Two mains held in separate lateral bands so they can never cross
    drawCrack(6, 78 + rng() * 22, 0.12, 500, 2.4, 34, 124);
    drawCrack(20, 186 - rng() * 22, -0.1, 470, 2.0, 142, 224);
    const crackTex = tex(cc, { srgb: true });
    crackTex.wrapS = crackTex.wrapT = THREE.ClampToEdgeWrapping;
    const crackMat = new THREE.MeshStandardMaterial({
      map: crackTex, transparent: true, roughness: 0.97,
      depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2,
    });
    // Crack planes crossing the immediate foreground of each hero camera
    const crackGeos = [];
    for (const [cxw, czw, yaw2, sc] of [
      [-46.5, 0.9, 0.35, 1.0],   // spawn vista (player at x=-51)
      [-41.8, -1.7, -0.55, 0.85],
      [-6.0, -1.4, 0.15, 0.9],   // ads camera foreground
      [20.5, 0.9, 2.75, 0.95],   // combat camera foreground
    ]) {
      const g = new THREE.PlaneGeometry(6.2 * sc, 3.1 * sc);
      g.rotateX(-Math.PI / 2);
      g.rotateY(yaw2);
      g.translate(cxw, 0.0335, czw);
      crackGeos.push(g);
    }
    const cracks = new THREE.Mesh(BufferGeometryUtils.mergeGeometries(crackGeos, false), crackMat);
    cracks.renderOrder = 1;
    cracks.receiveShadow = true;
    cracks.castShadow = false;
    root.add(cracks);

    // Anchor decal: cold-patched asphalt rectangle just off the spawn
    // corridor. Round 7: the old near-black fill punched a hole in the
    // road — the patch now sits only ~10-12% BELOW the surrounding asphalt
    // value (fresh mix, not a pit), and the border is a thin raised tar
    // bead: 3px dark line with a lit flank on its sun-facing (+x/+z)
    // sides and a hairline cast-shadow edge on the away sides.
    const pc2 = canvas(256, 192);
    const pctx2 = pc2.getContext('2d');
    pctx2.fillStyle = 'rgba(70, 69, 66, 0.9)';
    pctx2.fillRect(6, 6, 244, 180);
    for (let i = 0; i < 620; i++) { // coarse cold-mix speckle, ±13 value
      const l = 58 + rng() * 26;
      pctx2.fillStyle = `rgba(${l}, ${l}, ${l * 0.97}, ${0.2 + rng() * 0.3})`;
      pctx2.fillRect(8 + rng() * 240, 8 + rng() * 176, 1 + rng() * 2.2, 1 + rng() * 2.2);
    }
    for (let i = 0; i < 5; i++) { // roller compaction bands
      pctx2.fillStyle = `rgba(86, 84, 80, ${0.08 + rng() * 0.08})`;
      pctx2.fillRect(6, 14 + i * 36 + rng.spread(6), 244, 7 + rng() * 6);
    }
    pctx2.strokeStyle = 'rgba(16, 14, 12, 0.82)'; // raised tar bead
    pctx2.lineWidth = 3;
    pctx2.strokeRect(6.5, 6.5, 243, 179);
    pctx2.strokeStyle = 'rgba(196, 184, 158, 0.3)'; // sun catch: right + bottom flanks
    pctx2.lineWidth = 1.2;
    pctx2.beginPath();
    pctx2.moveTo(9, 187.4); pctx2.lineTo(247.4, 187.4); pctx2.lineTo(247.4, 9);
    pctx2.stroke();
    pctx2.strokeStyle = 'rgba(10, 9, 8, 0.45)'; // bead shadow: top + left
    pctx2.beginPath();
    pctx2.moveTo(4.6, 185); pctx2.lineTo(4.6, 4.6); pctx2.lineTo(245, 4.6);
    pctx2.stroke();
    const patchTex = tex(pc2, { srgb: true });
    patchTex.wrapS = patchTex.wrapT = THREE.ClampToEdgeWrapping;
    const patch = new THREE.Mesh(
      new THREE.PlaneGeometry(2.7, 1.9),
      new THREE.MeshStandardMaterial({
        map: patchTex, transparent: true, roughness: 0.9,
        depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3,
      })
    );
    patch.rotation.x = -Math.PI / 2;
    patch.rotation.z = 0.12;
    patch.position.set(-48.2, 0.0345, -0.7);
    patch.renderOrder = 1;
    patch.receiveShadow = true;
    patch.castShadow = false;
    root.add(patch);

    // Fine grit / pea-gravel scatter on the roadway — instanced, biased to
    // the camera foregrounds so the close-range asphalt resolves
    const gritGeo = new THREE.DodecahedronGeometry(0.03, 0);
    const gritMat = lib.rubble.clone();
    gritMat.color = new THREE.Color(0xa59a8a);
    const gritN = 240;
    const grit = new THREE.InstancedMesh(gritGeo, gritMat, gritN);
    const gm4 = new THREE.Matrix4();
    const gq = new THREE.Quaternion();
    const geu = new THREE.Euler();
    for (let i = 0; i < gritN; i++) {
      const zone = rng();
      const gx = zone < 0.5 ? -56 + rng() * 28   // spawn vista strip
        : zone < 0.8 ? -14 + rng() * 26          // ads/combat strip
          : rng.spread(66);                      // everywhere else, sparse
      const gz = rng.spread(5.9);
      geu.set(rng() * 3, rng() * 3, rng() * 3);
      gq.setFromEuler(geu);
      const s = 0.5 + rng() * 1.2;
      gm4.compose(new THREE.Vector3(gx, 0.016 + s * 0.012, gz), gq, new THREE.Vector3(s, s * 0.55, s));
      grit.setMatrixAt(i, gm4);
    }
    grit.castShadow = false;
    grit.receiveShadow = true;
    root.add(grit);
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
      // Power poles stand on THIS walk (z=-7.6) in full sun — the sun map
      // skips their thin trunks, so bake the raking shadow: a foot-contact
      // blob plus ~2.2m of streak crossing the walk before the facade
      // swallows it (offset (-0.717, -1.124) per metre of pole height).
      if (side < 0) {
        const puZ = (wz) => ((wz + 9.8) / 3.2) * 96;
        for (const pxw of [-48, -30, -12, 6, 24, 42, 50, 58]) {
          octx.fillStyle = 'rgba(14, 12, 10, 0.4)';
          octx.beginPath();
          octx.ellipse(puX(pxw), puZ(-7.6), 4.4, 3.4, 0, 0, 7);
          octx.fill();
          for (let s = 0; s < 5; s++) {
            const hA = 0.58 * s, hB = 0.58 * (s + 1); // first 2.9m of pole
            octx.strokeStyle = `rgba(14, 12, 10, ${(0.38 - s * 0.05).toFixed(3)})`;
            octx.lineWidth = 3.6 - s * 0.4;
            octx.beginPath();
            octx.moveTo(puX(pxw - 0.7168 * hA), puZ(-7.6 - 1.1243 * hA));
            octx.lineTo(puX(pxw - 0.7168 * hB), puZ(-7.6 - 1.1243 * hB));
            octx.stroke();
          }
        }
      }
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
  // ruler line (south one doubles as the bay for the angled parked car;
  // moved to x=-33 with its car so the menu camera path at x≈-26 no longer
  // hovers right on top of them). Tops are tire-dusted a step darker than
  // the sidewalk so they never read as bare pale planes in the foreground.
  // Their road-facing curb faces carry faded no-parking paint (~30% eroded).
  const bayMat = lib.sidewalk.clone();
  bayMat.color = new THREE.Color(0xbcb0a0);
  const bayGrime = (() => {
    const c = canvas(256, 64);
    const gtx = c.getContext('2d');
    // dust wash pooling along both long edges
    for (const [y0, y1] of [[0, 20], [64, 46]]) {
      const grd = gtx.createLinearGradient(0, y0, 0, y1);
      grd.addColorStop(0, 'rgba(96, 82, 62, 0.4)');
      grd.addColorStop(1, 'rgba(96, 82, 62, 0)');
      gtx.fillStyle = grd;
      gtx.fillRect(0, Math.min(y0, y1), 256, Math.abs(y1 - y0));
    }
    // tire scuff arcs where cars pull in
    gtx.lineWidth = 5;
    for (let i = 0; i < 6; i++) {
      gtx.strokeStyle = `rgba(30, 27, 23, ${0.14 + rng() * 0.14})`;
      const ax = 20 + rng() * 216;
      gtx.beginPath();
      gtx.arc(ax, 76 + rng() * 20, 46 + rng() * 26, Math.PI * 1.15, Math.PI * 1.75);
      gtx.stroke();
    }
    // chips + stains
    for (let i = 0; i < 90; i++) {
      gtx.fillStyle = rng.chance(0.6)
        ? `rgba(34, 29, 23, ${0.2 + rng() * 0.3})`
        : `rgba(150, 140, 124, ${0.15 + rng() * 0.2})`;
      gtx.beginPath();
      gtx.ellipse(rng() * 256, rng() * 64, 1 + rng() * 4, 0.8 + rng() * 2.4, rng() * 3, 0, 7);
      gtx.fill();
    }
    const t = tex(c, { srgb: true });
    t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
    return new THREE.MeshStandardMaterial({
      map: t, transparent: true, roughness: 0.95,
      depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1,
    });
  })();
  for (const [bx, side, bw, paintCol] of [[-18, -1, 6.2, '#8a3226'], [-33, 1, 6.4, '#a8862a']]) {
    const g = new THREE.BoxGeometry(bw, 0.15, 1.35);
    scaleBoxUVs(g, bw, 0.15, 1.35, 0.42, 0.42);
    const bo = new THREE.Mesh(g, bayMat);
    bo.position.set(bx, 0.075, side * 6.0);
    bo.receiveShadow = true;
    bo.castShadow = true;
    root.add(bo);
    colliders.addBox(bx, 0.075, side * 6.0, bw, 0.15, 1.35);
    const grime = new THREE.Mesh(new THREE.PlaneGeometry(bw - 0.05, 1.3), bayGrime);
    grime.rotation.x = -Math.PI / 2;
    if (side < 0) grime.rotation.z = Math.PI; // dusty edge hugs the walk side
    grime.position.set(bx, 0.152, side * 6.0);
    grime.renderOrder = 1;
    grime.receiveShadow = true;
    grime.castShadow = false;
    root.add(grime);
    const pc = canvas(512, 24);
    const pctx = pc.getContext('2d');
    pctx.fillStyle = paintCol;
    pctx.fillRect(0, 0, 512, 24);
    pctx.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 260; i++) {
      pctx.fillStyle = `rgba(0,0,0,${0.3 + rng() * 0.5})`;
      pctx.beginPath();
      pctx.arc(rng() * 512, rng() * 24, 1 + rng() * 3.5, 0, 7);
      pctx.fill();
    }
    pctx.globalCompositeOperation = 'source-over';
    const pt = tex(pc, { srgb: true });
    pt.wrapS = pt.wrapT = THREE.ClampToEdgeWrapping;
    const paint = new THREE.Mesh(
      new THREE.PlaneGeometry(bw - 0.04, 0.125),
      new THREE.MeshStandardMaterial({ map: pt, transparent: true, roughness: 0.85 })
    );
    paint.position.set(bx, 0.075, side * (6.0 - 0.675 - 0.005));
    if (side > 0) paint.rotation.y = Math.PI;
    paint.renderOrder = 2;
    paint.receiveShadow = true;
    root.add(paint);
  }

  // Drain grates every ~20m along the gutter line
  {
    const gc = canvas(96, 64);
    const gctx = gc.getContext('2d');
    gctx.fillStyle = 'rgba(38, 36, 32, 0.96)';
    gctx.fillRect(3, 3, 90, 58);
    gctx.fillStyle = 'rgba(10, 9, 8, 0.95)';
    for (let i = 0; i < 6; i++) gctx.fillRect(10 + i * 14, 10, 7, 44);
    gctx.strokeStyle = 'rgba(210, 196, 168, 0.4)'; // sun catch on the lip
    gctx.lineWidth = 2;
    gctx.strokeRect(3, 3, 90, 58);
    const gt = tex(gc, { srgb: true });
    gt.wrapS = gt.wrapT = THREE.ClampToEdgeWrapping;
    const gm = new THREE.MeshStandardMaterial({
      map: gt, transparent: true, roughness: 0.5, metalness: 0.55,
      depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2,
    });
    for (const [gx, gs] of [[-58, 1], [-37, -1], [-16, 1], [4, -1], [24, 1], [45, -1], [64, 1]]) {
      const grate = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.4), gm);
      grate.rotation.x = -Math.PI / 2;
      grate.position.set(gx, 0.035, gs * 6.1);
      grate.renderOrder = 1;
      grate.receiveShadow = true;
      root.add(grate);
    }
  }

  // Flattened cardboard + cloth scraps in the near field of the two photo
  // sightlines (spawn vista x -40..-30, ads corridor x -9..+2) — flat,
  // non-blocking ground litter that fills the close-range frame
  {
    const cb = canvas(64, 64);
    const cbx = cb.getContext('2d');
    cbx.fillStyle = '#a08a64';
    cbx.fillRect(0, 0, 64, 64);
    cbx.fillStyle = 'rgba(120, 100, 70, 0.5)';
    cbx.fillRect(0, 0, 64, 6);
    cbx.fillRect(0, 58, 64, 6);
    cbx.strokeStyle = 'rgba(70, 58, 40, 0.6)';
    cbx.lineWidth = 2;
    cbx.beginPath(); cbx.moveTo(32, 0); cbx.lineTo(32, 64); cbx.stroke(); // fold
    cbx.strokeRect(1, 1, 62, 62);
    const cbMat = new THREE.MeshStandardMaterial({ map: tex(cb, { srgb: true }), roughness: 0.95, side: THREE.DoubleSide });
    const clothScrap = new THREE.MeshStandardMaterial({ color: 0x7a6a52, roughness: 0.98, side: THREE.DoubleSide });
    const spots = [
      [-38.5, 1.6], [-36, -2.2], [-33.5, 0.4], [-31, 2.6], [-34.8, -1.2],
      [-8, 1.2], [-6.5, -1.8], [-4, 0.3], [-1.5, 2.1], [0.8, -0.9],
    ];
    for (const [cxx, czz] of spots) {
      const piece = new THREE.Mesh(
        new THREE.PlaneGeometry(0.5 + rng() * 0.45, 0.4 + rng() * 0.4),
        rng.chance(0.65) ? cbMat : clothScrap
      );
      piece.rotation.x = -Math.PI / 2;
      piece.rotation.z = rng() * Math.PI;
      piece.position.set(cxx + rng.spread(0.5), 0.037 + rng() * 0.006, czz + rng.spread(0.5));
      piece.receiveShadow = true;
      root.add(piece);
    }
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
  const driftCorners = []; // [x, side] — street-front building corners

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
      // warm glow panes: market corner (HOTEL AMIR) + two down the vista
      glowWindows: i === 1 ? 1 : i === 2 ? 2 : i === 4 ? 1 : 0,
      signText: o.storefront ? shopNames[shopIdx++ % shopNames.length] : null,
    }, cx, -10 - o.d / 2, 0);
    driftCorners.push([cx - o.w / 2, -1], [cx + o.w / 2, -1]);
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
      // warm glow panes: market corner (AL NOOR) + two down the vista
      glowWindows: i === 1 ? 1 : i === 2 ? 2 : i >= 4 ? 1 : 0,
      signText: o.storefront ? shopNames[shopIdx++ % shopNames.length] : null,
    }, cx, 10 + o.d / 2, Math.PI);
    driftCorners.push([cx - o.w / 2, 1], [cx + o.w / 2, 1]);
    cx += o.w / 2 + gap;
  }

  // Sand drifts piled into every street-front building corner (one merged
  // mesh of half-cones, flat side against the wall)
  {
    const geos = [];
    for (const [dx, side] of driftCorners) {
      if (Math.abs(dx) > 71) continue;
      const rr = 0.5 + rng() * 0.45;
      const hh = 0.14 + rng() * 0.13;
      const g = new THREE.ConeGeometry(rr, hh, 7, 1, false, 0, Math.PI);
      g.rotateY(side > 0 ? Math.PI / 2 : -Math.PI / 2); // curved face toward the road
      g.translate(dx + rng.spread(0.35), 0.155 + hh / 2 - 0.02, side * 9.98);
      geos.push(g);
    }
    const merged = BufferGeometryUtils.mergeGeometries(geos, false);
    const drifts = new THREE.Mesh(merged, lib.dirt);
    drifts.receiveShadow = true;
    root.add(drifts);
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
  // East end. The old three-barrier row read as one flat gray blockout box
  // at the exact focal point of the street vista — replaced with a
  // burnt-out wreck angled across the checkpoint, two skewed barriers and
  // a rubble spill (same collision volume as before).
  boundary(68, -4.5, 10, Math.PI / 2);
  boundary(68, 4.5, 10, Math.PI / 2);
  {
    const wreck = buildCar({ burned: true });
    wreck.position.set(60.6, 0, -0.5);
    wreck.rotation.y = 1.12;
    root.add(wreck);
    minimapShapes.push({ type: 'p', x: 60.6, z: -0.5, w: 4.15, d: 2 });
    for (const [jx, jz, jyaw] of [
      [60, -3.4, Math.PI / 2 + 0.3],
      [60.3, 3.2, -Math.PI / 2 + 0.24],
    ]) {
      const jb = buildJerseyBarrier(3);
      jb.position.set(jx, 0, jz);
      jb.rotation.y = jyaw;
      root.add(jb);
    }
    const gateRubble = buildRubblePile(1.8, 0.7, 31);
    gateRubble.position.set(61.6, 0, 2.4);
    root.add(gateRubble);
  }
  colliders.addBox(60.2, 0.5, 0, 1.2, 1, 10);
  addCover(57, -2); addCover(57, 2);

  // East vista terminator: ruined masonry gate arch over the street so the
  // long sightline ends on silhouette instead of a blank pale wall. Pylons
  // sit at |z|=5.4 and the beam underside is at y 6.4 — the z ±3 photo
  // corridor stays open through to the minaret.
  {
    const mkGate = (mat, x, y, z, sx, sy, sz) => {
      const gg = new THREE.BoxGeometry(sx, sy, sz);
      scaleBoxUVs(gg, sx, sy, sz, 0.3, 0.3);
      const mm = new THREE.Mesh(gg, mat);
      mm.position.set(x, y, z);
      mm.castShadow = true;
      mm.receiveShadow = true;
      root.add(mm);
      return mm;
    };
    for (const s of [-1, 1]) {
      mkGate(lib.plasterOchre, 63, 3.6, s * 5.4, 1.7, 7.2, 1.7);
      mkGate(lib.concreteDark, 63, 7.32, s * 5.4, 1.95, 0.28, 1.95);
      colliders.addBox(63, 3.6, s * 5.4, 1.7, 7.2, 1.7);
      minimapShapes.push({ type: 'w', x: 63, z: s * 5.4, w: 1.7, d: 1.7 });
    }
    mkGate(lib.plasterOchre, 63, 7.15, 0, 1.3, 1.5, 9.4);
    // Broken crenellation teeth along the beam
    for (const tz of [-3.75, -1.25, 1.25, 3.75]) {
      mkGate(lib.plasterOchre, 63, 8.15 + rng.spread(0.12), tz + rng.spread(0.2), 1.0, 0.5 + rng() * 0.25, 0.7);
    }
    // Tattered cloth hanging off the beam (outside the z ±3 corridor)
    const tatterMat = new THREE.MeshStandardMaterial({ color: 0x8a5a44, roughness: 0.95, side: THREE.DoubleSide });
    for (const s of [-1, 1]) {
      const tatter = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 1.15), tatterMat);
      tatter.position.set(63, 5.85, s * 3.7);
      tatter.rotation.y = Math.PI / 2 + rng.spread(0.15);
      tatter.rotation.x = rng.spread(0.1);
      tatter.castShadow = true;
      root.add(tatter);
    }
  }
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

  // Parked / abandoned cars — explicit but VARIED muted paint (dusty white /
  // faded red / desaturated blue / gunmetal / sand). The baked dust gradient
  // and panel lines in props.js keep even the pale bodies from reading as
  // unlit blockouts, and street-level colour variety is a big MWII tell.
  // NOTE: the warm 5600K sun neutralises low-chroma paint — these hexes are
  // deliberately deeper/more saturated than the target on-screen read.
  // (Two north-curb yaws nudged ~2.7° in round 7 so the parking line
  // doesn't read laser-straight down the vista.)
  const carDefs = [
    [-38, 6.3, 0.15, { color: 0x38536e }], [-24, -6.6, -0.148, { color: 0xcfc8b8 }], [-13, 6.5, 3.2, { hatch: true, color: 0x8a352a }],
    [20, -6.2, 0.28, { burned: true }], [30, 5.9, -3.05, { hatch: true, color: 0x35373d }], [44, -5.8, 0.052, { burned: true }],
    [-45, -6.4, 0.05, { pickup: true, color: 0x35373d }], [38, 6.4, 2.9, { pickup: true, color: 0xcfc8b8 }],
    [-34, -6.3, 0.18, { hatch: true, color: 0x9c8557 }], // hatchbacks break the sedan monoculture
  ];
  for (const [x, z, yaw, o] of carDefs) {
    const car = buildCar(o);
    if (x === -13) {
      // Menu-frame car (rear faces the dolly): a thin bright catch along
      // the roof / hatch-glass junction so the dark glossy blob at the
      // frame's lower right reads as a car roof, not a puddle of tar.
      const glint = new THREE.Mesh(
        new THREE.BoxGeometry(0.055, 0.02, 1.28),
        new THREE.MeshStandardMaterial({
          color: 0xdfe9f0, roughness: 0.12, metalness: 0.85, envMapIntensity: 3.2,
          emissive: 0x93a8b6, emissiveIntensity: 0.32,
        })
      );
      glint.position.set(1.56, 1.468, 0); // clear of the beveled roof crown
      car.add(glint);
    }
    place(car, x, z, yaw, { collH: 1.5 });
    minimapShapes.push({ type: 'p', x, z, w: 4.15, d: 2 });
    addCover(x - 3, z); addCover(x + 3, z);
  }

  // Composition breakers: a car parked at an angle, half up on the south
  // parking bay, and a toppled barrier flung diagonally near the crater —
  // both outside the down-street photo corridor. (The angled car lived at
  // x=-25 where its sun-bleached roof/hood filled the menu camera's
  // bottom-centre foreground as a huge pale plane — moved west with its
  // bay, out of the menu near-field, and repainted a deeper olive-drab.)
  {
    const angled = buildCar({ color: 0x77683f });
    angled.rotation.x = -0.06; // raked — curb-side wheels ride the bay slab
    place(angled, -33, 6.3, 0.5, { collH: 1.5, y: 0.09 });
    minimapShapes.push({ type: 'p', x: -33, z: 6.3, w: 4.15, d: 2 });
    addCover(-35.8, 5.2);
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
    // Warm pools over the stall tables: 3 point lights (shadowless, ~2m
    // pools) — fewer but hot enough to actually register on the wood/walk.
    // The middle one dropped to 1.7m so its pool reaches the pavement, and
    // one extra low bulb (total +1) sits between the stalls so the SIDEWALK
    // under the tables catches the same warm light the tabletops do.
    for (const [lx, ly, lz] of [
      [-22, 2.1, 8.0], [-19.7, 1.7, 8.55], [-17.4, 2.15, 7.9],
    ]) {
      const pl = new THREE.PointLight(0xffb060, 7, 5.2, 2);
      pl.position.set(lx, ly, lz);
      root.add(pl);
    }
    {
      const ground = new THREE.PointLight(0xffa858, 4.5, 4.6, 2);
      ground.position.set(-19.8, 0.7, 8.1);
      root.add(ground);
    }
    // Emissive gradient blobs under the strings (table tops + sidewalk) so
    // the pooled light survives even a heavily graded still
    const glowC = canvas(64, 64);
    const gctx2 = glowC.getContext('2d');
    const gg = gctx2.createRadialGradient(32, 32, 3, 32, 32, 32);
    gg.addColorStop(0, 'rgba(255, 178, 100, 0.85)');
    gg.addColorStop(0.45, 'rgba(255, 156, 76, 0.32)');
    gg.addColorStop(1, 'rgba(255, 140, 60, 0)');
    gctx2.fillStyle = gg;
    gctx2.fillRect(0, 0, 64, 64);
    const glowTex = tex(glowC);
    glowTex.wrapS = glowTex.wrapT = THREE.ClampToEdgeWrapping;
    const glowMat = new THREE.MeshBasicMaterial({
      map: glowTex, transparent: true, blending: THREE.AdditiveBlending,
      depthWrite: false, opacity: 0.44,
    });
    for (const [gx, gy, gz, gs] of [
      [-22, 1.06, 7.75, 1.7], [-17.4, 1.06, 7.9, 1.6],   // stall table tops
      [-22, 0.185, 7.7, 2.3], [-17.4, 0.185, 7.85, 2.2],  // pools UNDER the tables
      [-19.9, 0.185, 8.5, 2.4], [-23.2, 0.185, 8.8, 1.9], // pools between stalls
    ]) {
      const blob = new THREE.Mesh(new THREE.PlaneGeometry(gs, gs), glowMat);
      blob.rotation.x = -Math.PI / 2;
      blob.position.set(gx, gy, gz);
      blob.renderOrder = 3;
      root.add(blob);
    }
  }

  // Menu-frame bottom-left anchor (round 7): the dolly's lower-left
  // quadrant was featureless shadowed asphalt — a small dumped crate
  // stack mid-road catches a stray warm practical (the round's one new
  // point light) so the corner reads. Doubles as mid-street cover.
  {
    place(buildCrate(0.8), -21.6, -1.15, 0.42, { collH: 0.8 });
    place(buildCrate(0.55), -20.9, -1.75, 1.15, { collH: 0.55 });
    addCover(-21.9, -2.7);
    const junkLight = new THREE.PointLight(0xffa860, 4.5, 4.6, 2);
    junkLight.position.set(-21.2, 1.1, -1.35);
    root.add(junkLight);
    // Emissive pool under the group so the warmth survives a graded still
    const jg = canvas(64, 64);
    const jgc = jg.getContext('2d');
    const jgg = jgc.createRadialGradient(32, 32, 3, 32, 32, 32);
    jgg.addColorStop(0, 'rgba(255, 176, 100, 0.7)');
    jgg.addColorStop(0.5, 'rgba(255, 156, 76, 0.26)');
    jgg.addColorStop(1, 'rgba(255, 140, 60, 0)');
    jgc.fillStyle = jgg;
    jgc.fillRect(0, 0, 64, 64);
    const jgTex = tex(jg);
    jgTex.wrapS = jgTex.wrapT = THREE.ClampToEdgeWrapping;
    const pool = new THREE.Mesh(
      new THREE.PlaneGeometry(2.6, 2.6),
      new THREE.MeshBasicMaterial({
        map: jgTex, transparent: true, blending: THREE.AdditiveBlending,
        depthWrite: false, opacity: 0.36,
      })
    );
    pool.rotation.x = -Math.PI / 2;
    pool.position.set(-21.3, 0.045, -1.45);
    pool.renderOrder = 3;
    root.add(pool);
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

  // Street lights on south side. Round 7: the shared galvanized column
  // material (metalness 0.4) collapsed to a dead black cylinder where the
  // menu camera sees the x=-20 lamp against the bright east sky — every
  // lamp column is re-skinned with low-metalness worn dark-grey paint
  // (baked scuffs + base dust) so hemi/bounce fill actually registers.
  {
    const lampPaint = (() => {
      const c = canvas(64, 256);
      const lpx = c.getContext('2d');
      lpx.fillStyle = '#585c60';
      lpx.fillRect(0, 0, 64, 256);
      for (let i = 0; i < 90; i++) { // vertical wear: dark chips + pale scuffs
        const lum = rng.chance(0.6) ? 30 + rng() * 18 : 112 + rng() * 38;
        lpx.fillStyle = `rgba(${lum}, ${lum}, ${lum * 0.96}, ${0.07 + rng() * 0.18})`;
        lpx.fillRect(rng() * 64, rng() * 256, 1.5 + rng() * 4, 10 + rng() * 60);
      }
      const grd = lpx.createLinearGradient(0, 188, 0, 256); // dust toward the base
      grd.addColorStop(0, 'rgba(124, 102, 72, 0)');
      grd.addColorStop(1, 'rgba(124, 102, 72, 0.45)');
      lpx.fillStyle = grd;
      lpx.fillRect(0, 188, 64, 68);
      return new THREE.MeshStandardMaterial({
        map: tex(c, { srgb: true }), roughness: 0.72, metalness: 0.12,
      });
    })();
    for (const sx of [-40, -20, 16, 36, 54]) {
      const lamp = buildStreetLight(6.4);
      lamp.traverse((o) => {
        if (o.isMesh && o.material && o.material.color && o.material.color.getHex() === 0x60666b) {
          o.material = lampPaint;
        }
      });
      place(lamp, sx, 7.4, Math.PI, { collH: 6.4, tag: 'pole' });
    }
    // The menu-foreground lamp (x=-20) stands amid the market string bulbs:
    // a slim warm rim strip hugs its bulb-facing (NW, camera-side) flank so
    // the column reads lit by the practicals instead of silhouetting.
    const rimC = canvas(16, 128);
    const rimCtx = rimC.getContext('2d');
    const rg = rimCtx.createLinearGradient(0, 0, 0, 128);
    rg.addColorStop(0, 'rgba(255, 178, 100, 0)');
    rg.addColorStop(0.42, 'rgba(255, 178, 100, 0.85)');
    rg.addColorStop(0.62, 'rgba(255, 168, 88, 0.55)');
    rg.addColorStop(1, 'rgba(255, 160, 80, 0)');
    rimCtx.fillStyle = rg;
    rimCtx.fillRect(5, 0, 6, 128);
    const rimTex = tex(rimC);
    rimTex.wrapS = rimTex.wrapT = THREE.ClampToEdgeWrapping;
    const rim = new THREE.Mesh(
      new THREE.PlaneGeometry(0.055, 3.1),
      new THREE.MeshBasicMaterial({
        map: rimTex, transparent: true, blending: THREE.AdditiveBlending,
        depthWrite: false, opacity: 0.85,
      })
    );
    // Offset sized to the tapered shaft (r 0.13→0.05) so the strip skims
    // the surface at bulb height and only re-enters it where alpha ≈ 0
    rim.position.set(-20.062, 2.9, 7.306);
    rim.rotation.y = Math.atan2(-0.55, -0.835);
    rim.renderOrder = 3;
    root.add(rim);
  }

  // Extra rubble piles + blast crater east (the small south pile moved
  // west off the relocated parking bay so the angled car doesn't clip it)
  place(buildRubblePile(2.6, 1.0, 21), 24, -8.7, 0, { collH: 1.0 });
  place(buildRubblePile(1.8, 0.7, 22), -43.5, 7.7, 0, { collH: 0.7 });
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

  /* ------------------------ mid-distance dressing ------------------------ */
  // 30-120m band from the vista camera: the empty middle of the street gets
  // incident — a chicane funneling into the arch checkpoint, a rubble spill
  // off the north sidewalk, a stall crowding the road, and curb junk.

  // Jersey-barrier chicane short of the arch checkpoint (S-path stays open
  // around both ends for the nav grid)
  for (const [x, z, yaw] of [[52, -1.2, -0.5], [55.5, 2.6, 0.6], [49.5, -4.9, 0.15]]) {
    place(buildJerseyBarrier(3), x, z, yaw, { collH: 0.9 });
  }
  addCover(52.5, -2.6); addCover(55, 3.6);

  // Rubble mound with rebar spilling off the north sidewalk edge onto the
  // road (half on the slab, half in the gutter)
  place(buildRubblePile(1.7, 0.8, 43), 14.5, -6.5, 0.3, { collH: 0.8 });
  addCover(14.5, -4.4);

  // Wooden market stall shoved off the south curb, crowding the lane
  place(buildMarketStall(3), 25.5, 5.2, 0.35, { collH: 1.1 });
  addCover(24.3, 3.7);

  // Curb-hugging junk: tire piles, stray crates
  place(buildTireStack(2), -6.8, -6.1, 0.6, { collH: 0.7 });
  place(buildTireStack(2), 44.5, 5.9, 1.9, { collH: 0.7 });
  place(buildCrate(0.7), 12.3, -5.95, 0.5, { collH: 0.7 });
  place(buildCrate(0.85), -2.6, 6.1, 1.1, { collH: 0.85 });
  place(buildCrate(0.6), 33.8, 6.2, 0.3, { collH: 0.6 });

  // Knotted trash bags dumped against both curbs — cheap squashed icosa
  // shells with a plastic sheen, instanced in one draw, clustered like
  // real kerbside dumping (2-3 per pile)
  {
    const bagGeo = new THREE.IcosahedronGeometry(0.17, 1);
    bagGeo.scale(1.15, 0.62, 0.95);
    const bagMat = new THREE.MeshStandardMaterial({
      color: 0x24272b, roughness: 0.38, metalness: 0.05, envMapIntensity: 1.3,
    });
    const bagClusters = [
      [-9.8, -5.9, 2], [0.9, -6.15, 3], [7.4, 6.1, 2],
      [18.6, 6.05, 2], [29.6, -6.05, 3], [49, -5.85, 2],
      [-20.4, -0.5, 2], // spills against the menu-corner crate stack
    ];
    let bagCount = 0;
    for (const c of bagClusters) bagCount += c[2];
    const bags = new THREE.InstancedMesh(bagGeo, bagMat, bagCount);
    const bm4 = new THREE.Matrix4();
    const bq = new THREE.Quaternion();
    const beu = new THREE.Euler();
    let bi = 0;
    for (const [bx2, bz2, n] of bagClusters) {
      for (let i = 0; i < n; i++) {
        const s = 0.85 + rng() * 0.5;
        const px2 = bx2 + rng.spread(0.42) + i * 0.26;
        const pz2 = bz2 + rng.spread(0.3);
        beu.set(rng.spread(0.14), rng() * Math.PI, rng.spread(0.14));
        bq.setFromEuler(beu);
        bm4.compose(
          new THREE.Vector3(px2, 0.1 * s - 0.012, pz2), bq,
          new THREE.Vector3(s * (1 + rng.spread(0.14)), s, s * (1 + rng.spread(0.14))));
        bags.setMatrixAt(bi++, bm4);
        scatterBlobs.push([px2, 0.038, pz2, 0.52 * s]);
      }
    }
    bags.castShadow = true;
    bags.receiveShadow = true;
    root.add(bags);
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
  // axis so the long sightline ends on a deliberate landmark. Skinned with
  // a masonry-course canvas so it doesn't read as an untextured cylinder.
  {
    const lmC = canvas(128, 256);
    const lmCtx = lmC.getContext('2d');
    lmCtx.fillStyle = '#efe6d2';
    lmCtx.fillRect(0, 0, 128, 256);
    // masonry courses + block joints
    for (let yy = 0; yy < 256; yy += 16) {
      lmCtx.fillStyle = `rgba(120, 102, 78, ${0.16 + rng() * 0.1})`;
      lmCtx.fillRect(0, yy, 128, 1.6);
      const off = (yy / 16) % 2 ? 16 : 0;
      for (let xx = off; xx < 128; xx += 32) {
        lmCtx.fillStyle = 'rgba(120, 102, 78, 0.14)';
        lmCtx.fillRect(xx, yy, 1.4, 16);
      }
      // per-block value shifts
      for (let xx = off; xx < 128; xx += 32) {
        lmCtx.fillStyle = `rgba(${rng.chance(0.5) ? '255,248,232' : '150,132,104'}, ${rng() * 0.12})`;
        lmCtx.fillRect(xx, yy, 32, 16);
      }
    }
    // weather streaks running down
    for (let i = 0; i < 34; i++) {
      lmCtx.fillStyle = `rgba(96, 80, 60, ${0.05 + rng() * 0.12})`;
      lmCtx.fillRect(rng() * 128, rng() * 40, 1.5 + rng() * 3.5, 40 + rng() * 150);
    }
    const lmTex = tex(lmC, { srgb: true, repeat: [3, 2] });
    const lmMat = new THREE.MeshStandardMaterial({ map: lmTex, color: 0xb9a888, roughness: 0.95 });
    const lmDark = new THREE.MeshStandardMaterial({ map: lmTex, color: 0x8a7960, roughness: 0.95 });
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
    new THREE.Vector3(58.5, 0, 4.6), // clear of the checkpoint chicane

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
