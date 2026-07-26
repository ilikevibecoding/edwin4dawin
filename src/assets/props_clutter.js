// ============================================================================
// NORTHSTAR RESCUE — prop library: desk clutter, signage & storytelling
// (Fable 3). Same contract as props_office.js: origin at floor center of the
// footprint, facing -Z, local AABB collision on solid props. Small clutter
// (< 0.25 m) carries no collision by design. All text/branding original.
// ============================================================================
import * as THREE from 'three';
import {
  mat, canvasTex, texMat, textTex, drawStar, rng,
  M, G, gBox, gCyl, gSphere, gTorus, gPlane, gLathe, label,
  col, setCol, makeDef,
} from './props_office.js';

export const PROPS = {};
const def = makeDef(PROPS, import.meta.url);

// ---------------------------------------------------------------- paperwork
function paperTex(i) {
  return canvasTex('paper' + i, 128, 180, (g, w, h) => {
    g.fillStyle = '#f4f2ec'; g.fillRect(0, 0, w, h);
    const r = rng(100 + i);
    g.fillStyle = '#3c4652';
    if (i % 3 === 0) { // memo w/ letterhead
      g.font = 'bold 9px Arial'; g.fillText('NORTHSTAR LOGISTICS GROUP', 10, 16);
      drawStar(g, 112, 13, 8, { ring: '#14365c', star: '#14365c' });
      g.fillStyle = '#8a97a5';
      for (let l = 0; l < 14; l++) g.fillRect(10, 30 + l * 10, (w - 24) * (0.5 + r() * 0.5), 3);
    } else if (i % 3 === 1) { // form/table
      g.strokeStyle = '#9aa5b0'; g.lineWidth = 1;
      for (let l = 0; l < 9; l++) g.strokeRect(10, 14 + l * 18, w - 20, 18);
      g.fillStyle = '#7d8894';
      for (let l = 0; l < 9; l++) if (r() > 0.35) g.fillRect(14, 20 + l * 18, 40 + r() * 50, 4);
    } else { // dense text
      g.fillStyle = '#8a97a5';
      for (let l = 0; l < 20; l++) g.fillRect(10, 12 + l * 8, (w - 22) * (0.6 + r() * 0.4), 2.6);
    }
  });
}

def('paper_sheet', 'Paper sheet (A4)', {
  footprint: [0.21, 0.3], height: 0.002, rooms: 'desks, floors',
}, (opts = {}) => {
  const g = new THREE.Group();
  const m = new THREE.MeshStandardMaterial({ map: paperTex(opts.v ?? 0), roughness: 0.9 });
  g.add(label(0.21, 0.297, m, 0, 0.0015, 0, { face: '+y', rz: opts.rz ?? 0.1 }));
  return g;
});

def('paper_stack', 'Paper stack', {
  footprint: [0.22, 0.31], height: 0.06, rooms: 'desks, copy room',
}, () => {
  const g = new THREE.Group();
  const side = canvasTex('paperstack_side', 64, 32, (gg, w, h) => {
    gg.fillStyle = '#e9e6dc'; gg.fillRect(0, 0, w, h);
    const r = rng(7);
    for (let y = 0; y < h; y += 2) {
      gg.fillStyle = `rgba(120,110,90,${0.08 + r() * 0.12})`;
      gg.fillRect(0, y, w, 1);
    }
  }, { repeat: true });
  g.add(M(gBox(0.21, 0.055, 0.297), new THREE.MeshStandardMaterial({ map: side, roughness: 0.85 }), 0, 0.0275, 0));
  g.add(label(0.21, 0.297, new THREE.MeshStandardMaterial({ map: paperTex(0), roughness: 0.9 }), 0, 0.0555, 0, { face: '+y' }));
  return g;
});

def('paper_pile_messy', 'Messy paper pile', {
  footprint: [0.45, 0.4], height: 0.03, rooms: 'desks, raided offices',
}, (opts = {}) => {
  const g = new THREE.Group();
  const r = rng(opts.seed ?? 33);
  for (let i = 0; i < 8; i++) {
    const m = new THREE.MeshStandardMaterial({ map: paperTex(i % 5), roughness: 0.9 });
    g.add(label(0.21, 0.297, m, (r() - 0.5) * 0.22, 0.001 + i * 0.0012, (r() - 0.5) * 0.14, { face: '+y', rz: (r() - 0.5) * 1.6 }));
  }
  // one folded sheet
  g.add(M(gBox(0.105, 0.004, 0.146), mat('paper'), 0.1, 0.012, 0.1, { ry: 0.5 }));
  return g;
});

def('folder_stack', 'Folder stack', {
  footprint: [0.26, 0.33], height: 0.06, rooms: 'desks, records',
}, (opts = {}) => {
  const g = new THREE.Group();
  const r = rng(opts.seed ?? 44);
  const cols = [0xc9a86a, 0xb35d52, 0x5b7d9e, 0xc9a86a, 0x7d9e6b];
  for (let i = 0; i < 5; i++) {
    const m = new THREE.MeshStandardMaterial({ color: cols[i % cols.length], roughness: 0.85 });
    const f = M(gBox(0.24, 0.008, 0.32), m, (r() - 0.5) * 0.03, 0.006 + i * 0.011, (r() - 0.5) * 0.03, { ry: (r() - 0.5) * 0.24 });
    g.add(f);
    // tab
    g.add(M(gBox(0.07, 0.008, 0.02), m, (r() - 0.5) * 0.03 + 0.06 - i * 0.03, 0.006 + i * 0.011, -0.17 + (r() - 0.5) * 0.02));
    // paper poking out
    if (i % 2 === 0) g.add(M(gBox(0.2, 0.002, 0.3), mat('paper'), (r() - 0.5) * 0.03, 0.011 + i * 0.011, 0.012, { ry: (r() - 0.5) * 0.2 }));
  }
  return g;
});

def('binder_row', 'Binder row', {
  footprint: [0.34, 0.29], height: 0.32, rooms: 'shelves, records', gallery: { count: 5 },
}, (opts = {}) => {
  const g = new THREE.Group();
  const n = opts.count ?? 4;
  const cols = [0x1a3a5c, 0x5c5f66, 0x74282e, 0x2e4a5c, 0x3e5c46];
  const labels = ['DISPATCH  2025 · Q1', 'DISPATCH  2025 · Q2', 'FINANCE  AP/AR', 'FLEET  MAINT LOG', 'HR  ROSTERS'];
  let x = -(n - 1) * 0.037;
  for (let i = 0; i < n; i++) {
    const c = cols[i % cols.length];
    const bm = new THREE.MeshStandardMaterial({ color: c, roughness: 0.6 });
    const tilt = i === n - 1 ? 0.22 : 0;
    const b = new THREE.Group();
    // leaning binder pivots at its base corner; lift so no corner dips below floor
    b.position.set(x + (i === n - 1 ? 0.025 : 0), tilt ? 0.01 : 0, 0);
    b.rotation.z = tilt;
    b.add(M(gBox(0.062, 0.315, 0.28, 0.006), bm, 0, 0.158, 0));
    // pages
    b.add(M(gBox(0.05, 0.29, 0.26), mat('paper'), 0, 0.158, 0.012));
    const lt = texMat('binder_lbl' + i, 64, 192, (gg) => {
      gg.fillStyle = '#f2f0ea'; gg.fillRect(0, 0, 64, 192);
      gg.save(); gg.translate(32, 96); gg.rotate(-Math.PI / 2);
      gg.fillStyle = '#2c3540'; gg.font = 'bold 13px Arial'; gg.textAlign = 'center';
      gg.fillText(labels[i % labels.length], 0, 5);
      gg.restore();
    }, { roughness: 0.8 });
    b.add(label(0.04, 0.24, lt, 0, 0.158, -0.143));
    g.add(b);
    x += 0.074;
  }
  return g;
});

