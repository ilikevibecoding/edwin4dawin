// Wear & storytelling decals (Fable 3 domain). One shared alpha atlas; every decal is a single
// quad pushed into the zone merge bucket, so the whole map's grime costs a handful of draws.
// polygonOffset keeps the coplanar quads from z-fighting the floors/walls beneath them.
import * as THREE from 'three';

function mulberry(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let built = null;

// Atlas is transparent; each generator paints soft alpha shapes only (no hard borders so the
// quad rectangle never reads on screen).
export function getDecals() {
  if (built) return built;
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const g = canvas.getContext('2d');
  g.clearRect(0, 0, size, size);

  let px = 2, py = 2, rowH = 0;
  const uv = {};
  const alloc = (key, w, h, draw) => {
    if (px + w + 2 > size) { px = 2; py += rowH + 2; rowH = 0; }
    const x = px, y = py;
    px += w + 2; rowH = Math.max(rowH, h);
    g.save();
    g.translate(x, y);
    g.beginPath(); g.rect(0, 0, w, h); g.clip();
    draw(g, w, h);
    g.restore();
    uv[key] = { u0: x / size, v0: 1 - (y + h) / size, u1: (x + w) / size, v1: 1 - y / size };
  };
  // soft radial blob helper
  const blob = (cx, cy, r, color, a0) => {
    const gr = g.createRadialGradient(cx, cy, r * 0.15, cx, cy, r);
    gr.addColorStop(0, color.replace('$A', String(a0)));
    gr.addColorStop(1, color.replace('$A', '0'));
    g.fillStyle = gr;
    g.beginPath(); g.arc(cx, cy, r, 0, 7); g.fill();
  };

  // carpet wear: pale threadbare patch (lightens carpet)
  alloc('carpetWear', 96, 96, (g, w, h) => {
    const rng = mulberry(7);
    for (let i = 0; i < 9; i++) blob(w / 2 + (rng() - 0.5) * 40, h / 2 + (rng() - 0.5) * 40, 18 + rng() * 22, 'rgba(214,208,196,$A)', 0.16 + rng() * 0.1);
  });
  // generic floor dirt (darkens)
  alloc('dirt', 96, 96, (g, w, h) => {
    const rng = mulberry(13);
    for (let i = 0; i < 10; i++) blob(w / 2 + (rng() - 0.5) * 52, h / 2 + (rng() - 0.5) * 52, 12 + rng() * 20, 'rgba(38,34,28,$A)', 0.12 + rng() * 0.12);
  });
  // oil stain (dark, tight core)
  alloc('oil', 96, 96, (g, w, h) => {
    blob(48, 48, 40, 'rgba(18,16,14,$A)', 0.55);
    blob(30, 60, 18, 'rgba(18,16,14,$A)', 0.4);
    blob(66, 34, 12, 'rgba(18,16,14,$A)', 0.35);
  });
  // water stain (brownish ring)
  alloc('water', 96, 96, (g, w, h) => {
    blob(48, 48, 42, 'rgba(112,96,70,$A)', 0.2);
    g.strokeStyle = 'rgba(104,88,62,0.28)';
    g.lineWidth = 3;
    g.beginPath(); g.arc(48, 50, 33, 0, 7); g.stroke();
    g.beginPath(); g.arc(46, 47, 24, 0.6, 5.4); g.stroke();
  });
  // snow-melt puddle (cool dark, wet sheen handled by low-alpha white streak)
  alloc('puddle', 112, 80, (g, w, h) => {
    blob(w * 0.42, h * 0.5, 34, 'rgba(30,38,44,$A)', 0.4);
    blob(w * 0.68, h * 0.42, 22, 'rgba(30,38,44,$A)', 0.34);
    g.fillStyle = 'rgba(190,210,222,0.14)';
    g.beginPath(); g.ellipse(w * 0.5, h * 0.46, 26, 9, -0.3, 0, 7); g.fill();
  });
  // wall scuff (horizontal dark streaks)
  alloc('scuff', 112, 56, (g, w, h) => {
    const rng = mulberry(29);
    for (let i = 0; i < 7; i++) {
      const y = 8 + rng() * (h - 16), l = 20 + rng() * 60;
      const gr = g.createLinearGradient(10, y, 10 + l, y);
      gr.addColorStop(0, 'rgba(40,38,34,0)');
      gr.addColorStop(0.5, `rgba(40,38,34,${0.16 + rng() * 0.16})`);
      gr.addColorStop(1, 'rgba(40,38,34,0)');
      g.fillStyle = gr;
      g.fillRect(10 + rng() * 20, y, l, 1.5 + rng() * 3);
    }
  });
  // boot print pair trail tile (walks along +v)
  alloc('prints', 64, 128, (g, w, h) => {
    const foot = (x, y, ang, a) => {
      g.save(); g.translate(x, y); g.rotate(ang);
      g.fillStyle = `rgba(36,40,44,${a})`;
      g.beginPath(); g.ellipse(0, -5, 4.5, 8, 0, 0, 7); g.fill();
      g.beginPath(); g.ellipse(0, 7, 3.8, 4.5, 0, 0, 7); g.fill();
      g.restore();
    };
    for (let s = 0; s < 3; s++) {
      foot(22, 110 - s * 40, -0.08, 0.5 - s * 0.13);
      foot(42, 90 - s * 40, 0.08, 0.44 - s * 0.13);
    }
  });
  // cable run (dark strip with two cable lines) — tiles along u
  alloc('cables', 128, 24, (g, w, h) => {
    g.fillStyle = 'rgba(20,20,22,0.5)';
    g.fillRect(0, h / 2 - 5, w, 10);
    g.strokeStyle = 'rgba(60,64,70,0.8)'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(0, h / 2 - 2); g.bezierCurveTo(w * 0.3, h / 2 - 5, w * 0.6, h / 2 + 1, w, h / 2 - 2); g.stroke();
    g.strokeStyle = 'rgba(96,70,50,0.7)';
    g.beginPath(); g.moveTo(0, h / 2 + 3); g.bezierCurveTo(w * 0.4, h / 2 + 6, w * 0.7, h / 2, w, h / 2 + 3); g.stroke();
  });
  // removed-sign residue (pale ghost rectangle + screw holes)
  alloc('residue', 72, 40, (g, w, h) => {
    g.fillStyle = 'rgba(228,224,214,0.2)';
    g.fillRect(6, 6, w - 12, h - 12);
    g.strokeStyle = 'rgba(80,76,68,0.25)'; g.lineWidth = 1.5;
    g.strokeRect(6, 6, w - 12, h - 12);
    g.fillStyle = 'rgba(60,58,52,0.5)';
    for (const [x, y] of [[10, 10], [w - 10, 10], [10, h - 10], [w - 10, h - 10]]) {
      g.beginPath(); g.arc(x, y, 1.6, 0, 7); g.fill();
    }
  });
  // scattered papers (struggle set) — several white sheets at angles
  alloc('papers', 128, 128, (g, w, h) => {
    const rng = mulberry(41);
    for (let i = 0; i < 7; i++) {
      g.save();
      g.translate(20 + rng() * (w - 40), 20 + rng() * (h - 40));
      g.rotate(rng() * 6.3);
      g.fillStyle = 'rgba(232,229,219,0.92)';
      g.fillRect(-11, -15, 22, 30);
      g.fillStyle = 'rgba(130,138,146,0.8)';
      for (let l = 0; l < 6; l++) g.fillRect(-8, -10 + l * 4, 16 * (0.6 + rng() * 0.4), 1.2);
      g.restore();
    }
  });
  // painted floor line (solid strip, tiles along u)
  alloc('lineYellow', 64, 16, (g, w, h) => {
    g.fillStyle = 'rgba(200,164,60,0.85)';
    g.fillRect(0, 3, w, h - 6);
    g.fillStyle = 'rgba(0,0,0,0.12)';
    const rng = mulberry(53);
    for (let i = 0; i < 10; i++) g.fillRect(rng() * w, 3 + rng() * (h - 6), 3 + rng() * 6, 2);
  });
  alloc('lineWhite', 64, 16, (g, w, h) => {
    g.fillStyle = 'rgba(214,214,208,0.8)';
    g.fillRect(0, 3, w, h - 6);
  });
  // WP-012b: wet-floor sheen — cool translucent film with pale highlight streaks (mop trail /
  // melt water). Reads as dampness without needing a roughness change on the shared material.
  alloc('wet', 112, 88, (g, w, h) => {
    blob(w * 0.45, h * 0.5, 40, 'rgba(46,58,66,$A)', 0.22);
    blob(w * 0.7, h * 0.38, 24, 'rgba(46,58,66,$A)', 0.18);
    const rng = mulberry(61);
    for (let i = 0; i < 5; i++) {
      g.fillStyle = `rgba(196,214,224,${0.08 + rng() * 0.07})`;
      g.beginPath();
      g.ellipse(20 + rng() * (w - 40), 16 + rng() * (h - 32), 12 + rng() * 16, 2.5 + rng() * 3, rng() * 3, 0, 7);
      g.fill();
    }
  });
  // faint boot prints (fading trail continuation of 'prints')
  alloc('printsFaint', 64, 128, (g, w, h) => {
    const foot = (x, y, ang, a) => {
      g.save(); g.translate(x, y); g.rotate(ang);
      g.fillStyle = `rgba(40,46,50,${a})`;
      g.beginPath(); g.ellipse(0, -5, 4.5, 8, 0, 0, 7); g.fill();
      g.beginPath(); g.ellipse(0, 7, 3.8, 4.5, 0, 0, 7); g.fill();
      g.restore();
    };
    for (let s = 0; s < 3; s++) {
      foot(22, 110 - s * 40, -0.08, 0.16 - s * 0.045);
      foot(42, 90 - s * 40, 0.08, 0.14 - s * 0.045);
    }
  });
  // hatched no-park zone corner
  alloc('hatch', 96, 96, (g, w, h) => {
    g.strokeStyle = 'rgba(200,164,60,0.7)'; g.lineWidth = 5;
    for (let i = -1; i < 6; i++) {
      g.beginPath(); g.moveTo(i * 24, h); g.lineTo(i * 24 + h, 0); g.stroke();
    }
    g.lineWidth = 6;
    g.strokeRect(3, 3, w - 6, h - 6);
  });

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 2;
  tex.minFilter = THREE.LinearMipmapNearestFilter;
  const mat = new THREE.MeshStandardMaterial({
    map: tex, transparent: true, roughness: 0.9, metalness: 0.0,
    polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
    depthWrite: false,
  });
  mat.name = 'atlas:decals';
  built = { mat, uv };
  return built;
}

// --------------------------------------------------------------------------------------
// Map-wide decal placement. `zones` = {name: Kit}; floor decals go on the zone the room
// belongs to. y is the surface height + small lift (polygonOffset does the real work).
// --------------------------------------------------------------------------------------
export function placeDecals(zones) {
  const d = getDecals();
  const F = 0.004; // floor lift
  const floor = (kit, key, w, h, x, z, y = 0, ry = 0) =>
    kit.quad(d.mat, w, h, x, y + F, z, { horizontal: true, ry, uv: d.uv[key] });
  const wall = (kit, key, w, h, x, y, z, ry = 0) =>
    kit.quad(d.mat, w, h, x, y, z, { ry, uv: d.uv[key] });

  const gp = zones.gPublic, gs = zones.gService, f1 = zones.upper;

  // --- entrance: snow-melt + boot tracks (plaza vestibule lobby) ---
  floor(gp, 'puddle', 1.4, 1.0, 17, 34.6);
  floor(gp, 'puddle', 1.1, 0.8, 16.4, 33.2);
  floor(gp, 'prints', 0.8, 1.6, 17.3, 33.8);
  floor(gp, 'prints', 0.8, 1.6, 17, 30.6, 0, 0.15);
  floor(gp, 'dirt', 1.6, 1.6, 17, 32.2);
  // WP-012b: wet sheen at both door thresholds + trail fading inward past the mats
  floor(gp, 'wet', 1.6, 1.2, 17, 35.3);
  floor(gp, 'wet', 1.5, 1.1, 17, 31.9);
  floor(gp, 'wet', 1.2, 0.9, 17.2, 29.9);
  floor(gp, 'printsFaint', 0.8, 1.6, 16.8, 28.4, 0, 0.1);
  floor(gp, 'printsFaint', 0.8, 1.6, 18.0, 26.6, 0, -0.5);
  // lobby traffic wear on tile + struggle papers near vestibule
  floor(gp, 'dirt', 2.2, 2.2, 17, 28.6);
  floor(gp, 'papers', 1.5, 1.5, 19.3, 30.2, 0, 0.4);
  floor(gp, 'papers', 1.1, 1.1, 20.6, 31.0, 0, 2.1);
  wall(gp, 'scuff', 1.4, 0.7, 8.5, 0.5, 24.09);                    // lobby north wall base band
  wall(gp, 'residue', 0.7, 0.4, 26.5, 1.7, 24.09);                 // sign was removed here
  // waiting lounge carpet wear at the arch
  floor(gp, 'carpetWear', 1.8, 1.8, 35.4, 28);
  floor(gp, 'carpetWear', 1.4, 1.4, 38.2, 32.4);
  // sec office: worn carpet at the door + coffee ring
  floor(gp, 'carpetWear', 1.5, 1.5, 24.5, 22.8);
  floor(gp, 'dirt', 0.9, 0.9, 21.6, 19.2);
  // restrooms/copy vinyl dirt
  floor(gp, 'dirt', 1.1, 1.1, 36, 20.6);
  floor(gp, 'water', 0.9, 0.9, 11, 20.2);
  // WP-012b: restroom dampness — sheen in front of the vanities and at the drains
  floor(gp, 'wet', 1.2, 0.9, 9.3, 20.6);
  floor(gp, 'wet', 0.9, 0.7, 11, 21.5);
  floor(gp, 'wet', 1.1, 0.9, 2.8, 25.3);
  floor(gp, 'water', 0.7, 0.7, 2.1, 27.0);

  // --- service side ---
  floor(gs, 'oil', 1.6, 1.6, 4.2, 3.4);
  floor(gs, 'oil', 1.1, 1.1, 7.6, 7.8);
  floor(gs, 'dirt', 2.0, 2.0, 8.6, 10.6);
  // garage painted lines: van bay + walk lane along east side
  floor(gs, 'lineYellow', 4.6, 0.12, 5.2, 1.2);
  floor(gs, 'lineYellow', 0.12, 8.8, 1.0, 5.6);
  floor(gs, 'lineYellow', 0.12, 8.8, 9.4, 5.6);
  floor(gs, 'lineWhite', 0.1, 10.5, 11.6, 6.1);
  floor(gs, 'hatch', 1.4, 1.4, 12.6, 1.2);
  // loading dock lines + wear
  floor(gs, 'lineYellow', 0.12, 10.0, 16.2, 6.0);
  floor(gs, 'lineYellow', 6.0, 0.12, 21.5, 10.9);
  floor(gs, 'hatch', 1.5, 1.5, 19, 1.6);
  floor(gs, 'dirt', 2.4, 2.4, 22, 5);
  floor(gs, 'oil', 1.2, 1.2, 26.5, 7.2);
  wall(gs, 'scuff', 1.8, 0.8, 20.5, 0.55, 11.91, Math.PI);         // forklift scuffs by the wide door
  // mech: stains under plant + cable runs to panels
  floor(gs, 'oil', 1.3, 1.3, 35.4, 2.6);
  floor(gs, 'water', 1.0, 1.0, 31.5, 8.5);
  floor(gs, 'cables', 2.6, 0.5, 32.4, 4.7, 0, Math.PI / 2);
  // service corridor: scuffs + cable run along wall
  floor(gs, 'cables', 3.2, 0.5, 24, 12.55);
  wall(gs, 'scuff', 1.6, 0.7, 14, 0.5, 12.09);
  wall(gs, 'scuff', 1.6, 0.7, 27, 0.5, 12.09);
  floor(gs, 'dirt', 1.6, 1.6, 10.5, 13.5);
  // server room: cable runs between rack rows
  floor(gs, 'cables', 2.8, 0.5, 40.8, 4.9);
  floor(gs, 'cables', 2.2, 0.5, 41.6, 5.6);
  // IT: cable spill under bench
  floor(gs, 'cables', 2.0, 0.5, 45, 11.4);
  floor(gs, 'dirt', 1.2, 1.2, 39.6, 13.9);

  // --- upper floor (y = 3.6) ---
  const Y1 = 3.6;
  // cubicle aisles carpet wear
  floor(f1, 'carpetWear', 1.8, 1.8, 8, 7.5, Y1);
  floor(f1, 'carpetWear', 1.6, 1.6, 20, 7.5, Y1);
  floor(f1, 'carpetWear', 1.6, 2.2, 14, 12.6, Y1);
  floor(f1, 'carpetWear', 1.4, 1.4, 8, 19, Y1);
  floor(f1, 'dirt', 1.1, 1.1, 24.6, 13.4, Y1);
  // corr-n / exec corridor wear
  floor(f1, 'carpetWear', 1.6, 1.6, 33, 11.5, Y1);
  floor(f1, 'dirt', 1.2, 1.2, 42.5, 15, Y1);
  wall(f1, 'residue', 0.7, 0.4, 39.5, Y1 + 1.7, 13.09);
  // conference spill + records dust
  floor(f1, 'carpetWear', 1.4, 1.4, 33.4, 8.6, Y1);
  floor(f1, 'dirt', 1.4, 1.4, 45.8, 8.4, Y1);
  floor(f1, 'water', 0.9, 0.9, 41, 1.2, Y1);
  // exec office: struggle evidence near hostage B
  floor(f1, 'papers', 1.4, 1.4, 45.0, 22.4, Y1, 1.2);
  floor(f1, 'dirt', 1.0, 1.0, 45.6, 20.8, Y1);
  // mezzanine gallery traffic + planters drip
  floor(f1, 'dirt', 1.6, 1.6, 25, 33, Y1);
  floor(f1, 'water', 0.8, 0.8, 16, 31.4, Y1);
  wall(f1, 'scuff', 1.4, 0.7, 10.5, Y1 + 0.5, 24.09);
}
