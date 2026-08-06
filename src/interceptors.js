// interceptors.js — pooled interceptor missiles with boost / guide / terminal
// phases, lead-pursuit steering (simplified fictional model) and kill logic.
// Visuals: three lathe-profile airframes (one per battery) with procedural
// painted-canvas textures (panel lines, raceway conduit, stenciling, aft
// scorch), merged fins, an additive mach-diamond exhaust plume during boost,
// and a phase-driven motor flare that doubles as the km-range glow dot.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Pool, Rand, clamp, pad2 } from './util.js';
import { GRAVITY, predictIntercept, steerVelocity } from './physics.js';

export function createInterceptors(ctx) {
  const { scene } = ctx;
  const active = [];
  let counter = 0;

  // ============================================================ local canvas
  // (build-time only; seeded so pool construction is deterministic)
  const vr = new Rand(0x1eda57);
  function cv(w, h) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    return [c, c.getContext('2d')];
  }
  function toTex(c, { srgb = true } = {}) {
    const t = new THREE.CanvasTexture(c);
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.ClampToEdgeWrapping;
    t.anisotropy = 4;
    return t;
  }

  const W = 256, H = 512;
  const V_FIN = 0.055; // bottom strip of the canvas reserved for fin/hardware shading
  const FIN_Y0 = H * (1 - V_FIN); // 483

  /** canvas y for a geometric height (0=aft .. L=nose), body maps v in [V_FIN,1] */
  const cy = (y, L) => (1 - (V_FIN + (y / L) * (1 - V_FIN))) * H;

  /**
   * shared painted-airframe pass. spec:
   *  base, noseColor, noseLen, rings [y...], bands [{y,h,color}], stencil,
   *  tail, racewayW, L
   */
  function airframeTextures(spec) {
    const L = spec.L;
    const [c, g] = cv(W, H);
    g.fillStyle = spec.base;
    g.fillRect(0, 0, W, H);
    // subtle axial paint streaking + grain
    for (let i = 0; i < 240; i++) {
      const x = vr.next() * W;
      g.strokeStyle = vr.next() < 0.5
        ? `rgba(255,255,255,${vr.range(0.02, 0.07)})`
        : `rgba(40,42,46,${vr.range(0.02, 0.08)})`;
      g.lineWidth = vr.range(0.8, 2.4);
      g.beginPath();
      g.moveTo(x, vr.next() * H * 0.3);
      g.lineTo(x + vr.range(-4, 4), H);
      g.stroke();
    }
    {
      const img = g.getImageData(0, 0, W, H);
      const d = img.data;
      for (let i = 0; i < d.length; i += 4) {
        const n = (vr.next() - 0.5) * 9;
        d[i] += n; d[i + 1] += n; d[i + 2] += n;
      }
      g.putImageData(img, 0, 0);
    }
    // large-scale panel tone steps between ring frames (breaks up flat paint)
    {
      const ys = [0, ...(spec.rings ?? []), L];
      for (let i = 0; i < ys.length - 1; i++) {
        if (vr.next() < 0.55) continue;
        const dark = vr.next() < 0.5;
        g.fillStyle = dark ? `rgba(30,32,38,${vr.range(0.04, 0.09)})` : `rgba(255,255,255,${vr.range(0.04, 0.08)})`;
        g.fillRect(0, cy(ys[i + 1], L), W, cy(ys[i], L) - cy(ys[i + 1], L));
      }
    }
    // color bands (stage joints / ID bands) — drawn under panel lines
    for (const b of spec.bands ?? []) {
      g.fillStyle = b.color;
      g.fillRect(0, cy(b.y + b.h, L), W, (b.h / L) * (1 - V_FIN) * H);
    }
    // nose: painted radome/shroud with soft blend line
    {
      const yN = cy(L - spec.noseLen, L);
      const grad = g.createLinearGradient(0, yN - 10, 0, yN + 8);
      grad.addColorStop(0, spec.noseColor);
      grad.addColorStop(1, spec.noseColor + '00');
      g.fillStyle = spec.noseColor;
      g.fillRect(0, 0, W, yN - 6);
      g.fillStyle = grad;
      g.fillRect(0, yN - 10, W, 18);
      // anti-glare matte ring at the blend
      g.fillStyle = 'rgba(20,21,24,0.5)';
      g.fillRect(0, yN - 2, W, 2.4);
    }
    // ring frames / panel joints
    for (const y of spec.rings ?? []) {
      const yy = cy(y, L);
      g.fillStyle = 'rgba(30,32,36,0.55)';
      g.fillRect(0, yy, W, 1.8);
      g.fillStyle = 'rgba(255,255,255,0.14)';
      g.fillRect(0, yy + 1.8, W, 1);
      // fastener dots on some rings
      if (vr.next() < 0.7) {
        for (let x = 8; x < W; x += 24) {
          g.fillStyle = 'rgba(28,30,34,0.5)';
          g.beginPath(); g.arc(x, yy + 5, 1.1, 0, 7); g.fill();
        }
      }
    }
    // access panels
    for (let i = 0; i < 5; i++) {
      const px = vr.next() * (W - 40) + 8, py = vr.range(0.22, 0.72);
      const yy = cy(py * L, L);
      g.strokeStyle = 'rgba(34,36,40,0.4)';
      g.lineWidth = 1.1;
      g.strokeRect(px, yy, vr.range(16, 34), vr.range(8, 16));
    }
    // raceway conduit: dark strip w/ clip blocks, full length on one side
    {
      const rw = spec.racewayW ?? 9;
      const rx = 178;
      const ry0 = cy(L - spec.noseLen, L);
      g.fillStyle = 'rgba(38,40,44,0.9)';
      g.fillRect(rx, ry0, rw, FIN_Y0 - ry0);
      g.fillStyle = 'rgba(255,255,255,0.10)';
      g.fillRect(rx + rw, ry0, 1.4, FIN_Y0 - ry0);
      for (let y = cy(L - spec.noseLen, L) + 8; y < FIN_Y0 - 6; y += 26) {
        g.fillStyle = 'rgba(16,17,19,0.9)';
        g.fillRect(rx - 2, y, rw + 4, 5);
      }
    }
    // stencils: unit text along the axis + tail code + tiny data plate
    {
      g.save();
      g.translate(60, cy(spec.stencilY ?? L * 0.55, L));
      g.rotate(Math.PI / 2);
      g.font = 'bold 21px "Arial Narrow", Arial, sans-serif';
      g.textAlign = 'left';
      g.fillStyle = spec.stencilColor ?? 'rgba(44,48,56,0.9)';
      g.fillText(spec.stencil, 0, 0);
      g.restore();
      g.save();
      g.translate(128, cy(L * 0.30, L));
      g.rotate(Math.PI / 2);
      g.font = 'bold 14px monospace';
      g.fillStyle = spec.stencilColor ?? 'rgba(44,48,56,0.8)';
      g.fillText(spec.tail, 0, 0);
      g.restore();
      // roundel: triangle in circle
      const ry = cy(L * 0.42, L);
      g.strokeStyle = spec.stencilColor ?? 'rgba(52,56,62,0.75)';
      g.lineWidth = 2;
      g.beginPath(); g.arc(30, ry, 11, 0, 7); g.stroke();
      g.beginPath();
      g.moveTo(30, ry - 7); g.lineTo(36.5, ry + 6); g.lineTo(23.5, ry + 6);
      g.closePath(); g.stroke();
      // NO LIFT / umbilical markings near aft
      g.fillStyle = spec.stencilColor ?? 'rgba(52,56,62,0.6)';
      g.font = 'bold 9px monospace';
      g.textAlign = 'left';
      g.fillText('UMBILICAL', 14, cy(L * 0.13, L));
      g.strokeStyle = 'rgba(52,56,62,0.5)';
      g.strokeRect(10, cy(L * 0.13, L) + 4, 46, 12);
    }
    // aft scorch: exhaust staining creeping up from the nozzle
    {
      const grad = g.createLinearGradient(0, FIN_Y0, 0, FIN_Y0 - 60);
      grad.addColorStop(0, 'rgba(22,18,15,0.88)');
      grad.addColorStop(0.4, 'rgba(38,30,24,0.45)');
      grad.addColorStop(1, 'rgba(50,40,30,0)');
      g.fillStyle = grad;
      g.fillRect(0, FIN_Y0 - 60, W, 60);
      for (let i = 0; i < 46; i++) {
        const x = vr.next() * W;
        g.fillStyle = `rgba(14,12,10,${vr.range(0.1, 0.4)})`;
        g.fillRect(x, FIN_Y0 - vr.range(6, 46), vr.range(1.5, 4), vr.range(8, 40));
      }
    }
    // fin/hardware strip (bottom): brushed metal with edge wear
    {
      g.fillStyle = spec.finColor ?? '#84898f';
      g.fillRect(0, FIN_Y0, W, H - FIN_Y0);
      for (let i = 0; i < 90; i++) {
        g.fillStyle = vr.next() < 0.5
          ? `rgba(230,234,238,${vr.range(0.06, 0.2)})`
          : `rgba(30,32,36,${vr.range(0.06, 0.22)})`;
        g.fillRect(vr.next() * W, FIN_Y0 + vr.next() * (H - FIN_Y0), vr.range(3, 14), 1.2);
      }
    }
    // ---------------- emissive: nozzle lip ring + throat wash (colors baked)
    const [ec, eg] = cv(W, H);
    eg.fillStyle = '#000';
    eg.fillRect(0, 0, W, H);
    const lipY = cy(0.16, L);
    let grad = eg.createLinearGradient(0, lipY + 8, 0, lipY - 26);
    grad.addColorStop(0, 'rgba(255,214,150,0.95)');
    grad.addColorStop(0.45, 'rgba(255,140,60,0.5)');
    grad.addColorStop(1, 'rgba(255,90,30,0)');
    eg.fillStyle = grad;
    eg.fillRect(0, lipY - 26, W, 40);
    return { map: toTex(c), emis: toTex(ec, { srgb: false }) };
  }

  /** additive exhaust plume: v=1 (canvas top) at the nozzle, mach diamonds.
   *  Ambient sheath + thin waist line + bright diamond knots — the gaps stay
   *  dim so the shock-cell pattern survives additive blending over bright sky. */
  function makePlumeTexture() {
    const [c, g] = cv(64, 256);
    g.clearRect(0, 0, 64, 256);
    const grad = g.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0.0, 'rgba(255,246,224,0.5)');
    grad.addColorStop(0.10, 'rgba(255,226,180,0.3)');
    grad.addColorStop(0.34, 'rgba(255,198,130,0.17)');
    grad.addColorStop(0.66, 'rgba(255,160,90,0.07)');
    grad.addColorStop(1.0, 'rgba(255,140,70,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 256);
    g.globalCompositeOperation = 'lighter';
    // thin waist line connecting the shock cells
    {
      const core = g.createLinearGradient(0, 0, 0, 200);
      core.addColorStop(0, 'rgba(255,240,210,0.4)');
      core.addColorStop(0.55, 'rgba(255,214,150,0.2)');
      core.addColorStop(1, 'rgba(255,190,120,0)');
      g.fillStyle = core;
      g.fillRect(28, 0, 8, 200);
    }
    // mach diamonds: bright axisymmetric knots fading downstream
    for (const [y, a, r] of [[20, 1.0, 11], [48, 0.8, 10.5], [78, 0.58, 10], [110, 0.4, 9.5], [144, 0.24, 9], [178, 0.12, 8.5]]) {
      const dg = g.createRadialGradient(32, y, 0, 32, y, r);
      dg.addColorStop(0, `rgba(255,255,255,${a})`);
      dg.addColorStop(0.45, `rgba(255,238,196,${a * 0.55})`);
      dg.addColorStop(1, 'rgba(255,220,160,0)');
      g.fillStyle = dg;
      g.fillRect(0, y - 12, 64, 24);
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.ClampToEdgeWrapping;
    return t;
  }

  /** round motor flare (also the km-range glow dot) */
  function makeFlareTexture() {
    const [c, g] = cv(128, 128);
    const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.15, 'rgba(255,244,220,0.92)');
    grad.addColorStop(0.4, 'rgba(255,204,140,0.32)');
    grad.addColorStop(0.72, 'rgba(255,170,100,0.10)');
    grad.addColorStop(1, 'rgba(255,160,90,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  }

  // ============================================================ geometry
  /** lathe with y-proportional V mapped into [vStart, 1] */
  function lathe(profile, seg, vStart = V_FIN) {
    const pts = profile.map(([r, y]) => new THREE.Vector2(r, y));
    const geo = new THREE.LatheGeometry(pts, seg);
    let yMin = Infinity, yMax = -Infinity;
    for (const [, y] of profile) { yMin = Math.min(yMin, y); yMax = Math.max(yMax, y); }
    const pos = geo.attributes.position, uv = geo.attributes.uv;
    for (let i = 0; i < uv.count; i++) {
      const v = (pos.getY(i) - yMin) / (yMax - yMin);
      uv.setY(i, vStart + v * (1 - vStart));
    }
    return geo;
  }

  /** thin swept trapezoid fin (span outward +X), UVs into the fin strip */
  function finGeo(r0, y0, span, root, tip, sweep, th) {
    const x1 = r0 + span;
    const yA = y0, yB = y0 + root;            // root chord (at body)
    const yC = y0 + sweep, yD = y0 + sweep + tip; // tip chord (outboard)
    const hz = th / 2;
    const quad = (a, b, c2, d) => [a, b, c2, a, c2, d];
    const P = [];
    const corners = {
      A0: [r0, yA, hz], B0: [r0, yB, hz], C0: [x1, yD, hz], D0: [x1, yC, hz],
      A1: [r0, yA, -hz], B1: [r0, yB, -hz], C1: [x1, yD, -hz], D1: [x1, yC, -hz],
    };
    // +Z face, -Z face, leading edge, trailing edge, tip edge
    P.push(...quad(corners.A0, corners.D0, corners.C0, corners.B0));
    P.push(...quad(corners.A1, corners.B1, corners.C1, corners.D1));
    P.push(...quad(corners.B0, corners.C0, corners.C1, corners.B1)); // upper (leading)
    P.push(...quad(corners.A0, corners.A1, corners.D1, corners.D0)); // lower (trailing)
    P.push(...quad(corners.D0, corners.D1, corners.C1, corners.C0)); // tip
    const posArr = new Float32Array(P.length * 3);
    const uvArr = new Float32Array(P.length * 2);
    for (let i = 0; i < P.length; i++) {
      posArr.set(P[i], i * 3);
      // map span -> u, chord -> v inside the reserved fin strip
      uvArr[i * 2] = clamp((P[i][0] - r0) / Math.max(span, 0.001), 0, 1) * 0.9 + 0.05;
      uvArr[i * 2 + 1] = clamp((P[i][1] - y0) / Math.max(root + sweep, 0.001), 0, 1) * (V_FIN * 0.86) + V_FIN * 0.07;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uvArr, 2));
    geo.computeVertexNormals();
    return geo;
  }

  /** merge a lathe airframe + fin sets into ONE geometry (single material) */
  function buildAirframe(profile, seg, finSets) {
    const parts = [lathe(profile, seg).toNonIndexed()];
    for (const f of finSets) {
      for (let i = 0; i < f.count; i++) {
        const a = (i / f.count) * Math.PI * 2 + (f.phase ?? Math.PI / 4);
        const fg = finGeo(f.r0, f.y0, f.span, f.root, f.tip, f.sweep, f.th);
        fg.rotateY(-a);
        parts.push(fg);
      }
    }
    const merged = mergeGeometries(parts, false);
    for (const p of parts) p.dispose();
    // center on length, nose -> +Z
    let yMin = Infinity, yMax = -Infinity;
    for (const [, y] of profile) { yMin = Math.min(yMin, y); yMax = Math.max(yMax, y); }
    merged.translate(0, -(yMin + yMax) / 2, 0);
    merged.rotateX(Math.PI / 2);
    return merged;
  }

  // ---- RAMPART PX-4: agile terminal dart (PAC-3-inspired, fictional)
  const rampartGeo = buildAirframe([
    [0.085, 0.12], [0.16, 0.02], [0.205, 0.10], [0.21, 0.55],
    [0.21, 4.0], [0.19, 4.35], [0.145, 4.7], [0.085, 4.98], [0.038, 5.12], [0.0, 5.2],
  ], 20, [
    { count: 4, r0: 0.19, y0: 0.16, span: 0.30, root: 0.66, tip: 0.24, sweep: 0.30, th: 0.03 },
    { count: 4, r0: 0.185, y0: 3.86, span: 0.15, root: 0.34, tip: 0.13, sweep: 0.16, th: 0.024 },
  ]);
  // ---- HALBERD HA-9: high-altitude single-stage taper (THAAD-inspired)
  const halberdGeo = buildAirframe([
    [0.11, 0.14], [0.21, 0.02], [0.30, 0.10], [0.295, 0.75],
    [0.25, 1.15], [0.225, 3.3], [0.205, 4.45], [0.17, 5.15], [0.10, 5.75], [0.045, 6.02], [0.0, 6.2],
  ], 20, [
    { count: 4, r0: 0.27, y0: 0.20, span: 0.17, root: 0.95, tip: 0.42, sweep: 0.38, th: 0.03 },
  ]);
  // ---- SENTINEL LR-1: big two-tone test round (matches the rail round)
  const sentinelGeo = buildAirframe([
    [0.17, 0.16], [0.31, 0.02], [0.42, 0.14], [0.42, 6.35],
    [0.405, 6.55], [0.405, 7.4], [0.345, 8.2], [0.24, 8.9], [0.125, 9.32], [0.05, 9.45], [0.0, 9.5],
  ], 22, [
    { count: 4, r0: 0.40, y0: 0.30, span: 0.55, root: 1.25, tip: 0.5, sweep: 0.55, th: 0.05 },
  ]);

  const rampartTex = airframeTextures({
    L: 5.2, base: '#d8d4c8', noseColor: '#22242a', noseLen: 0.85,
    rings: [0.55, 1.7, 2.9, 4.0, 4.35], stencil: 'RAMPART PX-4', tail: 'IV-DEF 04',
    stencilY: 3.0, finColor: '#7f848a',
  });
  // light sage-khaki body so HALBERD reads unmistakably different from RAMPART
  // (kept bright enough that panel/stencil detail survives the shadow side)
  const halberdTex = airframeTextures({
    L: 6.2, base: '#aaa78e', noseColor: '#22242a', noseLen: 1.05,
    rings: [0.75, 1.15, 2.4, 3.7, 4.45], stencil: 'HALBERD HA-9', tail: 'IV-DEF 09',
    stencilY: 3.4, finColor: '#75775f', stencilColor: 'rgba(52,54,44,0.92)',
    bands: [
      { y: 1.15, h: 0.14, color: 'rgba(30,32,36,0.85)' },
      { y: 4.28, h: 0.26, color: 'rgba(34,36,40,0.82)' },
      { y: 2.30, h: 0.07, color: 'rgba(30,32,36,0.7)' },
    ],
  });
  const sentinelTex = airframeTextures({
    L: 9.5, base: '#e3e0d5', noseColor: '#2f3338', noseLen: 1.3,
    rings: [1.3, 3.2, 5.0, 6.55, 7.4], stencil: 'SENTINEL LR-1 · T3', tail: 'IV-DEF 01',
    stencilY: 5.2, finColor: '#8a8f95',
    bands: [
      { y: 7.5, h: 0.45, color: 'rgba(179,64,46,0.92)' },
      { y: 2.5, h: 0.45, color: 'rgba(179,64,46,0.92)' },
      { y: 6.35, h: 0.2, color: 'rgba(40,42,46,0.6)' },
    ],
  });

  const VARIANTS = {
    patriot: { geo: rampartGeo, tex: rampartTex },
    thaad: { geo: halberdGeo, tex: halberdTex },
    sentinel: { geo: sentinelGeo, tex: sentinelTex },
  };
  /** fallback for unknown battery defs: nearest by interceptor length */
  function variantFor(battery, def) {
    if (VARIANTS[battery?.def?.id]) return VARIANTS[battery.def.id];
    const L = def?.length ?? 5;
    return L > 8 ? VARIANTS.sentinel : L > 5.6 ? VARIANTS.thaad : VARIANTS.patriot;
  }

  // slim directed-jet plume, unit radius/length along -Z (nozzle at z=0)
  const plumeGeo = (() => {
    const pts = [
      [0.16, 0.0], [0.46, -0.05], [0.62, -0.14], [0.66, -0.28],
      [0.54, -0.48], [0.34, -0.70], [0.15, -0.88], [0.0, -1.0],
    ].map(([r, y]) => new THREE.Vector2(r, y));
    const geo = new THREE.LatheGeometry(pts, 16);
    const pos = geo.attributes.position, uv = geo.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setY(i, pos.getY(i) + 1); // v=1 at nozzle
    geo.rotateX(Math.PI / 2); // -Y -> -Z (trails behind)
    return geo;
  })();

  const plumeTex = makePlumeTexture();
  const flareTex = makeFlareTexture();

  const baseBodyMat = new THREE.MeshStandardMaterial({
    map: rampartTex.map,
    emissiveMap: rampartTex.emis,
    color: 0xffffff,
    emissive: 0xffffff,
    emissiveIntensity: 0,
    roughness: 0.42,
    metalness: 0.3,
    envMapIntensity: 1.5, // diffuse IBL lift so shadow sides keep paint detail
  });
  const basePlumeMat = new THREE.MeshBasicMaterial({
    map: plumeTex,
    color: 0xffc27a,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  function buildMesh() {
    const group = new THREE.Group();
    const body = new THREE.Mesh(rampartGeo, baseBodyMat.clone());
    body.castShadow = false;
    group.add(body);
    const plume = new THREE.Mesh(plumeGeo, basePlumeMat.clone());
    plume.visible = false;
    plume.renderOrder = 15;
    group.add(plume);
    const flame = new THREE.Sprite(new THREE.SpriteMaterial({
      map: flareTex, color: 0xffc27a, transparent: true,
      blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.95,
      fog: false, // motor dot must punch through haze at km ranges
    }));
    flame.renderOrder = 16;
    group.add(flame);
    group.visible = false;
    scene.add(group);
    return { group, body, plume, flame };
  }

  const pool = new Pool(() => ({
    mesh: buildMesh(),
    id: '', battery: null, def: null, track: null, threat: null,
    pos: new THREE.Vector3(), vel: new THREE.Vector3(),
    age: 0, phase: 'boost', alive: false,
    trail: null, emitAcc: 0, minDist: 1e9, weaveSeed: 0,
    flickerSeed: 0, plumeLen: 6,
    lastPredict: new THREE.Vector3(), predictT: 0,
  }), 14);

  const _v = new THREE.Vector3();
  const _v2 = new THREE.Vector3();
  const _desired = new THREE.Vector3();
  const _look = new THREE.Vector3();
  const _emit = new THREE.Vector3();

  /** dress a pooled mesh as the launching battery's airframe (no allocation) */
  function fitMesh(m, it, battery, def) {
    const variant = variantFor(battery, def);
    m.body.geometry = variant.geo;
    const bm = m.body.material;
    bm.map = variant.tex.map;
    bm.emissiveMap = variant.tex.emis;
    bm.emissiveIntensity = 0;
    const R = def.girth, L = def.length;
    it.plumeLen = L * 1.05; // long directed jet (~1 body length behind the nozzle)
    m.plume.scale.set(R * 3.9, R * 3.9, it.plumeLen);
    m.plume.position.z = -L * 0.5 + 0.05;
    m.plume.material.color.setHex(def.flame);
    m.plume.visible = false;
    m.flame.position.z = -L * 0.52;
    m.flame.material.color.setHex(def.flame);
  }

  function resolveDetonation(it, dist) {
    const threat = it.threat;
    const def = it.def;
    const env = it.battery.def.envelope;
    const alt = it.pos.y;
    const range = Math.hypot(it.pos.x, it.pos.z);

    // fictional kill probability: envelope quality x geometry
    let envFactor = 1.0;
    let reason = null;
    if (alt < env.minAlt || alt > env.maxAlt || range > env.maxRange) {
      envFactor = 0.35;
      reason = 'OUTSIDE ENGAGEMENT ENVELOPE';
    } else if (alt < env.sweetLow || alt > env.sweetHigh) {
      envFactor = 0.72;
      reason = 'MARGINAL GEOMETRY';
    }
    _v.copy(threat.vel).normalize();
    _v2.copy(it.vel).normalize();
    const closing = _v.dot(_v2);
    const geomFactor = closing < -0.25 ? 1.0 : 0.8; // head-on best
    if (geomFactor < 1 && !reason) reason = 'CROSSING ENGAGEMENT';
    const proxFactor = clamp(1.15 - dist / (def.killRadius * 3.0), 0.5, 1);

    const pk = 0.94 * envFactor * geomFactor * proxFactor;
    const roll = ctx.rng.next();
    const hit = roll < pk;

    if (hit) {
      const point = it.pos.clone().lerp(threat.pos, 0.5);
      ctx.threats.destroy(threat, point);
      ctx.events.emit('intercept-success', {
        interceptor: it, threat, point,
        decoy: threat.isDecoy,
        dist: Math.round(dist), pk,
      });
    } else {
      ctx.effects.explosionAir(it.pos, 0.55);
      ctx.events.emit('intercept-miss', {
        interceptor: it, threat,
        reason: reason ?? 'PROXIMITY FUZE — DEBRIS MISSED',
        dist: Math.round(dist), pk,
      });
    }
    destroy(it, false);
  }

  function destroy(it, withFx = true) {
    if (!it.alive) return;
    it.alive = false;
    if (withFx) ctx.effects.explosionAir(it.pos, 0.4);
    it.mesh.group.visible = false;
    if (it.trail) { ctx.effects.releaseTrail(it.trail); it.trail = null; }
    const i = active.indexOf(it);
    if (i >= 0) active.splice(i, 1);
    pool.release(it);
  }

  const api = {
    active,
    launch(battery, track, muzzlePos, muzzleDir) {
      const it = pool.acquire();
      if (!it) return null;
      counter++;
      const def = battery.def.interceptor;
      it.id = 'IN-' + pad2(counter);
      it.battery = battery;
      it.def = def;
      it.track = track;
      it.threat = track.threat;
      it.pos.copy(muzzlePos);
      it.vel.copy(muzzleDir).multiplyScalar(32); // eject velocity
      it.age = 0;
      it.phase = 'boost';
      it.alive = true;
      it.minDist = 1e9;
      it.emitAcc = 0;
      it.weaveSeed = ctx.rng.next() * 10;
      it.flickerSeed = ctx.vrng.next() * 20; // visual-only motor flicker phase
      it.threat.engagedBy++;

      fitMesh(it.mesh, it, battery, def);
      it.mesh.group.visible = true;
      it.mesh.group.position.copy(it.pos);

      it.trail = ctx.effects.acquireTrail({
        color: battery.def.id === 'thaad' ? 0xeef2f8 : 0xf6f0e4,
        life: 9,
        opacity: 0.85,
        emissive: 0.14, // mostly sun/moon-lit smoke
      });
      // launch effects at the muzzle
      ctx.effects.launchBlast(muzzlePos, muzzleDir, battery.id === 'sentinel' ? 1.9 : battery.id === 'thaad' ? 1.25 : 1.0);
      active.push(it);
      return it;
    },
    clear() { for (const it of [...active]) destroy(it, false); },
    update(dt) {
      for (const it of [...active]) {
        it.age += dt;
        const def = it.def;
        const threat = it.threat;
        const targetAlive = threat && threat.alive;

        // ---- guidance target
        let desiredDir = null;
        if (targetAlive) {
          const sol = predictIntercept(
            it.pos, threat.pos, threat.vel,
            Math.max(def.avgSpeed, it.vel.length()), 90, threat.dragK
          );
          if (sol) {
            it.lastPredict.copy(sol.point);
            it.predictT = sol.t;
            _desired.subVectors(sol.point, it.pos).normalize();
            desiredDir = _desired;
          } else {
            _desired.subVectors(threat.pos, it.pos).normalize();
            desiredDir = _desired;
          }
        }

        const distToTarget = targetAlive ? it.pos.distanceTo(threat.pos) : 1e9;

        // ---- phases
        if (it.phase === 'boost') {
          const thrustDir = _v.copy(it.vel).normalize();
          it.vel.addScaledVector(thrustDir, def.accel * dt);
          // limited steering while boosting (pitch-over)
          if (desiredDir && it.age > 0.55) {
            steerVelocity(it.vel, desiredDir, def.turnRate * 0.55, dt);
          }
          it.vel.y -= GRAVITY * 0.4 * dt;
          if (it.age >= def.boostTime) {
            it.phase = 'guide';
            // motor burnout: small puff + brief flare
            ctx.effects.muzzlePuff(it.pos, 1.15);
            ctx.effects.flash(it.pos, 6, 0.16, 0xffdcae);
          }
        } else {
          // sustainer: hold speed, bleed a little in turns
          const speed = it.vel.length();
          if (speed < def.maxSpeed) {
            it.vel.multiplyScalar(1 + clamp((def.accel * 0.35 * dt) / speed, 0, 0.05));
          }
          it.vel.y -= GRAVITY * 0.25 * dt;
          if (desiredDir) {
            // terminal window scales with closing speed so fast intercepts get
            // enough clean-steering time (~0.9 s) to null the miss distance
            const closingSpeed = it.vel.length() + (targetAlive ? threat.vel.length() : 0);
            const terminal = distToTarget < Math.max(700, closingSpeed * 0.9);
            it.phase = terminal ? 'terminal' : 'guide';
            let rate = def.turnRate * (terminal ? 1.9 : 1.0);
            // visible mid-course corrections, faded out well before terminal
            if (!terminal) {
              const weaveK = clamp((distToTarget - 1200) / 2600, 0, 1);
              const w = Math.sin(it.age * 1.7 + it.weaveSeed) * 0.06 * weaveK;
              _desired.applyAxisAngle(_v.set(0, 1, 0), w * 0.5);
            }
            steerVelocity(it.vel, _desired, rate, dt);
          }
        }
        const speed = it.vel.length();
        if (speed > def.maxSpeed) it.vel.multiplyScalar(def.maxSpeed / speed);

        it.pos.addScaledVector(it.vel, dt);
        it.mesh.group.position.copy(it.pos);
        _look.copy(it.pos).add(it.vel);
        it.mesh.group.lookAt(_look);

        // ---- visuals: motor plume, nozzle glow, flare, trail
        const boosting = it.phase === 'boost';
        const flick = 0.84 + 0.16 * Math.sin(it.age * 41 + it.flickerSeed) * Math.sin(it.age * 13.7 + it.flickerSeed * 2.3);
        const bm = it.mesh.body.material;
        // terminal divert-thruster pulses: brief deterministic bursts
        const acm = it.phase === 'terminal' && Math.sin(it.age * 31 + it.flickerSeed * 3.1) > 0.55;
        if (boosting) {
          bm.emissiveIntensity = 2.6 * (0.8 + 0.3 * flick);
          it.mesh.plume.visible = true;
          it.mesh.plume.material.opacity = 0.52 + 0.26 * flick;
          const lj = it.plumeLen * (0.86 + 0.2 * flick);
          it.mesh.plume.scale.z = lj;
        } else {
          bm.emissiveIntensity = acm ? 2.0 : 0.5;
          it.mesh.plume.visible = false;
        }
        const dCam = it.pos.distanceTo(ctx.camera.position);
        const distK = clamp(0.7 + dCam * 0.004, 0.8, 8);
        // flare sprite exists mostly for km-range readability: fade it up close
        // so the plume geometry (mach diamonds, fins) carries the flyby look
        const nearK = clamp(dCam / (boosting ? 130 : 420), boosting ? 0.16 : 0.26, 1);
        it.mesh.flame.material.opacity = (boosting ? 0.95 * flick : acm ? 0.8 : 0.42) * nearK;
        it.mesh.flame.scale.setScalar(
          (boosting ? (2.3 + it.def.girth * 5.5) * (0.88 + 0.2 * flick) : acm ? 2.6 : 1.7) * distK
        );
        it.emitAcc += dt;
        if (it.emitAcc > 0.03 && it.trail) {
          it.emitAcc = 0;
          const airK = clamp(it.pos.y / 6500, 0, 1);
          // widthRamp: grow in over the first half second so the young ribbon
          // doesn't render as a hard-edged rectangle at the pad
          const widthRamp = clamp(it.age * 2.2, 0.15, 1);
          const w = def.trailWidth * (boosting ? 2.8 : 1.35) * (0.6 + airK * 1.1) * widthRamp;
          // emit at the nozzle, not the body center
          _emit.copy(it.vel).normalize().multiplyScalar(-def.length * 0.45).add(it.pos);
          it.trail.emit(_emit, w, boosting ? 1.0 : 0.5 + airK * 0.3);
        }

        // ---- endgame
        if (targetAlive) {
          if (distToTarget < def.killRadius) {
            resolveDetonation(it, distToTarget);
            continue;
          }
          // analytic proximity fuze: at ~2.5 km/s closing speed a fixed-step
          // sample can jump 80 m past the target, so predict the closest
          // approach over the next step from relative state and detonate there.
          if (distToTarget < 500) {
            _v.subVectors(threat.pos, it.pos); // r
            const rvx = threat.vel.x - it.vel.x, rvy = threat.vel.y - it.vel.y, rvz = threat.vel.z - it.vel.z;
            const vv = rvx * rvx + rvy * rvy + rvz * rvz;
            const rv = _v.x * rvx + _v.y * rvy + _v.z * rvz;
            const tca = vv > 1e-6 ? -rv / vv : -1;
            if (tca > 0 && tca <= dt * 1.5) {
              const dca2 = _v.lengthSq() - (rv * rv) / vv;
              const dca = Math.sqrt(Math.max(dca2, 0));
              if (dca < def.killRadius * 2.2) {
                // move to the fuzing point so the burst renders where it happens
                it.pos.addScaledVector(it.vel, tca);
                it.mesh.group.position.copy(it.pos);
                resolveDetonation(it, dca);
                continue;
              }
            }
          }
          if (distToTarget < it.minDist) {
            it.minDist = distToTarget;
          } else if (it.minDist < 260 && distToTarget > it.minDist + 14) {
            // passed closest approach — proximity detonation attempt
            if (it.minDist < def.killRadius * 2.2) {
              resolveDetonation(it, it.minDist);
            } else {
              ctx.effects.explosionAir(it.pos, 0.5);
              ctx.events.emit('intercept-miss', {
                interceptor: it, threat,
                reason: 'CLOSEST APPROACH ' + Math.round(it.minDist) + ' m — NO FUZE',
              });
              destroy(it, false);
            }
            continue;
          }
        } else if (it.age > 1.2) {
          // target already gone: safe self-destruct
          ctx.effects.explosionAir(it.pos, 0.45);
          ctx.events.emit('interceptor-expended', { interceptor: it });
          destroy(it, false);
          continue;
        }
        if (it.age > 80 || it.pos.y < -5) {
          ctx.events.emit('intercept-miss', { interceptor: it, threat, reason: 'INTERCEPTOR EXPENDED' });
          destroy(it);
        }
      }
    },
  };
  return api;
}