def('notebook', 'Notebook (spiral)', {
  footprint: [0.16, 0.22], height: 0.02, rooms: 'desks',
}, (opts = {}) => {
  const g = new THREE.Group();
  const covers = [0x2e4a5c, 0x74282e, 0x3e5c46];
  const cm = new THREE.MeshStandardMaterial({ color: covers[(opts.v ?? 0) % 3], roughness: 0.7 });
  g.add(M(gBox(0.15, 0.012, 0.21, 0.003), cm, 0, 0.006, 0));
  // spiral rings along the left edge
  for (let i = 0; i < 9; i++) {
    g.add(M(gTorus(0.008, 0.0018, 5, 8), mat('metal_brushed'), -0.073, 0.007, -0.088 + i * 0.022, { ry: Math.PI / 2 }));
  }
  return g;
});

def('pen_cup', 'Pen cup', {
  footprint: [0.09, 0.09], height: 0.16, rooms: 'desks',
}, () => {
  const g = new THREE.Group();
  g.add(M(gCyl(0.038, 0.034, 0.1, 12, true), mat('metal_dark'), 0, 0.05, 0));
  g.add(M(gCyl(0.034, 0.034, 0.005, 12), mat('metal_dark'), 0, 0.004, 0));
  const r = rng(17);
  const cols = [0x2b6da0, 0xc0392b, 0x2c2e33, 0xd9a323, 0x2c2e33];
  for (let i = 0; i < 5; i++) {
    const pm = new THREE.MeshStandardMaterial({ color: cols[i], roughness: 0.45 });
    const a = (i / 5) * Math.PI * 2;
    g.add(M(gCyl(0.0035, 0.0035, 0.13, 6), pm, Math.cos(a) * 0.02, 0.09, Math.sin(a) * 0.02, {
      rx: (r() - 0.5) * 0.35, rz: (r() - 0.5) * 0.35,
    }));
  }
  return g;
});

def('stapler', 'Stapler', {
  footprint: [0.16, 0.06], height: 0.055, rooms: 'desks',
}, () => {
  const g = new THREE.Group();
  g.add(M(gBox(0.15, 0.018, 0.045, 0.006), mat('rubber'), 0, 0.009, 0));
  g.add(M(gBox(0.14, 0.014, 0.036, 0.005), mat('metal_brushed'), 0.004, 0.026, 0));
  g.add(M(gBox(0.145, 0.02, 0.042, 0.008), mat('plastic_black'), 0.008, 0.043, 0, { rz: 0.06 }));
  return g;
});

def('tape_dispenser', 'Tape dispenser', {
  footprint: [0.14, 0.06], height: 0.09, rooms: 'desks, mail room',
}, () => {
  const g = new THREE.Group();
  g.add(M(gBox(0.13, 0.04, 0.05, 0.01), mat('plastic_black'), 0, 0.02, 0));
  g.add(M(gBox(0.05, 0.05, 0.05, 0.01), mat('plastic_black'), -0.02, 0.055, 0));
  const tapeM = new THREE.MeshPhysicalMaterial({ color: 0xcbb98a, transparent: true, opacity: 0.7, roughness: 0.3 });
  g.add(M(gTorus(0.026, 0.011, 6, 14), tapeM, -0.02, 0.06, 0, { ry: Math.PI / 2 }));
  g.add(M(gCyl(0.012, 0.012, 0.024, 8), mat('plastic_gray'), -0.02, 0.06, 0, { rx: Math.PI / 2 }));
  g.add(M(gBox(0.016, 0.012, 0.046), mat('metal_brushed'), 0.058, 0.032, 0));
  return g;
});

def('scissors', 'Scissors', {
  footprint: [0.18, 0.08], height: 0.015, rooms: 'desks',
}, () => {
  const g = new THREE.Group();
  const blade = (s) => {
    const b = new THREE.Group();
    b.add(M(gBox(0.095, 0.003, 0.012), mat('metal_brushed'), -0.048, 0.006, 0));
    const hm = new THREE.MeshStandardMaterial({ color: 0xc0392b, roughness: 0.5 });
    b.add(M(gTorus(0.016, 0.005, 6, 12), hm, 0.035, 0.006, 0, { rx: Math.PI / 2 }));
    b.rotation.y = s * 0.16;
    return b;
  };
  g.add(blade(1), blade(-1));
  g.add(M(gCyl(0.004, 0.004, 0.008, 8), mat('metal_dark'), 0, 0.007, 0));
  return g;
});

def('sticky_notes', 'Sticky notes', {
  footprint: [0.2, 0.12], height: 0.025, rooms: 'desks, monitors', gallery: {},
}, () => {
  const g = new THREE.Group();
  const yellow = new THREE.MeshStandardMaterial({ color: 0xf2df6b, roughness: 0.85 });
  const pink = new THREE.MeshStandardMaterial({ color: 0xf2a3b3, roughness: 0.85 });
  g.add(M(gBox(0.076, 0.02, 0.076), yellow, -0.04, 0.01, 0));
  // a few loose notes with pen scribbles
  const noteT = (i) => texMat('sticky' + i, 64, 64, (gg) => {
    gg.fillStyle = i === 1 ? '#f2a3b3' : '#f2df6b'; gg.fillRect(0, 0, 64, 64);
    gg.strokeStyle = '#3c4652'; gg.lineWidth = 2;
    const r = rng(200 + i);
    for (let l = 0; l < 4; l++) {
      gg.beginPath(); gg.moveTo(8, 14 + l * 12);
      gg.quadraticCurveTo(32, 12 + l * 12 + (r() - 0.5) * 6, 56 - r() * 14, 15 + l * 12);
      gg.stroke();
    }
  }, { roughness: 0.85 });
  g.add(label(0.074, 0.074, noteT(0), 0.05, 0.001, 0.014, { face: '+y', rz: 0.3 }));
  g.add(label(0.074, 0.074, noteT(1), 0.078, 0.0015, -0.03, { face: '+y', rz: -0.2 }));
  // one curled note
  const curled = M(gBox(0.074, 0.002, 0.074), yellow, -0.045, 0.028, 0.052, { rx: -0.5 });
  g.add(curled);
  return g;
});

def('tray_paperclips', 'Paper-clip tray', {
  footprint: [0.1, 0.1], height: 0.03, rooms: 'desks',
}, () => {
  const g = new THREE.Group();
  g.add(M(gLathe('cliptray', [[0.001, 0.002], [0.04, 0.004], [0.048, 0.022], [0.042, 0.024], [0.036, 0.008], [0.001, 0.006]], 14), mat('plastic_black'), 0, 0, 0));
  const r = rng(26);
  for (let i = 0; i < 7; i++) {
    g.add(M(gTorus(0.0075, 0.0014, 4, 10), mat('metal_brushed'), (r() - 0.5) * 0.05, 0.012 + r() * 0.006, (r() - 0.5) * 0.05, {
      rx: Math.PI / 2 + (r() - 0.5) * 0.8, ry: r() * 3, sx: 0.62,
    }));
  }
  return g;
});

