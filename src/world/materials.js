import * as THREE from 'three';
import { rand, randRange, randInt } from '../core/rand.js';

/**
 * Material library + procedural canvas textures (decals, signs, smoke).
 * Registers all geometry buckets on the shared Buckets instance.
 */

function canvasTex(w, h, draw, { srgb = true, wrap = THREE.ClampToEdgeWrapping } = {}) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  draw(ctx, w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = wrap;
  t.anisotropy = 4;
  return t;
}

/** Soft radial dot — dust motes + AO blobs. */
function makeSoftCircle() {
  return canvasTex(128, 128, (ctx, w, h) => {
    const g = ctx.createRadialGradient(w / 2, h / 2, 2, w / 2, h / 2, w / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.55, 'rgba(255,255,255,0.42)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  });
}

/** Irregular dark blob with fuzzy edge — oil stains, grounding AO. */
function makeBlob() {
  return canvasTex(256, 256, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    const cx = w / 2, cy = h / 2;
    for (let i = 0; i < 46; i++) {
      const a = rand() * Math.PI * 2;
      const r = Math.pow(rand(), 1.6) * w * 0.30;
      const rad = w * (0.06 + rand() * 0.16);
      const g = ctx.createRadialGradient(cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.8, 1,
        cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.8, rad);
      const al = 0.10 + rand() * 0.13;
      g.addColorStop(0, `rgba(8,7,6,${al})`);
      g.addColorStop(1, 'rgba(8,7,6,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }
    const g2 = ctx.createRadialGradient(cx, cy, 2, cx, cy, w * 0.22);
    g2.addColorStop(0, 'rgba(6,5,5,0.55)');
    g2.addColorStop(1, 'rgba(6,5,5,0)');
    ctx.fillStyle = g2;
    ctx.fillRect(0, 0, w, h);
  });
}

/** Radial scorch splash with streaks — blast marks, burn stains. */
function makeScorch() {
  return canvasTex(256, 256, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    const cx = w / 2, cy = h / 2;
    const core = ctx.createRadialGradient(cx, cy, 1, cx, cy, w * 0.20);
    core.addColorStop(0, 'rgba(10,9,8,0.92)');
    core.addColorStop(1, 'rgba(10,9,8,0)');
    ctx.fillStyle = core;
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 60; i++) {
      const a = rand() * Math.PI * 2;
      const len = w * (0.14 + Math.pow(rand(), 1.4) * 0.34);
      ctx.strokeStyle = `rgba(12,10,9,${0.10 + rand() * 0.30})`;
      ctx.lineWidth = 2 + rand() * 8;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * w * 0.04, cy + Math.sin(a) * w * 0.04);
      ctx.lineTo(cx + Math.cos(a + (rand() - 0.5) * 0.3) * len, cy + Math.sin(a + (rand() - 0.5) * 0.3) * len);
      ctx.stroke();
    }
  });
}

/** Crack web — broken pavement / plaster. */
function makeCracks() {
  return canvasTex(256, 256, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    const cx = w / 2, cy = h / 2;
    const branch = (x, y, a, len, wd, depth) => {
      if (depth <= 0 || len < 6) return;
      let px = x, py = y;
      const steps = 5;
      for (let s = 0; s < steps; s++) {
        const nx = px + Math.cos(a) * (len / steps);
        const ny = py + Math.sin(a) * (len / steps);
        ctx.strokeStyle = `rgba(14,12,10,${0.30 + rand() * 0.4})`;
        ctx.lineWidth = wd;
        ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(nx, ny); ctx.stroke();
        px = nx; py = ny;
        a += (rand() - 0.5) * 0.9;
        if (rand() < 0.32) branch(px, py, a + (rand() - 0.5) * 2.2, len * 0.55, Math.max(0.6, wd * 0.6), depth - 1);
      }
    };
    for (let i = 0; i < 6; i++) branch(cx, cy, rand() * Math.PI * 2, w * (0.25 + rand() * 0.22), 2.6, 3);
    // spall pits
    for (let i = 0; i < 26; i++) {
      ctx.fillStyle = `rgba(16,14,12,${0.12 + rand() * 0.2})`;
      ctx.beginPath();
      ctx.arc(rand() * w, rand() * h, 1 + rand() * 3.4, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

/** Vertical grime gradient strip (dense at bottom) — wall bases, curb lines. */
function makeGrimeStrip() {
  return canvasTex(128, 128, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    const g = ctx.createLinearGradient(0, h, 0, 0);
    g.addColorStop(0, 'rgba(22,18,14,0.55)');
    g.addColorStop(0.45, 'rgba(24,20,16,0.20)');
    g.addColorStop(1, 'rgba(26,22,18,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    // vertical streak variation
    for (let i = 0; i < 30; i++) {
      const x = rand() * w;
      const g2 = ctx.createLinearGradient(0, h, 0, h * (0.25 + rand() * 0.6));
      g2.addColorStop(0, `rgba(18,15,12,${0.10 + rand() * 0.22})`);
      g2.addColorStop(1, 'rgba(18,15,12,0)');
      ctx.fillStyle = g2;
      ctx.fillRect(x, 0, 2 + rand() * 6, h);
    }
  }, { wrap: THREE.RepeatWrapping });
}

/** Eroded road-paint alpha: opaque with chewed-out holes and edges. */
function makePaintWear() {
  return canvasTex(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 300; i++) {
      const x = rand() * w, y = rand() * h, r = 2 + rand() * 13;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(0,0,0,${0.4 + rand() * 0.6})`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
    }
  }, { srgb: false, wrap: THREE.RepeatWrapping });
}

/** Broad mottled patch for macro-scale ground albedo variation (tint via vertex color). */
function makeMacro() {
  return canvasTex(256, 256, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    for (let i = 0; i < 30; i++) {
      const x = w * 0.5 + (rand() - 0.5) * w * 0.62;
      const y = h * 0.5 + (rand() - 0.5) * h * 0.62;
      const r = 24 + rand() * 62;
      const a = 0.05 + rand() * 0.1;
      const g = ctx.createRadialGradient(x, y, 2, x, y, r);
      g.addColorStop(0, `rgba(255,255,255,${a})`);
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }
  });
}

/** Horizon haze band: warm glow at the bottom fading to transparent. */
function makeHorizonGrad() {
  return canvasTex(64, 256, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    const g = ctx.createLinearGradient(0, h, 0, 0);
    g.addColorStop(0, 'rgba(232,178,118,0.98)');
    g.addColorStop(0.22, 'rgba(226,170,116,0.88)');
    g.addColorStop(0.5, 'rgba(214,168,128,0.5)');
    g.addColorStop(0.78, 'rgba(200,170,150,0.18)');
    g.addColorStop(1, 'rgba(190,175,165,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  });
}

/** Rising smoke column — sprite. Dense anchored base, billowing top.
 *  All alpha is feathered to 0 well inside the quad bounds so the sprite
 *  rectangle can never show against fog/sky. */
function makeSmoke() {
  return canvasTex(256, 512, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    for (let i = 0; i < 170; i++) {
      const t = i / 170; // 0 bottom, 1 top
      const y = h - t * h * 0.9 - 14;
      // tight dark stream at the base, leaning + billowing as it rises
      const lean = t * t * w * 0.12;
      const spread = 4 + t * w * 0.24;
      const x = w * 0.42 + lean + (rand() - 0.5) * spread * 1.2 + Math.sin(t * 7.2) * w * 0.04;
      const r = 18 + t * 40 + rand() * 14;
      const shade = 48 + t * 52 + rand() * 18;
      const al = (0.08 + 0.12 * (1 - t * 0.45)) * (t < 0.045 ? t / 0.045 : 1);
      const g = ctx.createRadialGradient(x, y, 1, x, y, r);
      g.addColorStop(0, `rgba(${shade | 0},${(shade * 0.94) | 0},${(shade * 0.86) | 0},${al})`);
      g.addColorStop(0.6, `rgba(${(shade * 0.9) | 0},${(shade * 0.85) | 0},${(shade * 0.78) | 0},${al * 0.4})`);
      g.addColorStop(1, 'rgba(70,64,58,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }
    // feather every edge except the bottom (base hides behind rooftops/ground)
    ctx.globalCompositeOperation = 'destination-in';
    const gx = ctx.createLinearGradient(0, 0, w, 0);
    gx.addColorStop(0, 'rgba(0,0,0,0)');
    gx.addColorStop(0.2, 'rgba(0,0,0,1)');
    gx.addColorStop(0.78, 'rgba(0,0,0,1)');
    gx.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gx;
    ctx.fillRect(0, 0, w, h);
    const gy = ctx.createLinearGradient(0, 0, 0, h);
    gy.addColorStop(0, 'rgba(0,0,0,0)');
    gy.addColorStop(0.16, 'rgba(0,0,0,1)');
    gy.addColorStop(0.97, 'rgba(0,0,0,1)');
    gy.addColorStop(1, 'rgba(0,0,0,0.6)');
    ctx.fillStyle = gy;
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'source-over';
  });
}

/** Atlas of 4 wide weathered shop-sign strips with abstract script-like strokes. */
function makeSignAtlas() {
  const bgs = ['#63251c', '#1c3d2e', '#233f53', '#7c5a1e'];
  const bgsHi = ['#7d3a2c', '#2c5541', '#33566d', '#96722f'];
  const fgs = ['#ddd0b6', '#d9d4c2', '#d2ccb8', '#e6dbbf'];
  return canvasTex(512, 512, (ctx, w, h) => {
    for (let q = 0; q < 4; q++) {
      const oy = q * 128;
      // sun-faded vertical gradient base
      const bg = ctx.createLinearGradient(0, oy, 0, oy + 128);
      bg.addColorStop(0, bgsHi[q]);
      bg.addColorStop(0.42, bgs[q]);
      bg.addColorStop(1, bgs[q]);
      ctx.fillStyle = bg;
      ctx.fillRect(0, oy, 512, 128);
      // blotchy fade / dust weathering
      for (let i = 0; i < 46; i++) {
        ctx.fillStyle = rand() < 0.6
          ? `rgba(${randInt(150, 215)},${randInt(135, 195)},${randInt(110, 165)},${0.03 + rand() * 0.06})`
          : `rgba(20,16,12,${0.04 + rand() * 0.08})`;
        ctx.fillRect(rand() * 512, oy + rand() * 128, 18 + rand() * 120, 4 + rand() * 26);
      }
      // rust drip streaks from the top edge
      for (let i = 0; i < 7; i++) {
        const dx = rand() * 512;
        const gg = ctx.createLinearGradient(0, oy, 0, oy + 26 + rand() * 60);
        gg.addColorStop(0, 'rgba(78,48,26,0.5)');
        gg.addColorStop(1, 'rgba(78,48,26,0)');
        ctx.fillStyle = gg;
        ctx.fillRect(dx, oy, 2 + rand() * 4, 26 + rand() * 60);
      }
      // double border: outer light pin-line, chipped in places
      ctx.strokeStyle = fgs[q];
      ctx.lineWidth = 4;
      ctx.strokeRect(9, oy + 9, 494, 110);
      ctx.strokeStyle = 'rgba(15,12,9,0.55)';
      ctx.lineWidth = 2;
      ctx.strokeRect(16, oy + 16, 480, 96);
      // chip gaps out of the border
      for (let i = 0; i < 8; i++) {
        ctx.fillStyle = bgs[q];
        const horiz = rand() < 0.6;
        if (horiz) ctx.fillRect(20 + rand() * 460, oy + (rand() < 0.5 ? 6 : 116), 10 + rand() * 26, 8);
        else ctx.fillRect(rand() < 0.5 ? 6 : 500, oy + 16 + rand() * 90, 8, 8 + rand() * 22);
      }
      // abstract script row — connected sweeps with ascenders + dot clusters,
      // drawn twice (dark offset shadow first) so the paint reads raised
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      const yBase = oy + 72;
      // build a word as a fixed list of quadratic segments so the shadow pass
      // and paint pass trace the exact same glyph
      const makeWord = (x0, wordLen) => {
        const segs = [];
        let px = x0;
        let py = yBase + (rand() - 0.5) * 4;
        while (px < x0 + wordLen) {
          const seg = 8 + rand() * 13;
          const nx = Math.min(px + seg, x0 + wordLen);
          const arcH = rand() < 0.3 ? 26 + rand() * 14 : 8 + rand() * 14; // occasional tall ascender
          segs.push([px + seg * 0.4, yBase - arcH, nx, yBase + (rand() - 0.5) * 7]);
          px = nx;
        }
        if (rand() < 0.45) segs.push([px + 7, yBase + 17, px + 13, yBase + 12]); // descender hook
        return { x0, py, segs };
      };
      const strokeWord = (word, lw, color, dx, dy) => {
        ctx.strokeStyle = color;
        ctx.lineWidth = lw;
        ctx.beginPath();
        ctx.moveTo(word.x0 + dx, word.py + dy);
        for (const [cx, cy, ex, ey] of word.segs) ctx.quadraticCurveTo(cx + dx, cy + dy, ex + dx, ey + dy);
        ctx.stroke();
      };
      let x = 30 + rand() * 22;
      while (x < 430) {
        const wordLen = 30 + rand() * 62;
        const lw = 6 + rand() * 4;
        const word = makeWord(x, wordLen);
        strokeWord(word, lw + 1.5, 'rgba(12,9,7,0.4)', 2.5, 3); // shadow pass
        strokeWord(word, lw, fgs[q], 0, 0);                      // paint pass
        // diacritic dots above/below
        const nd = randInt(0, 3);
        for (let di = 0; di < nd; di++) {
          const ddx = x + rand() * wordLen, ddy = yBase + (rand() < 0.55 ? -32 - rand() * 8 : 16 + rand() * 7);
          ctx.fillStyle = 'rgba(12,9,7,0.35)';
          ctx.beginPath(); ctx.arc(ddx + 2, ddy + 2, 3.4, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = fgs[q];
          ctx.beginPath(); ctx.arc(ddx, ddy, 3.4, 0, Math.PI * 2); ctx.fill();
        }
        x += wordLen + 18 + rand() * 16;
      }
      // paint wear: knock faded holes out of the lettering
      for (let i = 0; i < 26; i++) {
        ctx.fillStyle = `rgba(${parseInt(bgs[q].slice(1, 3), 16)},${parseInt(bgs[q].slice(3, 5), 16)},${parseInt(bgs[q].slice(5, 7), 16)},${0.35 + rand() * 0.5})`;
        ctx.beginPath();
        ctx.ellipse(20 + rand() * 470, oy + 24 + rand() * 80, 1.5 + rand() * 5, 1 + rand() * 3.4, rand() * 3, 0, Math.PI * 2);
        ctx.fill();
      }
      // bullet chips with pale halo
      for (let i = 0; i < randInt(1, 4); i++) {
        const bx = 30 + rand() * 450, by = oy + 20 + rand() * 88;
        ctx.fillStyle = 'rgba(190,175,150,0.5)';
        ctx.beginPath(); ctx.arc(bx, by, 4.6 + rand() * 2.4, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(16,13,10,0.9)';
        ctx.beginPath(); ctx.arc(bx, by, 2.2 + rand() * 1.4, 0, Math.PI * 2); ctx.fill();
      }
      // top lip shadow (cast by the sign box) + grime gathered at the bottom
      const tg = ctx.createLinearGradient(0, oy, 0, oy + 18);
      tg.addColorStop(0, 'rgba(10,8,6,0.5)');
      tg.addColorStop(1, 'rgba(10,8,6,0)');
      ctx.fillStyle = tg;
      ctx.fillRect(0, oy, 512, 18);
      const g = ctx.createLinearGradient(0, oy + 128, 0, oy + 80);
      g.addColorStop(0, 'rgba(22,17,13,0.5)');
      g.addColorStop(1, 'rgba(22,17,13,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, oy, 512, 128);
    }
  });
}

/** Ragged alpha for tattered awnings/tarps (white = keep). */
function makeTatter() {
  return canvasTex(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#000';
    // ragged bottom edge
    let x = 0;
    while (x < w) {
      const tw = 8 + rand() * 30;
      const th = rand() * 46;
      ctx.beginPath();
      ctx.moveTo(x, h);
      ctx.lineTo(x + tw / 2, h - th);
      ctx.lineTo(x + tw, h);
      ctx.closePath();
      ctx.fill();
      x += tw * 0.72;
    }
    // holes
    for (let i = 0; i < 9; i++) {
      ctx.beginPath();
      ctx.ellipse(rand() * w, h * 0.45 + rand() * h * 0.5, 2 + rand() * 9, 2 + rand() * 6, rand() * 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }, { srgb: false });
}

/** Registers all buckets. Returns { buckets-ready textures + shared mats }. */
export function setupMaterials(game, buckets) {
  const { assets } = game;
  const std = (pbrName, ts, o = {}) => {
    const params = {
      vertexColors: true,
      roughness: o.roughness ?? 1.0,
      metalness: o.metalness ?? 0.0,
      color: o.color ?? 0xffffff,
      envMapIntensity: o.envMapIntensity ?? 1.0,
      side: o.side ?? THREE.FrontSide,
    };
    if (pbrName && o.noDiff) {
      const base = `/assets/textures/${pbrName}`;
      params.normalMap = assets.texture(`${base}/normal.jpg`);
      params.roughnessMap = assets.texture(`${base}/rough.jpg`);
      params.aoMap = assets.texture(`${base}/ao.jpg`);
    } else if (pbrName) {
      const maps = assets.pbr(pbrName, [1, 1]);
      if (maps.map) params.map = maps.map;
      if (maps.normalMap) params.normalMap = maps.normalMap;
      if (maps.roughnessMap) params.roughnessMap = maps.roughnessMap;
      if (maps.aoMap) params.aoMap = maps.aoMap;
    }
    if (o.map) params.map = o.map;
    if (o.alphaMap) { params.alphaMap = o.alphaMap; params.alphaTest = o.alphaTest ?? 0.45; }
    const m = new THREE.MeshStandardMaterial(params);
    if (o.normalScale) m.normalScale.setScalar(o.normalScale);
    return m;
  };

  const tex = {
    softCircle: makeSoftCircle(),
    blob: makeBlob(),
    scorch: makeScorch(),
    cracks: makeCracks(),
    grime: makeGrimeStrip(),
    smoke: makeSmoke(),
    signs: makeSignAtlas(),
    tatter: makeTatter(),
    horizon: makeHorizonGrad(),
    paintWear: makePaintWear(),
    macro: makeMacro(),
  };

  // ---- ground ------------------------------------------------------------
  buckets.register('dirt', std('gravel_concrete', 5.2, { color: 0xc4b092 }), { texScale: 5.2, castShadow: false });
  buckets.register('asphalt', std('asphalt', 8.5, { color: 0xb3aca0 }), { texScale: 8.5, castShadow: false });
  buckets.register('sidewalk', std('concrete_floor', 2.9, { color: 0xd2c7b1 }), { texScale: 2.9 });
  buckets.register('plaza', std('dirty_concrete', 4.4, { color: 0xd2c8b0 }), { texScale: 4.4 });
  buckets.register('roadPaint', std(null, 1, {
    color: 0xbdb6a2, roughness: 0.97, alphaMap: tex.paintWear, alphaTest: 0.42,
  }), { texScale: 1, castShadow: false, worldUV: false });

  // ---- building walls (one bucket per texture set, tint via vertex color) --
  buckets.register('wall_plaster', std('plaster_painted', 3.7), { texScale: 3.7 });
  buckets.register('wall_plaster2', std('plaster_stone', 3.5), { texScale: 3.5 });
  buckets.register('wall_concrete', std('concrete_wall', 4.3), { texScale: 4.3 });
  buckets.register('wall_concrete2', std('concrete_wall_2', 4.5), { texScale: 4.5 });
  buckets.register('wall_brick', std('brick', 1.45), { texScale: 1.45 });
  buckets.register('wall_brick2', std('brick_red', 1.6), { texScale: 1.6 });
  buckets.register('trim', std('concrete_floor_2', 2.3, { color: 0xd2cabb }), { texScale: 2.3 });
  buckets.register('slab', std('dirty_concrete', 2.5, { color: 0xb7ad9c }), { texScale: 2.5 });
  buckets.register('darkIn', std(null, 1, { color: 0x171310, envMapIntensity: 0.16 }), { texScale: 4, castShadow: false });
  // dielectric window glass: near-black diffuse so panes stay dark face-on,
  // strong fresnel env term so they catch the sky/sun at grazing angles and
  // read as GLASS at distance instead of flush black decals
  buckets.register('glass', std(null, 1, {
    color: 0x141a20, roughness: 0.12, metalness: 0.06, envMapIntensity: 1.5,
  }), { texScale: 1 });
  // dim warm interior glow behind ~10% of panes (occupied rooms at dusk)
  buckets.register('winLit', new THREE.MeshStandardMaterial({
    vertexColors: true, color: 0x2a1c10, emissive: new THREE.Color(0xff9a45),
    emissiveIntensity: 0.42, roughness: 1,
  }), { texScale: 1, castShadow: false });

  // ---- wood / metal / fabric ----------------------------------------------
  buckets.register('woodPale', std('planks', 1.9), { texScale: 1.9 });
  buckets.register('woodDark', std('rough_wood', 2.1), { texScale: 2.1 });
  buckets.register('frame', std(null, 1, { color: 0x54473a, roughness: 0.86 }), { texScale: 1 });
  buckets.register('shutter', std('corrugated', 0.85), { texScale: 0.85 });
  buckets.register('shutter2', std('corrugated_2', 0.65), { texScale: 0.65 });
  buckets.register('metalDark', std(null, 1, { color: 0x36322d, roughness: 0.62, metalness: 0.82 }), { texScale: 1 });
  buckets.register('metalPainted', std('metal_plate_2', 1.7, { metalness: 0.35, roughness: 0.75 }), { texScale: 1.7 });
  buckets.register('rustMetal', std('rusty_sheet', 1.7, { metalness: 0.28, roughness: 0.9 }), { texScale: 1.7 });
  buckets.register('rustGreen', std('metal_rust_green', 1.5, { metalness: 0.3, roughness: 0.85 }), { texScale: 1.5 });
  buckets.register('hesco', std('fabric', 1.25, { color: 0xa8946c, noDiff: true }), { texScale: 1.25 });
  buckets.register('fabric', std('fabric', 1.3, {
    side: THREE.DoubleSide, alphaMap: tex.tatter, alphaTest: 0.45, normalScale: 1.2, noDiff: true,
  }), { worldUV: false });
  buckets.register('fabricSolid', std('fabric', 1.3, { side: THREE.DoubleSide, normalScale: 1.2, noDiff: true }), { worldUV: false });
  buckets.register('wire', std(null, 1, { color: 0x141210, roughness: 0.9 }), { texScale: 1, castShadow: false });

  // ---- vehicles -------------------------------------------------------------
  buckets.register('carPaint', std(null, 1, { metalness: 0.3, roughness: 0.62, envMapIntensity: 0.6 }), { texScale: 1 });
  buckets.register('carBurnt', std('rusty_metal', 1.5, { roughness: 0.96, metalness: 0.2, envMapIntensity: 0.45 }), { texScale: 1.5 });
  buckets.register('carDark', std(null, 1, { color: 0x141312, roughness: 0.92 }), { texScale: 1 });
  // dark dusty auto glass: low env intensity so cabins never read as white
  // sky-mirrors, higher roughness = dull dusty sheen
  buckets.register('carGlass', std(null, 1, {
    color: 0x0f1418, roughness: 0.42, metalness: 0.7, envMapIntensity: 0.32,
  }), { texScale: 1 });

  // ---- decals (transparent overlays) ----------------------------------------
  const decal = (map, o = {}) => new THREE.MeshStandardMaterial({
    map, transparent: true, depthWrite: false, roughness: 1, metalness: 0,
    polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
    vertexColors: true, opacity: o.opacity ?? 1, side: o.side ?? THREE.FrontSide,
  });
  buckets.register('decalStain', decal(tex.blob), { worldUV: false, castShadow: false, receiveShadow: true, renderOrder: 2 });
  buckets.register('decalScorch', decal(tex.scorch), { worldUV: false, castShadow: false, receiveShadow: true, renderOrder: 3 });
  buckets.register('decalCrack', decal(tex.cracks), { worldUV: false, castShadow: false, receiveShadow: true, renderOrder: 2 });
  buckets.register('decalGrime', decal(tex.grime), { worldUV: false, castShadow: false, receiveShadow: true, renderOrder: 2 });
  // macro-scale albedo variation (worn patches / tire lanes) — under other decals
  buckets.register('decalMacro', decal(tex.macro), { worldUV: false, castShadow: false, receiveShadow: true, renderOrder: 1 });
  // fake contact shadow: soft dark blob, unlit so it stays dark inside shadows
  buckets.register('decalShadow', new THREE.MeshBasicMaterial({
    color: 0x000000, transparent: true, opacity: 0.4, alphaMap: tex.softCircle,
    depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
  }), { worldUV: false, castShadow: false, receiveShadow: false, renderOrder: 2 });
  buckets.register('sign', new THREE.MeshStandardMaterial({
    map: tex.signs, roughness: 0.8, metalness: 0.12, vertexColors: true,
  }), { worldUV: false, castShadow: true, receiveShadow: true });

  return tex;
}
