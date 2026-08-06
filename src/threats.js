// threats.js — pooled ballistic threats + scenario spawner. Arcs, speeds and
// behaviors are fictional and tuned for readable, cinematic gameplay.
// Visuals: lathe-profile reentry vehicles with procedural ablative-canvas
// textures, emissive reentry heating, additive bow-shock sheath, tumbling
// bright-metal decoys. All meshes pooled; geometry/textures built at boot.
import * as THREE from 'three';
import { Pool, Rand, TAU, clamp, pad2 } from './util.js';
import { GRAVITY, ballisticVelocityFor } from './physics.js';
import { terrainHeight } from './base.js';

const BASE_DAMAGE_RADIUS = 170;

export const SCENARIOS = {
  single: {
    id: 'single',
    name: 'SINGLE TRACK',
    desc: 'One high-visibility ballistic target.',
    build(rng) {
      return [{ delay: 2.5, T: rng.range(52, 62), decoy: false }];
    },
  },
  saturation: {
    id: 'saturation',
    name: 'SATURATION',
    desc: '3–5 targets on separate arcs.',
    build(rng) {
      const n = rng.int(3, 5);
      const list = [];
      let t = 2;
      for (let i = 0; i < n; i++) {
        list.push({ delay: t, T: rng.range(50, 72), decoy: false });
        t += rng.range(4, 9);
      }
      return list;
    },
  },
  nightraid: {
    id: 'nightraid',
    name: 'NIGHT RAID',
    desc: 'Multiple targets with decoys, at night.',
    forceTime: 'night',
    build(rng) {
      const warheads = 3;
      const decoys = rng.int(2, 3);
      const list = [];
      let t = 2.5;
      const kinds = [];
      for (let i = 0; i < warheads; i++) kinds.push(false);
      for (let i = 0; i < decoys; i++) kinds.push(true);
      // deterministic shuffle
      for (let i = kinds.length - 1; i > 0; i--) {
        const j = Math.floor(rng.next() * (i + 1));
        [kinds[i], kinds[j]] = [kinds[j], kinds[i]];
      }
      for (const decoy of kinds) {
        list.push({ delay: t, T: rng.range(48, 66), decoy });
        t += rng.range(3.5, 7.5);
      }
      return list;
    },
  },
};