def('badge_id', 'ID badge + lanyard', {
  footprint: [0.16, 0.2], height: 0.01, rooms: 'desks, floors (storytelling)',
}, (opts = {}) => {
  const g = new THREE.Group();
  const badge = texMat('badge_face' + (opts.v ?? 0), 128, 192, (gg) => {
    gg.fillStyle = '#f0f2f4'; gg.fillRect(0, 0, 128, 192);
    gg.fillStyle = '#14365c'; gg.fillRect(0, 0, 128, 40);
    drawStar(gg, 20, 20, 12);
    gg.fillStyle = '#eaf6ff'; gg.font = 'bold 11px Arial';
    gg.fillText('NORTHSTAR', 38, 18); gg.fillText('LOGISTICS GROUP', 38, 31);
    // photo silhouette
    gg.fillStyle = '#c3ccd4'; gg.fillRect(24, 52, 80, 84);
    gg.fillStyle = '#7d8894';
    gg.beginPath(); gg.arc(64, 84, 17, 0, 7); gg.fill();
    gg.beginPath(); gg.ellipse(64, 128, 28, 20, 0, Math.PI, 0); gg.fill();
    gg.fillStyle = '#2c3540'; gg.font = 'bold 12px Arial'; gg.textAlign = 'center';
    gg.fillText(['R. HALVORSEN', 'M. OKAFOR', 'T. LINDQVIST'][(opts.v ?? 0) % 3], 64, 156);
    gg.font = '10px Arial'; gg.fillStyle = '#5c7c96';
    gg.fillText(['DISPATCH', 'FINANCE', 'IT OPERATIONS'][(opts.v ?? 0) % 3], 64, 172);
  }, { roughness: 0.4 });
  g.add(M(gBox(0.086, 0.004, 0.128, 0.001), mat('plastic_white'), 0, 0.002, 0, { ry: 0.2 }));
  g.add(label(0.08, 0.122, badge, 0, 0.0045, 0, { face: '+y', rz: 0.2 }));
  // lanyard ribbon: flat tube snake
  const pts = [
    new THREE.Vector3(0.01, 0.002, -0.065),
    new THREE.Vector3(0.05, 0.003, -0.11),
    new THREE.Vector3(-0.01, 0.004, -0.15),
    new THREE.Vector3(-0.05, 0.003, -0.11),
    new THREE.Vector3(-0.03, 0.005, -0.07),
  ];
  const lan = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 20, 0.006, 5), new THREE.MeshStandardMaterial({ color: 0x14365c, roughness: 0.85 }));
  lan.scale.y = 0.4;
  lan.castShadow = true;
  g.add(lan);
  g.add(M(gBox(0.014, 0.006, 0.02), mat('metal_brushed'), 0.005, 0.004, -0.068));
  return g;
});

def('keycard_prop', 'Security keycard', {
  footprint: [0.09, 0.06], height: 0.004, rooms: 'desks, security',
}, () => {
  const g = new THREE.Group();
  const face = texMat('keycard_face', 128, 80, (gg) => {
    gg.fillStyle = '#1a3a5c'; gg.fillRect(0, 0, 128, 80);
    gg.fillStyle = '#c8a648'; gg.fillRect(12, 26, 26, 20); // chip
    gg.strokeStyle = '#8fd8ff'; gg.strokeRect(12, 26, 26, 20);
    drawStar(gg, 100, 26, 14);
    gg.fillStyle = '#8fd8ff'; gg.font = 'bold 10px Arial';
    gg.fillText('ACCESS · LEVEL 2', 12, 66);
  }, { roughness: 0.35 });
  g.add(M(gBox(0.086, 0.0028, 0.054, 0.001), mat('plastic_white'), 0, 0.0014, 0));
  g.add(label(0.082, 0.05, face, 0, 0.0032, 0, { face: '+y' }));
  return g;
});

def('calendar_desk', 'Desk calendar (tent)', {
  footprint: [0.16, 0.08], height: 0.13, rooms: 'desks',
}, () => {
  const g = new THREE.Group();
  const face = texMat('calendar', 192, 128, (gg, w, h) => {
    gg.fillStyle = '#f6f5f0'; gg.fillRect(0, 0, w, h);
    gg.fillStyle = '#14365c'; gg.fillRect(0, 0, w, 26);
    gg.fillStyle = '#eaf6ff'; gg.font = 'bold 15px Arial'; gg.textAlign = 'center';
    gg.fillText('DECEMBER', w / 2, 19);
    gg.fillStyle = '#3c4652'; gg.font = '9px Arial';
    let d = 1;
    for (let row = 0; row < 5; row++) for (let c = 0; c < 7 && d <= 31; c++, d++) {
      if (d === 17) { gg.fillStyle = '#c0392b'; gg.beginPath(); gg.arc(16 + c * 26, 42 + row * 18, 8, 0, 7); gg.stroke?.(); gg.strokeStyle = '#c0392b'; gg.lineWidth = 2; gg.stroke(); gg.fillStyle = '#3c4652'; }
      gg.fillText(String(d), 16 + c * 26, 46 + row * 18);
    }
  }, { roughness: 0.85 });
  for (const s of [-1, 1]) {
    const p = M(gBox(0.15, 0.115, 0.004), mat('paper'), 0, 0.0555, s * 0.028, { rx: s * 0.42 });
    g.add(p);
  }
  const f = label(0.144, 0.108, face, 0, 0.0565, -0.0315, { rx: 0.42 });
  g.add(f);
  return g;
});

def('frame_photo', 'Photo frame', {
  footprint: [0.16, 0.06], height: 0.13, rooms: 'desks, exec office', gallery: { v: 0 },
}, (opts = {}) => {
  const g = new THREE.Group();
  const art = texMat('framedart' + (opts.v ?? 0), 128, 96, (gg, w, h) => {
    if ((opts.v ?? 0) % 2 === 0) {
      // winter mountain landscape
      const sky = gg.createLinearGradient(0, 0, 0, h);
      sky.addColorStop(0, '#cfe0f2'); sky.addColorStop(1, '#eef4fa');
      gg.fillStyle = sky; gg.fillRect(0, 0, w, h);
      gg.fillStyle = '#7d97ab';
      gg.beginPath(); gg.moveTo(0, 76); gg.lineTo(34, 30); gg.lineTo(58, 62); gg.lineTo(84, 22); gg.lineTo(w, 70); gg.lineTo(w, h); gg.lineTo(0, h); gg.fill();
      gg.fillStyle = '#eef4fa';
      gg.beginPath(); gg.moveTo(26, 41); gg.lineTo(34, 30); gg.lineTo(42, 41); gg.closePath(); gg.fill();
      gg.beginPath(); gg.moveTo(76, 33); gg.lineTo(84, 22); gg.lineTo(92, 33); gg.closePath(); gg.fill();
      gg.fillStyle = '#5d6f7d'; gg.fillRect(0, 76, w, h - 76);
    } else {
      // family silhouettes, warm sunset
      const sky = gg.createLinearGradient(0, 0, 0, h);
      sky.addColorStop(0, '#f5c98a'); sky.addColorStop(1, '#e8935c');
      gg.fillStyle = sky; gg.fillRect(0, 0, w, h);
      gg.fillStyle = '#fdf0d0'; gg.beginPath(); gg.arc(92, 36, 14, 0, 7); gg.fill();
      gg.fillStyle = '#4a3527';
      const figure = (x, s) => {
        gg.beginPath(); gg.arc(x, 58 - 14 * s, 5 * s, 0, 7); gg.fill();
        gg.fillRect(x - 4 * s, 58 - 9 * s, 8 * s, 22 * s);
      };
      figure(44, 1.0); figure(60, 0.92); figure(74, 0.6);
      gg.fillRect(0, 78, w, h - 78);
    }
  }, { roughness: 0.5 });
  const fr = new THREE.Group();
  fr.rotation.x = -0.14;
  fr.add(M(gBox(0.15, 0.115, 0.008, 0.002), mat('wood_dark'), 0, 0.0575, 0));
  fr.add(label(0.126, 0.092, art, 0, 0.0575, -0.0045));
  g.add(fr);
  // back leg
  g.add(M(gBox(0.05, 0.09, 0.006), mat('wood_dark'), 0, 0.045, 0.028, { rx: 0.42 }));
  return g;
});

def('brochure_stand', 'Brochure stand', {
  footprint: [0.24, 0.12], height: 0.24, rooms: 'reception lobby',
}, () => {
  const g = new THREE.Group();
  const acrylic = new THREE.MeshPhysicalMaterial({ color: 0xdfe8ec, transparent: true, opacity: 0.25, roughness: 0.08 });
  g.add(M(gBox(0.22, 0.005, 0.11), acrylic, 0, 0.003, 0, { cast: false }));
  g.add(M(gBox(0.22, 0.16, 0.005), acrylic, 0, 0.08, -0.045, { rx: 0.12, cast: false }));
  g.add(M(gBox(0.22, 0.07, 0.005), acrylic, 0, 0.035, -0.056, { rx: 0.12, cast: false }));
  const bro = texMat('brochure', 128, 192, (gg, w, h) => {
    gg.fillStyle = '#14365c'; gg.fillRect(0, 0, w, h);
    gg.fillStyle = '#1d4a7a'; gg.fillRect(0, 0, w, 90);
    drawStar(gg, w / 2, 46, 28);
    gg.fillStyle = '#eaf6ff'; gg.textAlign = 'center';
    gg.font = 'bold 13px Arial'; gg.fillText('NORTHSTAR', w / 2, 108);
    gg.fillText('LOGISTICS GROUP', w / 2, 124);
    gg.fillStyle = '#8fd8ff'; gg.font = '10px Arial';
    gg.fillText('WINTER OPERATIONS', w / 2, 146);
    gg.fillStyle = '#9db4c8';
    for (let l = 0; l < 3; l++) gg.fillRect(18, 158 + l * 9, w - 36, 3);
  }, { roughness: 0.7 });
  for (let i = 0; i < 3; i++) {
    g.add(label(0.066, 0.15, bro, -0.072 + i * 0.072, 0.1, -0.038 - 0.006 * (i % 2), { rx: 0.12 }));
  }
  return g;
});

def('cup_coffee_togo', 'To-go coffee cup', {
  footprint: [0.09, 0.09], height: 0.14, rooms: 'desks, break room',
}, () => {
  const g = new THREE.Group();
  const band = canvasTex('togo_band', 256, 96, (gg, w, h) => {
    gg.fillStyle = '#efe9dc'; gg.fillRect(0, 0, w, h);
    gg.fillStyle = '#6d4a30'; gg.fillRect(0, 30, w, 40);
    gg.fillStyle = '#efe9dc'; gg.font = 'bold 19px Arial'; gg.textAlign = 'center';
    gg.fillText('TUNDRA ROAST', w / 2, 56);
  });
  g.add(M(gCyl(0.041, 0.032, 0.12, 16, true), new THREE.MeshStandardMaterial({ map: band, roughness: 0.75 }), 0, 0.06, 0));
  g.add(M(gCyl(0.032, 0.032, 0.004, 14), mat('paper'), 0, 0.004, 0));
  // lid
  g.add(M(gCyl(0.043, 0.041, 0.012, 16), mat('plastic_white'), 0, 0.126, 0));
  g.add(M(gCyl(0.02, 0.03, 0.008, 12), mat('plastic_white'), 0, 0.136, 0));
  return g;
});

def('bottle_water', 'Water bottle', {
  footprint: [0.07, 0.07], height: 0.23, rooms: 'desks, gym bags',
}, () => {
  const g = new THREE.Group();
  const pet = new THREE.MeshPhysicalMaterial({ color: 0xd8ecf4, transparent: true, opacity: 0.35, roughness: 0.08 });
  const water = new THREE.MeshPhysicalMaterial({ color: 0xa8d4e8, transparent: true, opacity: 0.5, roughness: 0.1 });
  g.add(M(gLathe('bottle', [[0.001, 0], [0.031, 0.002], [0.033, 0.03], [0.03, 0.09], [0.033, 0.13], [0.028, 0.17], [0.013, 0.2], [0.012, 0.215], [0.0, 0.215]], 14), pet, 0, 0, 0, { cast: false }));
  g.add(M(gCyl(0.028, 0.029, 0.11, 12), water, 0, 0.062, 0, { cast: false }));
  g.add(M(gCyl(0.0135, 0.0135, 0.018, 12), new THREE.MeshStandardMaterial({ color: 0x2b6da0, roughness: 0.4 }), 0, 0.222, 0));
  const lbl = canvasTex('bottle_lbl', 192, 48, (gg, w, h) => {
    gg.fillStyle = '#eaf4fa'; gg.fillRect(0, 0, w, h);
    gg.fillStyle = '#2b6da0'; gg.font = 'bold 17px Arial'; gg.textAlign = 'center';
    gg.fillText('SUMMIT SPRING', w / 2, 24);
    gg.fillStyle = '#7db8dc'; gg.font = '10px Arial'; gg.fillText('GLACIER WATER · 500 mL', w / 2, 38);
  });
  g.add(M(gCyl(0.0335, 0.0335, 0.045, 14, true), new THREE.MeshStandardMaterial({ map: lbl, roughness: 0.6 }), 0, 0.1, 0));
  return g;
});

def('can_soda', 'Soda can', {
  footprint: [0.07, 0.07], height: 0.116, rooms: 'desks, break room, floors',
}, (opts = {}) => {
  const g = new THREE.Group();
  const wrap = canvasTex('can_wrap' + (opts.v ?? 0), 256, 128, (gg, w, h) => {
    const themes = [
      { bg: '#0f6f8e', fg: '#eaf9ff', name: 'GLACIER FIZZ' },
      { bg: '#7a2436', fg: '#ffd9de', name: 'GLACIER FIZZ', sub: 'BERRY' },
    ];
    const t = themes[(opts.v ?? 0) % 2];
    const grad = gg.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, t.bg); grad.addColorStop(1, '#0a3a4a');
    gg.fillStyle = grad; gg.fillRect(0, 0, w, h);
    gg.fillStyle = 'rgba(255,255,255,0.15)';
    for (let i = 0; i < 5; i++) { gg.beginPath(); gg.arc(30 + i * 50, 96 + (i % 2) * 14, 9, 0, 7); gg.fill(); }
    gg.fillStyle = t.fg; gg.font = 'bold 25px Arial Narrow, Arial'; gg.textAlign = 'center';
    gg.fillText(t.name, w / 2, 56);
    gg.font = 'bold 13px Arial';
    gg.fillText(t.sub ?? 'CRISP · COLD · CARBONATED', w / 2, 80);
  });
  g.add(M(gCyl(0.033, 0.033, 0.1, 16, true), new THREE.MeshStandardMaterial({ map: wrap, roughness: 0.35, metalness: 0.6 }), 0, 0.058, 0));
  g.add(M(gCyl(0.033, 0.029, 0.008, 16), mat('metal_brushed'), 0, 0.004, 0));
  g.add(M(gCyl(0.029, 0.033, 0.008, 16), mat('metal_brushed'), 0, 0.112, 0));
  g.add(M(gCyl(0.028, 0.028, 0.002, 16), mat('metal_brushed'), 0, 0.115, 0));
  g.add(M(gBox(0.018, 0.002, 0.008), mat('metal_brushed'), 0, 0.117, -0.006));
  return g;
});