export function createThreats(ctx) {
  const { scene } = ctx;
  const active = [];
  let queue = [];
  let elapsed = 0;
  let spawnCounter = 0;
  let running = false;

  // ============================================================ local canvas
  // (build-time only; seeded so pool construction is deterministic)
  const vr = new Rand(0xc41e77);
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

  /** RV body albedo + aligned emissive (canvas top = nose). */
  function makeRVTextures() {
    const W = 256, H = 512;
    // shared ablation streak layout so albedo scarring and emissive hot lines match
    const streaks = [];
    for (let i = 0; i < 30; i++) {
      streaks.push({
        x: vr.next() * W,
        y0: vr.range(4, 90),
        len: vr.range(70, 330),
        w: vr.range(1.1, 3.2),
        a: vr.range(0.14, 0.42),
      });
    }
    // ---------------- albedo
    const [c, g] = cv(W, H);
    g.fillStyle = '#585149';
    g.fillRect(0, 0, W, H);
    // filament-wound carbon: two crossing diagonal band passes
    for (const [ang, alpha] of [[-0.42, 0.09], [0.42, 0.06]]) {
      g.save();
      g.translate(W / 2, H / 2);
      g.rotate(ang);
      for (let i = -40; i < 40; i++) {
        g.fillStyle = i % 2 ? `rgba(255,255,255,${alpha})` : `rgba(0,0,0,${alpha * 1.5})`;
        g.fillRect(-400, i * 9, 800, 4.5);
      }
      g.restore();
    }
    // grain noise
    {
      const img = g.getImageData(0, 0, W, H);
      const d = img.data;
      for (let i = 0; i < d.length; i += 4) {
        const n = (vr.next() - 0.5) * 22;
        d[i] += n; d[i + 1] += n; d[i + 2] += n * 0.9;
      }
      g.putImageData(img, 0, 0);
    }
    // ablation streaks flowing aft (down canvas) from the nose
    for (const s of streaks) {
      const a = Math.min(s.a * 2.0, 0.8);
      const grad = g.createLinearGradient(0, s.y0, 0, s.y0 + s.len);
      grad.addColorStop(0, `rgba(198,182,156,${a})`);
      grad.addColorStop(0.5, `rgba(150,136,114,${a * 0.6})`);
      grad.addColorStop(1, 'rgba(110,100,86,0)');
      g.fillStyle = grad;
      g.fillRect(s.x - s.w / 2, s.y0, s.w, s.len);
      // occasional wider pale wash beside a streak
      if (vr.next() < 0.3) {
        g.fillStyle = `rgba(166,152,128,${a * 0.3})`;
        g.fillRect(s.x - s.w * 2.2, s.y0 + 14, s.w * 4.4, s.len * 0.5);
      }
    }
    // ring frames (geometric y in comments; canvasY = (1 - y/L) * H, L = 5.02)
    for (const [cy, strong] of [[104, 0.5], [258, 0.7], [416, 0.85]]) {
      g.fillStyle = `rgba(14,13,12,${strong})`;
      g.fillRect(0, cy, W, 2.2);
      g.fillStyle = 'rgba(190,180,164,0.16)';
      g.fillRect(0, cy + 2.2, W, 1.2);
      for (let x = 6; x < W; x += 16) {
        g.fillStyle = 'rgba(12,11,10,0.6)';
        g.beginPath(); g.arc(x, cy + 7, 1.3, 0, 7); g.fill();
      }
    }
    // charred nose cap: heavy scorch top 90px + faint iridescent anneal arcs
    {
      const grad = g.createLinearGradient(0, 0, 0, 120);
      grad.addColorStop(0, 'rgba(12,10,9,0.94)');
      grad.addColorStop(0.55, 'rgba(20,17,15,0.6)');
      grad.addColorStop(1, 'rgba(26,22,19,0)');
      g.fillStyle = grad;
      g.fillRect(0, 0, W, 120);
      for (const [cy, col] of [[66, 'rgba(96,116,168,0.14)'], [78, 'rgba(150,104,66,0.15)'], [90, 'rgba(120,88,120,0.10)']]) {
        g.fillStyle = col;
        g.fillRect(0, cy, W, 5);
      }
    }
    // skirt band: thermal-paint ring, yellow index line, stencil ticks + text
    {
      g.fillStyle = 'rgba(66,60,52,0.55)';
      g.fillRect(0, 428, W, 44);
      g.fillStyle = 'rgba(196,164,44,0.6)';
      g.fillRect(0, 442, W, 3);
      for (let x = 8; x < W; x += 32) {
        g.fillStyle = 'rgba(196,164,44,0.5)';
        g.fillRect(x, 447, 2.4, 9);
      }
      g.fillStyle = 'rgba(214,206,192,0.6)';
      g.font = 'bold 11px monospace';
      g.textAlign = 'left';
      g.fillText('SR-9 · 04', 12, 466);
      g.fillText('LOT 7', 148, 466);
      // worn chips
      for (let i = 0; i < 60; i++) {
        g.fillStyle = 'rgba(28,25,22,0.4)';
        g.fillRect(vr.next() * W, 428 + vr.next() * 44, vr.range(1, 4), vr.range(1, 2));
      }
    }
    // base heat-shield rows: near-black + bolt ring
    {
      g.fillStyle = 'rgba(16,14,13,0.92)';
      g.fillRect(0, 478, W, 34);
      for (let x = 10; x < W; x += 20) {
        g.fillStyle = 'rgba(90,84,76,0.5)';
        g.beginPath(); g.arc(x, 490, 1.6, 0, 7); g.fill();
      }
    }
    // ---------------- emissive (aligned layout, colors baked)
    const [ec, eg] = cv(W, H);
    eg.fillStyle = '#000000';
    eg.fillRect(0, 0, W, H);
    // white-hot tip fading down the forward cone
    {
      const grad = eg.createLinearGradient(0, 0, 0, 240);
      grad.addColorStop(0, 'rgba(255,250,240,1)');
      grad.addColorStop(0.10, 'rgba(255,214,150,0.92)');
      grad.addColorStop(0.32, 'rgba(255,140,60,0.5)');
      grad.addColorStop(0.62, 'rgba(255,96,32,0.2)');
      grad.addColorStop(1, 'rgba(255,80,24,0)');
      eg.fillStyle = grad;
      eg.fillRect(0, 0, W, 240);
    }
    // hot lines along the ablation streaks
    eg.globalCompositeOperation = 'lighter';
    for (const s of streaks) {
      const grad = eg.createLinearGradient(0, s.y0, 0, s.y0 + s.len * 0.8);
      grad.addColorStop(0, `rgba(255,170,90,${s.a * 0.9})`);
      grad.addColorStop(1, 'rgba(255,110,40,0)');
      eg.fillStyle = grad;
      eg.fillRect(s.x - s.w * 0.45, s.y0, s.w * 0.9, s.len * 0.8);
    }
    // skirt leading-edge compression glow + dull base recirculation
    eg.fillStyle = 'rgba(255,130,50,0.28)';
    eg.fillRect(0, 416, W, 7);
    eg.fillStyle = 'rgba(255,70,26,0.20)';
    eg.fillRect(0, 480, W, 32);
    // faint full-body soak so the emissive floor reads at night (hot airframe)
    eg.fillStyle = 'rgba(255,120,60,0.05)';
    eg.fillRect(0, 0, W, H);
    eg.globalCompositeOperation = 'source-over';
    return { map: toTex(c), emis: toTex(ec, { srgb: false }) };
  }

  /** decoy: bright bare-metal balloon-replica (cheap, glinty, distinct). */
  function makeDecoyTextures() {
    const W = 256, H = 256;
    const [c, g] = cv(W, H);
    g.fillStyle = '#b6bac0';
    g.fillRect(0, 0, W, H);
    // axial brushing
    for (let i = 0; i < 340; i++) {
      const x = vr.next() * W;
      g.strokeStyle = vr.next() < 0.5
        ? `rgba(230,236,242,${vr.range(0.05, 0.2)})`
        : `rgba(96,102,110,${vr.range(0.04, 0.16)})`;
      g.lineWidth = vr.range(0.6, 1.8);
      g.beginPath();
      g.moveTo(x, vr.next() * 60);
      g.lineTo(x + vr.range(-3, 3), H);
      g.stroke();
    }
    // gore seams (inflatable-replica look): vertical foil joints
    for (let x = 0; x < W; x += 32) {
      g.fillStyle = 'rgba(70,74,80,0.55)';
      g.fillRect(x, 0, 1.6, H);
      g.fillStyle = 'rgba(240,244,248,0.35)';
      g.fillRect(x + 1.6, 0, 1, H);
    }
    // two ring frames + scuffs
    for (const cy of [70, 176]) {
      g.fillStyle = 'rgba(52,56,62,0.7)';
      g.fillRect(0, cy, W, 2);
    }
    for (let i = 0; i < 70; i++) {
      g.fillStyle = `rgba(58,62,66,${vr.range(0.08, 0.3)})`;
      g.fillRect(vr.next() * W, vr.next() * H, vr.range(2, 8), vr.range(1, 2.4));
    }
    const [ec, eg] = cv(W, H);
    eg.fillStyle = '#000';
    eg.fillRect(0, 0, W, H);
    const grad = eg.createLinearGradient(0, 0, 0, 110);
    grad.addColorStop(0, 'rgba(255,214,150,0.85)');
    grad.addColorStop(1, 'rgba(255,120,50,0)');
    eg.fillStyle = grad;
    eg.fillRect(0, 0, W, 110);
    // dim warm body soak: keeps the tumbling foil readable on night raids
    // (kept subtle so gore seams/brushing still shade across the tumble)
    eg.fillStyle = 'rgba(255,170,110,0.08)';
    eg.fillRect(0, 0, W, H);
    // carve seams/frames out of the soak so the self-lit foil stays structured
    // at night instead of reading as a featureless glow-stick
    eg.globalCompositeOperation = 'destination-out';
    for (let x = 0; x < W; x += 32) {
      eg.fillStyle = 'rgba(0,0,0,0.85)';
      eg.fillRect(x, 0, 2.6, H);
    }
    for (const cy of [70, 176]) {
      eg.fillStyle = 'rgba(0,0,0,0.8)';
      eg.fillRect(0, cy, W, 3);
    }
    eg.globalCompositeOperation = 'source-over';
    return { map: toTex(c), emis: toTex(ec, { srgb: false }) };
  }

  /** bow-shock sheath gradient: v=1 (canvas top) is the apex. */
  function makeShockTexture() {
    const [c, g] = cv(64, 256);
    g.clearRect(0, 0, 64, 256);
    const grad = g.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0.0, 'rgba(255,255,255,0.95)');
    grad.addColorStop(0.10, 'rgba(255,226,178,0.62)');
    grad.addColorStop(0.34, 'rgba(255,166,96,0.30)');
    grad.addColorStop(0.72, 'rgba(255,120,60,0.10)');
    grad.addColorStop(1.0, 'rgba(255,100,50,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 256);
    // faint turbulence banding
    for (let i = 0; i < 26; i++) {
      const y = vr.next() * 200 + 20;
      g.fillStyle = `rgba(255,200,140,${vr.range(0.03, 0.1)})`;
      g.fillRect(0, y, 64, vr.range(1, 4));
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.ClampToEdgeWrapping;
    return t;
  }

  /** soft dark speck: normal-blended distant-object dot (reads on bright sky
   *  where additive glow cannot darken anything). */
  function makeDotTexture() {
    const [c, g] = cv(64, 64);
    const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(26,22,19,1)');
    grad.addColorStop(0.35, 'rgba(30,26,22,0.85)');
    grad.addColorStop(0.7, 'rgba(36,32,28,0.30)');
    grad.addColorStop(1, 'rgba(40,36,32,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  }

  /** round distance flare (no cross arms — reads clean at close range too). */
  function makeFlareTexture() {
    const [c, g] = cv(128, 128);
    let grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.16, 'rgba(255,242,214,0.9)');
    grad.addColorStop(0.38, 'rgba(255,196,130,0.30)');
    grad.addColorStop(0.7, 'rgba(255,160,90,0.10)');
    grad.addColorStop(1, 'rgba(255,150,80,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 128);
    // slight horizontal smear for an optical feel
    g.globalCompositeOperation = 'lighter';
    grad = g.createLinearGradient(0, 64, 128, 64);
    grad.addColorStop(0, 'rgba(255,220,170,0)');
    grad.addColorStop(0.5, 'rgba(255,236,200,0.35)');
    grad.addColorStop(1, 'rgba(255,220,170,0)');
    g.fillStyle = grad;
    g.fillRect(0, 58, 128, 12);
    return new THREE.CanvasTexture(c);
  }

  const rvTex = makeRVTextures();
  const decoyTex = makeDecoyTextures();
  const shockTex = makeShockTexture();
  const flareTex = makeFlareTexture();
  const dotTex = makeDotTexture();

  // ============================================================ geometry
  /** lathe with y-proportional V (texture bands line up with geometric length) */
  function lathe(profile, seg, { center = true, vStart = 0 } = {}) {
    const pts = profile.map(([r, y]) => new THREE.Vector2(r, y));
    const geo = new THREE.LatheGeometry(pts, seg);
    let yMin = Infinity, yMax = -Infinity;
    for (const [, y] of profile) { yMin = Math.min(yMin, y); yMax = Math.max(yMax, y); }
    const pos = geo.attributes.position, uv = geo.attributes.uv;
    for (let i = 0; i < uv.count; i++) {
      const v = (pos.getY(i) - yMin) / (yMax - yMin);
      uv.setY(i, vStart + v * (1 - vStart));
    }
    if (center) geo.translate(0, -(yMin + yMax) / 2, 0);
    geo.rotateX(Math.PI / 2); // +Y -> +Z, nose forward along velocity
    return geo;
  }

  // sphere-blunted cone with flared stabilization skirt + recessed base (L=5.02)
  const rvGeo = lathe([
    [0.30, 0.16], [0.72, 0.16], [0.79, 0.02], [0.80, 0.30],
    [0.64, 0.95], [0.575, 1.5], [0.46, 2.4], [0.335, 3.3],
    [0.21, 4.2], [0.115, 4.72], [0.052, 4.94], [0.0, 5.02],
  ], 26);

  // slim biconic decoy replica (L=3.3)
  const decoyGeo = lathe([
    [0.16, 0.08], [0.34, 0.02], [0.34, 1.1], [0.27, 1.9],
    [0.165, 2.7], [0.07, 3.15], [0.0, 3.3],
  ], 20);

  // bow-shock sheath: apex ahead of the nose flaring back over the body.
  // built in body-centered coords (nose at +2.51 for the RV)
  const shockGeo = lathe([
    [0.03, 3.35], [0.42, 2.85], [0.78, 2.1], [1.02, 1.0], [1.18, -0.4], [1.30, -1.9],
  ], 22, { center: false });

  // ============================================================ materials
  const baseBodyMat = new THREE.MeshStandardMaterial({
    map: rvTex.map,
    emissiveMap: rvTex.emis,
    color: 0xffffff,
    emissive: 0xffffff,
    emissiveIntensity: 0,
    roughness: 0.45,
    metalness: 0.3, // composite: keep diffuse IBL so the shadow side isn't black
    envMapIntensity: 1.8,
  });
  const baseShockMat = new THREE.MeshBasicMaterial({
    map: shockTex,
    color: 0xffb26a,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  const pool = new Pool(() => {
    const group = new THREE.Group();
    const spin = new THREE.Group();
    const body = new THREE.Mesh(rvGeo, baseBodyMat.clone());
    body.castShadow = false;
    spin.add(body);
    group.add(spin);
    const shock = new THREE.Mesh(shockGeo, baseShockMat.clone());
    shock.visible = false;
    shock.renderOrder = 15;
    group.add(shock);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: flareTex, color: 0xffc080, transparent: true, opacity: 0.9,
      blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
    }));
    glow.renderOrder = 16;
    group.add(glow);
    // dark distant-object speck (behind the glow): daytime km-range read
    const dot = new THREE.Sprite(new THREE.SpriteMaterial({
      map: dotTex, color: 0xffffff, transparent: true, opacity: 0,
      depthWrite: false, fog: false,
    }));
    dot.renderOrder = 14;
    group.add(dot);
    group.visible = false;
    scene.add(group);
    return {
      group, spin, body, shock, glow, dot,
      id: '', pos: new THREE.Vector3(), vel: new THREE.Vector3(),
      alive: false, isDecoy: false, dragK: 0, weave: 0, weavePhase: 0,
      trail: null, glowTrail: null, emitAcc: 0, age: 0, engagedBy: 0,
      plasmaTrail: null, plasmaAcc: 0, flickerPhase: 0,
      rollRate: 0, tumX: 0, tumY: 0,
    };
  }, 10);

  const _v = new THREE.Vector3();
  const _look = new THREE.Vector3();
  const _pv = new THREE.Vector3();

  function spawnThreat(spec, rng) {
    const t = pool.acquire();
    if (!t) return null;
    spawnCounter++;
    t.id = 'T-' + pad2(spawnCounter);
    t.isDecoy = spec.decoy;
    t.alive = true;
    t.age = 0;
    t.engagedBy = 0;
    t.emitAcc = 0;

    const az = rng.next() * TAU;
    const range = rng.range(5200, 7600);
    const alt = rng.range(5200, 6800);
    const impactR = rng.range(15, spec.decoy ? 600 : 130);
    const impactA = rng.next() * TAU;
    const start = new THREE.Vector3(Math.sin(az) * range, alt, Math.cos(az) * range);
    const impact = new THREE.Vector3(Math.sin(impactA) * impactR, 0, Math.cos(impactA) * impactR);
    t.pos.copy(start);
    ballisticVelocityFor(start, impact, spec.T, t.vel);
    t.dragK = spec.decoy ? 0.00030 : 0.00006;
    t.weave = !spec.decoy && rng.next() < 0.45 ? rng.range(8, 18) : 0;
    t.weavePhase = rng.next() * TAU;

    // ---- visual state (vrng only: never perturbs gameplay determinism)
    const kind = spec.decoy ? decoyTex : rvTex;
    t.body.geometry = spec.decoy ? decoyGeo : rvGeo;
    const bm = t.body.material;
    bm.map = kind.map;
    bm.emissiveMap = kind.emis;
    bm.roughness = spec.decoy ? 0.3 : 0.45;
    bm.metalness = spec.decoy ? 0.85 : 0.3;
    bm.envMapIntensity = spec.decoy ? 2.0 : 1.8;
    bm.emissiveIntensity = 0.35;
    t.spin.rotation.set(0, 0, 0);
    if (spec.decoy) {
      t.rollRate = 0;
      t.tumX = ctx.vrng.range(1.6, 3.2) * ctx.vrng.sign();
      t.tumY = ctx.vrng.range(0.8, 2.0) * ctx.vrng.sign();
    } else {
      t.rollRate = ctx.vrng.range(0.5, 1.3) * ctx.vrng.sign(); // slow ballistic roll
      t.tumX = 0; t.tumY = 0;
    }
    const shockScale = spec.decoy ? 0.55 : 1;
    t.shock.scale.set(shockScale, shockScale, shockScale);
    t.shock.visible = false;
    t.glow.material.color.setHex(spec.decoy ? 0xd8e4f2 : 0xffc890);
    t.glow.material.opacity = 0.85;
    t.dot.material.opacity = 0;

    t.group.visible = true;
    t.group.position.copy(t.pos);

    t.trail = ctx.effects.acquireTrail({
      color: spec.decoy ? 0xb9bec6 : 0xcec5b6, // dusty gray: silhouettes on bright sky
      life: 11,
      opacity: spec.decoy ? 0.42 : 0.7,
      emissive: 0.45, // reentry-heated: partially self-lit at night
    });
    // short additive plasma sheath hugging the body; intensity follows reentry
    // heat. Kept short/incandescent — the long gray smoke column carries range.
    t.plasmaTrail = ctx.effects.acquireTrail({
      color: spec.decoy ? 0xffd9a0 : 0xffcf92,
      life: 0.7,
      opacity: spec.decoy ? 0.45 : 0.85,
      emissive: 1.0,
    });
    t.plasmaAcc = 0;
    t.flickerPhase = ctx.vrng.next() * TAU;
    active.push(t);
    ctx.events.emit('threat-spawned', { threat: t });
    return t;
  }

  function removeThreat(t) {
    t.alive = false;
    t.group.visible = false;
    if (t.trail) { ctx.effects.releaseTrail(t.trail); t.trail = null; }
    if (t.plasmaTrail) { ctx.effects.releaseTrail(t.plasmaTrail); t.plasmaTrail = null; }
    const i = active.indexOf(t);
    if (i >= 0) active.splice(i, 1);
    pool.release(t);
  }

  const api = {
    active,
    get running() { return running; },
    get pendingCount() { return queue.length; },
    get allSpawned() { return queue.length === 0; },
    startScenario(name, rng) {
      api.clear();
      const scen = SCENARIOS[name];
      if (!scen) return false;
      queue = scen.build(rng).map((s) => ({ ...s }));
      elapsed = 0;
      spawnCounter = 0;
      running = true;
      api._rng = rng;
      return true;
    },
    stop() { running = false; queue = []; },
    clear() {
      for (const t of [...active]) removeThreat(t);
      queue = [];
      running = false;
    },
    /** interceptors call this on a successful kill */
    destroy(t, point) {
      if (!t.alive) return;
      ctx.effects.explosionAir(point ?? t.pos, t.isDecoy ? 0.7 : 1.25);
      ctx.events.emit('threat-destroyed', { threat: t, point: point ?? t.pos.clone() });
      removeThreat(t);
    },
    update(dt) {
      if (running) {
        elapsed += dt;
        while (queue.length && queue[0].delay <= elapsed) {
          const spec = queue.shift();
          spawnThreat(spec, api._rng);
        }
      }
      for (const t of [...active]) {
        t.age += dt;
        // gravity + drag
        t.vel.y -= GRAVITY * dt;
        const sp = t.vel.length();
        const drag = t.dragK * sp * sp * dt;
        if (sp > 1) t.vel.multiplyScalar(Math.max(0, 1 - drag / sp));
        // gentle terminal weave for some warheads (visual maneuvering)
        if (t.weave > 0 && t.pos.y < 2400 && t.pos.y > 300) {
          _v.set(-t.vel.z, 0, t.vel.x).normalize();
          t.vel.addScaledVector(_v, Math.sin(t.age * 1.9 + t.weavePhase) * t.weave * dt);
        }
        t.pos.addScaledVector(t.vel, dt);
        t.group.position.copy(t.pos);
        _look.copy(t.pos).add(t.vel);
        t.group.lookAt(_look);

        // visual-only attitude: warheads roll slowly, decoys tumble end-over-end
        if (t.isDecoy) {
          t.spin.rotation.x += t.tumX * dt;
          t.spin.rotation.y += t.tumY * dt;
        } else {
          t.spin.rotation.z += t.rollRate * dt;
        }

        // reentry heating glow: stronger when fast & low, with subtle plasma flicker
        const heat = clamp((sp - 220) / 600, 0, 1) * clamp(1.5 - t.pos.y / 5200, 0.2, 1);
        const flick = 0.9 + 0.1 * Math.sin(t.age * 27 + t.flickerPhase) * Math.sin(t.age * 9.3 + t.flickerPhase * 1.7);
        t.body.material.emissiveIntensity = Math.max(heat * 3.6, t.isDecoy ? 0.7 : 0.18) * (0.75 + 0.35 * flick);

        // bow-shock sheath fades in with heat (hidden cold: saves a draw call)
        const shockOn = heat > 0.05;
        t.shock.visible = shockOn;
        if (shockOn) {
          t.shock.material.opacity = clamp(heat * 0.95, 0, 0.9) * (0.82 + 0.18 * flick);
          const ss = (t.isDecoy ? 0.55 : 1) * (0.96 + 0.05 * Math.sin(t.age * 23 + t.flickerPhase));
          t.shock.scale.set(ss, ss, t.isDecoy ? 0.55 : 1);
        }

        // distance flare: fades out under ~30 m (the body carries the look
        // there) and grows into a bright km-range dot. Partly heat-independent
        // so slow low targets still read from the base.
        const dCam = t.pos.distanceTo(ctx.camera.position);
        const nearK = clamp((dCam - 24) / 90, 0.05, 1);
        const gs = clamp(2.6 + dCam * 0.018, 2.6, 130) * (t.isDecoy ? 0.6 : 1) * (0.75 + heat * 0.35);
        t.glow.scale.set(gs, gs, 1);
        t.glow.material.opacity = clamp(0.6 + heat * 0.4, 0, 1) * (t.isDecoy ? 0.85 : 1) * nearK * (0.86 + 0.14 * flick);
        // dark speck: the "distant object" pixel a zoom lens would show — the
        // only cue that survives a bright daytime sky (additive can't darken)
        const ds = clamp(dCam * 0.013, 0, 42) * (t.isDecoy ? 0.7 : 1);
        t.dot.scale.set(ds, ds, 1);
        t.dot.material.opacity = clamp((dCam - 380) / 700, 0, 0.8);

        // trail emission (air-density based width/fade)
        t.emitAcc += dt;
        if (t.emitAcc > 0.035 && t.trail) {
          t.emitAcc = 0;
          const airK = clamp(t.pos.y / 6500, 0, 1); // thin air => wide persistent trail
          t.trail.emit(t.pos, (t.isDecoy ? 3.2 : 5.6) * (0.5 + airK * 1.2), 0.5 + airK * 0.6);
        }
        // plasma sheath: short bright ribbon just behind the body, grows with
        // heat. Width is stylized (wider than the body) so the sheath still
        // reads as a burning streak from typical viewing ranges of 0.5-2 km.
        t.plasmaAcc += dt;
        if (t.plasmaAcc > 0.024 && t.plasmaTrail) {
          t.plasmaAcc = 0;
          if (heat > 0.04) {
            _pv.copy(t.vel).normalize().multiplyScalar(t.isDecoy ? -1.9 : -2.7).add(t.pos);
            t.plasmaTrail.emit(
              _pv,
              (t.isDecoy ? 1.3 : 2.4) * (0.45 + heat * 1.3),
              clamp(0.3 + heat * 0.95, 0, 1) * (0.9 + 0.1 * flick)
            );
          }
        }

        // ground impact
        const gh = Math.max(0, terrainHeight(t.pos.x, t.pos.z));
        if (t.pos.y <= gh + 2) {
          const onBase = Math.hypot(t.pos.x, t.pos.z) < BASE_DAMAGE_RADIUS;
          if (t.isDecoy) {
            ctx.effects.explosionGround(t.pos, 0.5);
          } else {
            ctx.effects.explosionGround(t.pos, onBase ? 1.6 : 1.15);
          }
          ctx.events.emit('threat-impact', { threat: t, onBase, point: t.pos.clone() });
          removeThreat(t);
        }
      }
    },
  };
  return api;
}