def('wrapper_snack', 'Snack wrapper (dropped)', {
  footprint: [0.14, 0.1], height: 0.02, rooms: 'floors, desks',
}, (opts = {}) => {
  const g = new THREE.Group();
  const r = rng(opts.seed ?? 88);
  const wrapT = canvasTex('wrapper' + (opts.v ?? 0), 96, 64, (gg, w, h) => {
    const t = [{ bg: '#2a9fb8', fg: '#fff' }, { bg: '#d94f6b', fg: '#fff3d0' }][(opts.v ?? 0) % 2];
    gg.fillStyle = t.bg; gg.fillRect(0, 0, w, h);
    gg.fillStyle = 'rgba(255,255,255,0.2)'; gg.fillRect(0, h - 18, w, 12);
    gg.fillStyle = t.fg; gg.font = 'bold 15px Arial'; gg.textAlign = 'center';
    gg.fillText('POLAR', w / 2, 26); gg.fillText('PUFFS', w / 2, 44);
  });
  const m = new THREE.MeshStandardMaterial({ map: wrapT, roughness: 0.35, metalness: 0.25, side: THREE.DoubleSide });
  // crumpled: few creased quads
  for (let i = 0; i < 3; i++) {
    g.add(label(0.11, 0.075, m, (r() - 0.5) * 0.02, 0.008 + i * 0.004, (r() - 0.5) * 0.02, {
      face: '+y', rz: r() * 3, rx: (r() - 0.5) * 0.9,
    }));
  }
  return g;
});

def('desk_organizer', 'Desk organizer', {
  footprint: [0.26, 0.14], height: 0.12, rooms: 'desks',
}, () => {
  const g = new THREE.Group();
  const body = mat('metal_dark');
  g.add(M(gBox(0.25, 0.01, 0.13), body, 0, 0.005, 0));
  // compartments: two pen wells + note slot + tray
  g.add(M(gBox(0.002, 0.1, 0.13), body, -0.124, 0.05, 0));
  g.add(M(gBox(0.002, 0.1, 0.13), body, 0.124, 0.05, 0));
  g.add(M(gBox(0.25, 0.1, 0.002), body, 0, 0.05, -0.064));
  g.add(M(gBox(0.25, 0.1, 0.002), body, 0, 0.05, 0.064));
  g.add(M(gBox(0.002, 0.1, 0.13), body, -0.03, 0.05, 0));
  g.add(M(gBox(0.002, 0.06, 0.13), body, 0.06, 0.03, 0));
  // contents
  g.add(M(gBox(0.08, 0.07, 0.11), mat('paper'), -0.078, 0.045, 0, { ry: 0.04 }));
  const r = rng(3);
  for (let i = 0; i < 3; i++) {
    const pm = new THREE.MeshStandardMaterial({ color: [0x2b6da0, 0x2c2e33, 0xc0392b][i], roughness: 0.45 });
    g.add(M(gCyl(0.0035, 0.0035, 0.13, 6), pm, 0.015 + i * 0.012, 0.07, 0, { rx: 0.3 + (r() - 0.5) * 0.2, rz: 0.12 }));
  }
  g.add(M(gBox(0.05, 0.014, 0.05), new THREE.MeshStandardMaterial({ color: 0xf2df6b, roughness: 0.85 }), 0.09, 0.017, 0.02));
  return g;
});

def('plant_pot_large', 'Large office plant (ficus)', {
  footprint: [0.75, 0.75], height: 1.45, rooms: 'lobby, corners, exec',
}, (opts = {}) => {
  const g = new THREE.Group();
  const r = rng(opts.seed ?? 57);
  // planter + soil
  g.add(M(gLathe('planter', [[0.001, 0], [0.16, 0.0], [0.21, 0.36], [0.19, 0.37], [0.145, 0.05], [0.001, 0.045]], 16), mat('plastic_gray'), 0, 0, 0));
  g.add(M(gCyl(0.185, 0.185, 0.02, 14), mat('soil'), 0, 0.335, 0));
  // trunk: 3 leaning segments
  let x = 0, z = 0, y = 0.34;
  let lean = (r() - 0.5) * 0.2;
  for (let i = 0; i < 3; i++) {
    const len = 0.32 - i * 0.04;
    const seg = M(gCyl(0.02 - i * 0.005, 0.026 - i * 0.005, len, 8), mat('wood_dark'), x, y + len / 2 - 0.01, z, { rz: lean, rx: (r() - 0.5) * 0.18 });
    g.add(seg);
    x += Math.sin(-lean) * len * 0.9;
    y += Math.cos(lean) * len * 0.92;
    lean += (r() - 0.5) * 0.3;
  }
  // canopy: layered blobs, dark green with lighter crown
  const blob = (bx, by, bz, s, m2) => {
    const b = new THREE.Mesh(G('leafblob', () => new THREE.IcosahedronGeometry(0.16, 1)), m2);
    b.position.set(bx, by, bz);
    b.scale.set(s * (0.9 + r() * 0.3), s * (0.62 + r() * 0.2), s * (0.9 + r() * 0.3));
    b.rotation.set(r() * 3, r() * 3, r() * 3);
    b.castShadow = b.receiveShadow = true;
    return b;
  };
  const dk = new THREE.MeshStandardMaterial({ color: 0x30492b, roughness: 0.95, flatShading: true });
  const md = new THREE.MeshStandardMaterial({ color: 0x3d5c35, roughness: 0.95, flatShading: true });
  const lt = new THREE.MeshStandardMaterial({ color: 0x4c7040, roughness: 0.92, flatShading: true });
  const cy = y + 0.08;
  g.add(blob(x, cy - 0.05, z, 1.5, dk));
  g.add(blob(x - 0.16, cy + 0.05, z + 0.1, 1.15, md));
  g.add(blob(x + 0.17, cy + 0.08, z - 0.06, 1.1, md));
  g.add(blob(x + 0.02, cy + 0.2, z + 0.03, 1.05, lt));
  g.add(blob(x - 0.05, cy + 0.02, z - 0.16, 0.95, md));
  setCol(g, col(0, 0, 0.42, 0.42, 0.38));
  return g;
});

def('plant_desk_small', 'Small desk plant', {
  footprint: [0.14, 0.14], height: 0.24, rooms: 'desks, windowsills',
}, (opts = {}) => {
  const g = new THREE.Group();
  const r = rng(opts.seed ?? 5);
  const potM = new THREE.MeshStandardMaterial({ color: 0xd8d0c0, roughness: 0.8 });
  g.add(M(gLathe('deskpot', [[0.001, 0], [0.04, 0.002], [0.05, 0.075], [0.044, 0.078], [0.036, 0.01], [0.001, 0.008]], 12), potM, 0, 0, 0));
  g.add(M(gCyl(0.042, 0.042, 0.01, 10), mat('soil'), 0, 0.068, 0));
  const leafM = new THREE.MeshStandardMaterial({ color: 0x4c7040, roughness: 0.9, side: THREE.DoubleSide });
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + r();
    const leaf = M(G('leafblade', () => {
      const geo = new THREE.PlaneGeometry(0.025, 0.14, 1, 3);
      geo.translate(0, 0.07, 0);
      const pos = geo.attributes.position;
      for (let v = 0; v < pos.count; v++) {
        const yy = pos.getY(v);
        pos.setZ(v, Math.sin(yy / 0.14 * Math.PI) * 0.02);
        pos.setX(v, pos.getX(v) * (1 - yy / 0.2));
      }
      geo.computeVertexNormals();
      return geo;
    }), leafM, Math.cos(a) * 0.012, 0.068, Math.sin(a) * 0.012, { ry: -a, rx: -0.35 - r() * 0.35 });
    g.add(leaf);
  }
  return g;
});

def('coat_hook_wall', 'Wall coat hooks', {
  footprint: [0.42, 0.08], height: 1.75, mount: 'wall', rooms: 'entries, offices',
}, () => {
  const g = new THREE.Group();
  const cy = 1.68;
  g.add(M(gBox(0.4, 0.07, 0.018, 0.004), mat('wood_dark'), 0, cy, -0.01));
  for (let i = 0; i < 3; i++) {
    const x = -0.13 + i * 0.13;
    g.add(M(gCyl(0.007, 0.007, 0.055, 8), mat('metal_brushed'), x, cy - 0.005, -0.045, { rx: Math.PI / 2 - 0.35 }));
    g.add(M(gSphere(0.011, 8, 6), mat('metal_brushed'), x, cy + 0.007, -0.068));
  }
  return g;
});

def('coat_jacket', 'Winter jacket (hanging)', {
  footprint: [0.55, 0.24], height: 1.75, mount: 'wall', rooms: 'coat hooks, chairs',
}, (opts = {}) => {
  const g = new THREE.Group();
  const c = [0x2e4a5c, 0x4a4a42, 0x5c2e34][(opts.v ?? 0) % 3];
  const cloth = new THREE.MeshStandardMaterial({ color: c, roughness: 0.92 });
  const topY = 1.62;
  // shoulders + hanging body (tapered)
  g.add(M(gSphere(0.09, 10, 8), cloth, 0, topY - 0.04, -0.05, { sx: 2.4, sy: 0.85, sz: 1.0 }));
  g.add(M(gCyl(0.16, 0.2, 0.75, 10), cloth, 0, topY - 0.45, -0.05, { sz: 0.55 }));
  // hood bunched at the top
  g.add(M(gSphere(0.085, 9, 7), cloth, 0, topY + 0.03, -0.07, { sy: 0.7, sz: 0.8 }));
  // sleeves hanging
  for (const s of [-1, 1]) {
    g.add(M(gCyl(0.045, 0.055, 0.62, 8), cloth, s * 0.24, topY - 0.38, -0.05, { rz: s * 0.1 }));
  }
  // zip line + wrinkle hints
  g.add(M(gBox(0.008, 0.66, 0.004), new THREE.MeshStandardMaterial({ color: 0x1c1e22, roughness: 0.5 }), 0, topY - 0.42, -0.148, { rx: -0.06 }));
  return g;
});

def('backpack', 'Backpack (leaning)', {
  footprint: [0.34, 0.24], height: 0.46, rooms: 'under desks, lockers',
}, (opts = {}) => {
  const g = new THREE.Group();
  const c = [0x2e4a5c, 0x3a3d43][(opts.v ?? 0) % 2];
  const cloth = new THREE.MeshStandardMaterial({ color: c, roughness: 0.9 });
  const body = new THREE.Group();
  body.rotation.x = -0.28;
  body.position.y = 0.014; // leaned shell corner stays on the floor
  body.add(M(gBox(0.3, 0.42, 0.16, 0.05), cloth, 0, 0.22, 0));
  body.add(M(gBox(0.24, 0.2, 0.07, 0.03), cloth, 0, 0.15, -0.1));
  // straps
  for (const s of [-1, 1]) {
    body.add(M(gBox(0.05, 0.3, 0.02, 0.008), new THREE.MeshStandardMaterial({ color: 0x1c1e22, roughness: 0.85 }), s * 0.08, 0.22, 0.09, { rx: 0.1 }));
  }
  // zipper pulls + haul loop
  body.add(M(gTorus(0.025, 0.007, 5, 10, Math.PI), cloth, 0, 0.44, 0.0));
  g.add(body);
  setCol(g, col(0, 0.02, 0.32, 0.3, 0.47));
  return g;
});

def('briefcase', 'Briefcase', {
  footprint: [0.42, 0.13], height: 0.36, rooms: 'exec office, desks',
}, () => {
  const g = new THREE.Group();
  const skin = mat('leather_black');
  g.add(M(gBox(0.42, 0.3, 0.11, 0.02), skin, 0, 0.15, 0));
  g.add(M(gBox(0.42, 0.05, 0.11, 0.015), skin, 0, 0.325, 0));
  g.add(M(gTorus(0.05, 0.011, 6, 12, Math.PI), skin, 0, 0.35, 0));
  for (const s of [-1, 1]) {
    g.add(M(gBox(0.05, 0.03, 0.012), mat('brass'), s * 0.14, 0.3, -0.06));
    g.add(M(gBox(0.36, 0.014, 0.004), mat('metal_dark'), 0, 0.3, s * 0.057));
  }
  setCol(g, col(0, 0, 0.42, 0.13, 0.38));
  return g;
});

def('umbrella', 'Umbrella (closed, wet)', {
  footprint: [0.14, 0.14], height: 0.95, rooms: 'entries, coat corners',
}, () => {
  const g = new THREE.Group();
  const skin = new THREE.MeshStandardMaterial({ color: 0x1c2a38, roughness: 0.35 });
  const lean = 0.13;
  const body = new THREE.Group();
  body.rotation.z = lean;
  body.add(M(gCyl(0.008, 0.008, 0.9, 8), mat('metal_dark'), 0, 0.45, 0));
  body.add(M(gLathe('umbrella_folds', [[0.001, 0], [0.012, 0.02], [0.03, 0.3], [0.035, 0.52], [0.012, 0.6], [0.001, 0.6]], 7), skin, 0, 0.14, 0));
  body.add(M(gTorus(0.05, 0.008, 6, 12, Math.PI * 0.9), skin, 0.045, 0.94, 0, { rz: 0.2 })); // hook handle... on top when leaning
  g.add(body);
  return g;
});

// ------------------------------------------------------------------ signage
def('sign_room', 'Room door plate', {
  footprint: [0.3, 0.03], height: 1.6, mount: 'wall', rooms: 'every door', gallery: { text: 'DISPATCH 204' },
}, (opts = {}) => {
  const g = new THREE.Group();
  const cy = 1.5;
  const text = opts.text ?? 'DISPATCH 204';
  const t = canvasTex('roomsign_' + text, 512, 160, (gg, w, h) => {
    gg.fillStyle = '#3c4147'; gg.fillRect(0, 0, w, h);
    gg.fillStyle = '#14365c'; gg.fillRect(0, 0, 92, h);
    drawStar(gg, 46, h / 2, 30);
    gg.fillStyle = '#e8f0f8'; gg.font = 'bold 52px Arial Narrow, Arial'; gg.textAlign = 'left';
    gg.fillText(text, 116, h / 2 + 18);
  });
  g.add(M(gBox(0.28, 0.088, 0.008, 0.002), mat('metal_brushed'), 0, cy, -0.005));
  g.add(label(0.27, 0.08, new THREE.MeshStandardMaterial({ map: t, roughness: 0.35 }), 0, cy, -0.01));
  return g;
});

def('sign_directional', 'Directional sign', {
  footprint: [0.62, 0.03], height: 2.1, mount: 'wall', rooms: 'corridors, lobby',
}, (opts = {}) => {
  const g = new THREE.Group();
  const cy = 1.95;
  const entries = opts.entries ?? [['RECEPTION', 'l'], ['DISPATCH FLOOR', 'r'], ['LOADING DOCK', 'r']];
  const t = canvasTex('dirsign_' + entries.map((e) => e[0]).join(','), 512, 64 * entries.length + 16, (gg, w, h) => {
    gg.fillStyle = '#14365c'; gg.fillRect(0, 0, w, h);
    gg.strokeStyle = '#2a5480'; gg.lineWidth = 2;
    entries.forEach((e, i) => {
      const y = 8 + i * 64;
      if (i > 0) { gg.beginPath(); gg.moveTo(16, y); gg.lineTo(w - 16, y); gg.stroke(); }
      gg.fillStyle = '#8fd8ff';
      const ax = e[1] === 'l' ? 40 : w - 40;
      const dir = e[1] === 'l' ? -1 : 1;
      gg.beginPath();
      gg.moveTo(ax + dir * 16, y + 32); gg.lineTo(ax - dir * 8, y + 16); gg.lineTo(ax - dir * 8, y + 48);
      gg.closePath(); gg.fill();
      gg.fillStyle = '#e8f0f8'; gg.font = 'bold 30px Arial Narrow, Arial';
      gg.textAlign = e[1] === 'l' ? 'left' : 'right';
      gg.fillText(e[0], e[1] === 'l' ? 76 : w - 76, y + 42);
    });
  });
  const hgt = 0.075 * entries.length + 0.02;
  g.add(M(gBox(0.62, hgt + 0.016, 0.014, 0.003), mat('metal_dark'), 0, cy, -0.008));
  g.add(label(0.6, hgt, new THREE.MeshStandardMaterial({ map: t, roughness: 0.4 }), 0, cy, -0.016));
  return g;
});

def('poster_safety', 'Safety poster', {
  footprint: [0.48, 0.03], height: 1.95, mount: 'wall', rooms: 'service, break room, dock', gallery: { v: 0 },
}, (opts = {}) => {
  const g = new THREE.Group();
  const v = (opts.v ?? 0) % 3;
  const t = canvasTex('poster_safety' + v, 320, 448, (gg, w, h) => {
    if (v === 0) { // lifting
      gg.fillStyle = '#e8ebee'; gg.fillRect(0, 0, w, h);
      gg.fillStyle = '#d9a323'; gg.fillRect(0, 0, w, 82);
      gg.fillStyle = '#1c1e22'; gg.font = 'bold 30px Arial'; gg.textAlign = 'center';
      gg.fillText('LIFT SMART', w / 2, 38);
      gg.font = 'bold 18px Arial'; gg.fillText('BEND YOUR KNEES — NOT YOUR BACK', w / 2, 64);
      // stick figure lifting a box correctly
      gg.strokeStyle = '#2c3540'; gg.lineWidth = 7; gg.lineCap = 'round';
      const cx = w / 2 - 30;
      gg.beginPath(); gg.arc(cx, 170, 22, 0, 7); gg.stroke();
      gg.beginPath();
      gg.moveTo(cx, 192); gg.lineTo(cx + 6, 260);         // back (upright)
      gg.moveTo(cx + 6, 260); gg.lineTo(cx - 18, 320); gg.lineTo(cx - 8, 380);  // legs bent
      gg.moveTo(cx + 6, 260); gg.lineTo(cx + 34, 316); gg.lineTo(cx + 30, 380);
      gg.moveTo(cx, 205); gg.lineTo(cx + 48, 240);        // arms to box
      gg.moveTo(cx, 222); gg.lineTo(cx + 48, 262);
      gg.stroke();
      gg.fillStyle = '#b3905f'; gg.fillRect(cx + 42, 228, 56, 48);
      gg.strokeStyle = '#8a6a42'; gg.lineWidth = 3; gg.strokeRect(cx + 42, 228, 56, 48);
      gg.fillStyle = '#3e8c4a'; gg.font = 'bold 44px Arial'; gg.fillText('✓', w / 2 + 92, 200);
      gg.fillStyle = '#5c6470'; gg.font = '15px Arial';
      gg.fillText('KEEP THE LOAD CLOSE · ASK FOR HELP OVER 20 KG', w / 2, h - 26);
    } else if (v === 1) { // winter walkways
      gg.fillStyle = '#14365c'; gg.fillRect(0, 0, w, h);
      gg.fillStyle = '#8fd8ff'; gg.font = 'bold 34px Arial'; gg.textAlign = 'center';
      gg.fillText('ICE AHEAD?', w / 2, 66);
      gg.fillStyle = '#eaf6ff'; gg.font = 'bold 22px Arial';
      gg.fillText('WALK LIKE A PENGUIN', w / 2, 102);
      // big snowflake
      gg.strokeStyle = '#8fd8ff'; gg.lineWidth = 6; gg.lineCap = 'round';
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        gg.beginPath(); gg.moveTo(w / 2, 240);
        gg.lineTo(w / 2 + Math.cos(a) * 88, 240 + Math.sin(a) * 88);
        gg.stroke();
        gg.beginPath();
        gg.moveTo(w / 2 + Math.cos(a) * 55 - Math.cos(a + 0.5) * 18, 240 + Math.sin(a) * 55 - Math.sin(a + 0.5) * 18);
        gg.lineTo(w / 2 + Math.cos(a) * 55, 240 + Math.sin(a) * 55);
        gg.lineTo(w / 2 + Math.cos(a) * 55 - Math.cos(a - 0.5) * 18, 240 + Math.sin(a) * 55 - Math.sin(a - 0.5) * 18);
        gg.stroke();
      }
      gg.fillStyle = '#eaf6ff'; gg.font = '16px Arial';
      gg.fillText('SHORT STEPS · FLAT FEET · HANDS FREE', w / 2, 380);
      gg.fillStyle = '#8fd8ff'; gg.font = 'bold 14px Arial';
      gg.fillText('REPORT UNCLEARED WALKWAYS TO FACILITIES', w / 2, h - 28);
    } else { // report suspicious activity
      gg.fillStyle = '#1c1e22'; gg.fillRect(0, 0, w, h);
      gg.fillStyle = '#e0554a'; gg.fillRect(0, 0, w, 12);
      gg.fillStyle = '#e8f0f8'; gg.font = 'bold 28px Arial'; gg.textAlign = 'center';
      gg.fillText('SEE SOMETHING?', w / 2, 66);
      gg.fillStyle = '#e0554a'; gg.font = 'bold 34px Arial';
      gg.fillText('SAY SOMETHING.', w / 2, 108);
      // eye icon
      gg.strokeStyle = '#e8f0f8'; gg.lineWidth = 6;
      gg.beginPath(); gg.ellipse(w / 2, 240, 92, 54, 0, 0, 7); gg.stroke();
      gg.fillStyle = '#8fd8ff'; gg.beginPath(); gg.arc(w / 2, 240, 30, 0, 7); gg.fill();
      gg.fillStyle = '#1c1e22'; gg.beginPath(); gg.arc(w / 2, 240, 14, 0, 7); gg.fill();
      gg.fillStyle = '#e8f0f8'; gg.font = '17px Arial';
      gg.fillText('UNBADGED VISITORS · PROPPED DOORS', w / 2, 350);
      gg.fillText('UNATTENDED BAGS', w / 2, 376);
      gg.fillStyle = '#e0554a'; gg.font = 'bold 20px Arial';
      gg.fillText('SECURITY DESK — EXT. 5-5', w / 2, h - 30);
    }
  });
  const cy = 1.6;
  g.add(M(gBox(0.47, 0.66, 0.012, 0.003), mat('plastic_black'), 0, cy, -0.007));
  g.add(label(0.44, 0.62, new THREE.MeshStandardMaterial({ map: t, roughness: 0.6 }), 0, cy, -0.014));
  return g;
});

def('poster_evac', 'Evacuation plan', {
  footprint: [0.42, 0.03], height: 1.85, mount: 'wall', rooms: 'corridors, stair lobbies',
}, () => {
  const g = new THREE.Group();
  const t = canvasTex('poster_evac', 320, 400, (gg, w, h) => {
    gg.fillStyle = '#f2f4f5'; gg.fillRect(0, 0, w, h);
    gg.fillStyle = '#3e8c4a'; gg.fillRect(0, 0, w, 56);
    gg.fillStyle = '#fff'; gg.font = 'bold 24px Arial'; gg.textAlign = 'center';
    gg.fillText('EVACUATION PLAN', w / 2, 36);
    // abstract floor plan
    gg.strokeStyle = '#2c3540'; gg.lineWidth = 4;
    gg.strokeRect(28, 84, w - 56, 220);
    gg.lineWidth = 2.5;
    const r = rng(14);
    // rooms
    gg.strokeRect(28, 84, 90, 70); gg.strokeRect(28, 154, 90, 70);
    gg.strokeRect(w - 118, 84, 90, 60); gg.strokeRect(w - 118, 144, 90, 80);
    gg.strokeRect(118, 84, 70, 46);
    // corridor route
    gg.strokeStyle = '#3e8c4a'; gg.lineWidth = 5;
    gg.beginPath(); gg.moveTo(64, 200); gg.lineTo(64, 268); gg.lineTo(240, 268); gg.lineTo(240, 304); gg.stroke();
    gg.beginPath(); gg.moveTo(150, 140); gg.lineTo(150, 268); gg.stroke();
    // arrows
    const arrow = (x, y, a) => {
      gg.save(); gg.translate(x, y); gg.rotate(a);
      gg.beginPath(); gg.moveTo(0, -10); gg.lineTo(7, 4); gg.lineTo(-7, 4); gg.closePath();
      gg.fillStyle = '#3e8c4a'; gg.fill(); gg.restore();
    };
    arrow(64, 240, Math.PI); arrow(150, 220, Math.PI); arrow(200, 268, Math.PI / 2); arrow(240, 296, Math.PI);
    // you-are-here + exits
    gg.fillStyle = '#c0392b'; gg.beginPath(); gg.arc(150, 176, 9, 0, 7); gg.fill();
    gg.fillStyle = '#fff'; gg.font = 'bold 9px Arial'; gg.fillText('YOU', 150, 179);
    gg.fillStyle = '#3e8c4a'; gg.fillRect(226, 296, 28, 10);
    gg.fillStyle = '#fff'; gg.font = 'bold 8px Arial'; gg.fillText('EXIT', 240, 304);
    // legend
    gg.fillStyle = '#2c3540'; gg.font = '13px Arial'; gg.textAlign = 'left';
    gg.fillText('● ASSEMBLY: NORTH LOT FLAGPOLE', 30, 336);
    gg.fillText('● DO NOT USE FREIGHT LIFT', 30, 356);
    gg.fillText('● WARDENS: EXT. 5-1', 30, 376);
    gg.fillStyle = '#c0392b'; gg.beginPath(); gg.arc(22, 332, 4, 0, 7); gg.fill();
  });
  const cy = 1.55;
  g.add(M(gBox(0.4, 0.52, 0.012, 0.003), mat('metal_brushed'), 0, cy, -0.007));
  g.add(label(0.37, 0.47, new THREE.MeshStandardMaterial({ map: t, roughness: 0.5 }), 0, cy, -0.014));
  return g;
});

def('decal_wet_floor_sign', 'Wet floor A-sign', {
  footprint: [0.32, 0.4], height: 0.62, rooms: 'wet floors, restrooms',
}, () => {
  const g = new THREE.Group();
  const t = canvasTex('wetfloor', 192, 320, (gg, w, h) => {
    gg.fillStyle = '#e8b93d'; gg.fillRect(0, 0, w, h);
    gg.fillStyle = '#1c1e22'; gg.font = 'bold 34px Arial'; gg.textAlign = 'center';
    gg.fillText('CAUTION', w / 2, 52);
    // slipping figure
    gg.strokeStyle = '#1c1e22'; gg.lineWidth = 8; gg.lineCap = 'round';
    gg.beginPath(); gg.arc(w / 2 + 14, 106, 16, 0, 7); gg.stroke();
    gg.beginPath();
    gg.moveTo(w / 2 + 8, 122); gg.lineTo(w / 2 - 12, 168);
    gg.moveTo(w / 2 - 12, 168); gg.lineTo(w / 2 - 44, 156);
    gg.moveTo(w / 2 - 12, 168); gg.lineTo(w / 2 + 30, 196);
    gg.moveTo(w / 2 + 8, 132); gg.lineTo(w / 2 + 44, 118);
    gg.stroke();
    gg.lineWidth = 5;
    gg.beginPath(); gg.moveTo(w / 2 - 52, 210); gg.lineTo(w / 2 + 52, 210); gg.stroke();
    gg.beginPath(); gg.moveTo(w / 2 - 40, 222); gg.lineTo(w / 2 + 40, 222); gg.stroke();
    gg.fillStyle = '#1c1e22'; gg.font = 'bold 30px Arial';
    gg.fillText('WET', w / 2, 262);
    gg.fillText('FLOOR', w / 2, 296);
  });
  const face = new THREE.MeshStandardMaterial({ map: t, roughness: 0.55 });
  const yellow = mat('paint_yellow');
  for (const s of [-1, 1]) {
    const panel = new THREE.Group();
    panel.position.set(0, 0.6, 0);
    panel.rotation.x = s * 0.3;
    panel.add(M(gBox(0.3, 0.62, 0.012, 0.004), yellow, 0, -0.31, 0));
    panel.add(label(0.27, 0.5, face, 0, -0.32, s > 0 ? 0.008 : -0.008, s > 0 ? { face: '+z' } : {}));
    g.add(panel);
  }
  g.add(M(gBox(0.26, 0.016, 0.016), yellow, 0, 0.6, 0));
  setCol(g, col(0, 0, 0.32, 0.4, 0.62));
  return g;
});

def('snow_boot_tray', 'Boot tray (melting snow)', {
  footprint: [0.72, 0.42], height: 0.28, rooms: 'staff entrance',
}, () => {
  const g = new THREE.Group();
  const tray = mat('rubber');
  g.add(M(gBox(0.7, 0.03, 0.4, 0.008), tray, 0, 0.015, 0));
  g.add(M(gBox(0.64, 0.012, 0.34), new THREE.MeshStandardMaterial({ color: 0x2c3134, roughness: 0.4, metalness: 0.1 }), 0, 0.032, 0)); // wet inner
  for (let i = 0; i < 4; i++) g.add(M(gBox(0.6, 0.008, 0.02), tray, 0, 0.036, -0.12 + i * 0.08));
  // two pairs of boots
  const bootM = new THREE.MeshStandardMaterial({ color: 0x2e2a26, roughness: 0.55 });
  const boot2M = new THREE.MeshStandardMaterial({ color: 0x4a4238, roughness: 0.7 });
  const r = rng(23);
  const boot = (x, z, m2, ry) => {
    const b = new THREE.Group();
    b.add(M(gBox(0.09, 0.07, 0.24, 0.02), m2, 0, 0.07, 0));
    b.add(M(gCyl(0.045, 0.05, 0.16, 10), m2, 0, 0.18, 0.06));
    b.add(M(gBox(0.09, 0.03, 0.26, 0.01), mat('rubber'), 0, 0.048, 0));
    // snow dusting
    b.add(M(gSphere(0.03, 7, 5), new THREE.MeshStandardMaterial({ color: 0xeef4f8, roughness: 0.95 }), 0.02, 0.1, -0.08, { sy: 0.4 }));
    b.position.set(x, 0.02, z);
    b.rotation.y = ry;
    return b;
  };
  g.add(boot(-0.22, 0.02, bootM, 0.12), boot(-0.1, -0.0, bootM, -0.06));
  g.add(boot(0.12, 0.03, boot2M, 0.35), boot(0.24, -0.02, boot2M, 0.2));
  setCol(g, col(0, 0, 0.72, 0.42, 0.28));
  return g;
});
