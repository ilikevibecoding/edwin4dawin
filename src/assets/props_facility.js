// ============================================================================
// NORTHSTAR RESCUE — prop library: facility (Fable 3)
// Break room & kitchen, restrooms, maintenance/electrical, loading & garage,
// plus the extraction cargo van. Same contract as props_office.js: origin at
// floor center, facing -Z, local-space AABB collision on solid props.
// All branding original: NLG, "FROSTBITE" vending, "POLAR PUFFS" snacks.
// ============================================================================
import * as THREE from 'three';
import {
  mat, canvasTex, texMat, textTex, drawStar, rng,
  M, G, gBox, gCyl, gSphere, gTorus, gPlane, gLathe, label,
  col, setCol, makeDef,
} from './props_office.js';

export const PROPS = {};
const def = makeDef(PROPS, import.meta.url);

// ============================================================ kitchen / break
def('kitchen_counter_run', 'Kitchen counter run', {
  footprint: [2.4, 0.65], height: 2.1, rooms: 'break room', gallery: { sink: true },
}, (opts = {}) => {
  const g = new THREE.Group();
  const L = opts.length ?? 2.4, d = 0.6, topY = 0.92;
  // kick + carcass + top
  g.add(M(gBox(L - 0.08, 0.1, d - 0.1), mat('plastic_black'), 0, 0.05, 0.05));
  g.add(M(gBox(L, topY - 0.14, d - 0.02, 0.006), mat('laminate_white'), 0, (topY - 0.14) / 2 + 0.1, 0.01));
  g.add(M(gBox(L + 0.04, 0.04, d, 0.008), mat('laminate_gray'), 0, topY - 0.02, 0));
  // door fronts + handles
  const nDoors = Math.max(2, Math.round(L / 0.55));
  const dw = (L - 0.06) / nDoors;
  for (let i = 0; i < nDoors; i++) {
    const x = -L / 2 + 0.03 + dw * (i + 0.5);
    g.add(M(gBox(dw - 0.02, 0.68, 0.018, 0.005), mat('laminate_white'), x, 0.46, -d / 2 - 0.002));
    g.add(M(gBox(0.11, 0.014, 0.02), mat('metal_brushed'), x + dw / 2 - 0.09, 0.74, -d / 2 - 0.016));
  }
  // backsplash
  g.add(M(gBox(L, 0.35, 0.02), mat('wall_tile_restroom'), 0, topY + 0.175, d / 2 - 0.01));
  // upper cabinets
  if (opts.upper ?? true) {
    const ud = 0.34;
    g.add(M(gBox(L, 0.7, ud, 0.008), mat('laminate_white'), 0, 1.45 + 0.35, d / 2 - ud / 2));
    for (let i = 0; i < nDoors; i++) {
      const x = -L / 2 + 0.03 + dw * (i + 0.5);
      g.add(M(gBox(dw - 0.02, 0.66, 0.016, 0.005), mat('laminate_white'), x, 1.8, d / 2 - ud - 0.002));
      g.add(M(gBox(0.1, 0.012, 0.018), mat('metal_brushed'), x + dw / 2 - 0.08, 1.52, d / 2 - ud - 0.014));
    }
    // under-cabinet light strip
    g.add(M(gBox(L - 0.3, 0.015, 0.04), mat('light_panel'), 0, 1.44, d / 2 - ud + 0.02));
  }
  if (opts.sink ?? false) {
    const sx = opts.sinkX ?? L / 4;
    g.add(M(gBox(0.5, 0.02, 0.42, 0.004), mat('stainless'), sx, topY + 0.006, 0));
    g.add(M(gBox(0.4, 0.16, 0.32), mat('stainless'), sx, topY - 0.08, 0));
    const inner = M(gBox(0.36, 0.15, 0.28), new THREE.MeshStandardMaterial({ color: 0x5c6468, roughness: 0.35, metalness: 0.8, side: THREE.BackSide }), sx, topY - 0.06, 0);
    inner.castShadow = false;
    g.add(inner);
    // gooseneck faucet
    g.add(M(gCyl(0.016, 0.02, 0.06, 10), mat('chrome'), sx, topY + 0.03, 0.17));
    g.add(M(gCyl(0.012, 0.012, 0.22, 8), mat('chrome'), sx, topY + 0.16, 0.17));
    g.add(M(gTorus(0.09, 0.011, 6, 12, Math.PI / 2), mat('chrome'), sx, topY + 0.27, 0.08, { ry: Math.PI / 2, rz: Math.PI / 2 }));
    g.add(M(gCyl(0.01, 0.01, 0.1, 8), mat('chrome'), sx, topY + 0.31, 0.08 + 0.0, { rx: Math.PI / 2 }));
    g.add(M(gBox(0.09, 0.016, 0.03), mat('chrome'), sx + 0.09, topY + 0.05, 0.17));
  }
  const boxes = [col(0, 0, L, 0.64, topY)];
  if (opts.upper ?? true) boxes.push(col(0, d / 2 - 0.17, L, 0.36, 0.72, 1.44));
  setCol(g, ...boxes);
  return g;
});

def('sink_kitchen', 'Kitchen sink unit', {
  footprint: [0.6, 0.62], height: 1.24, rooms: 'break room, janitor closet',
}, () => {
  const g = PROPS.kitchen_counter_run.build({ length: 0.6, sink: true, sinkX: 0, upper: false });
  g.name = 'sink_kitchen';
  return g;
});

def('fridge', 'Refrigerator', {
  footprint: [0.7, 0.72], height: 1.8, rooms: 'break room',
}, () => {
  const g = new THREE.Group();
  const w = 0.7, d = 0.68, h = 1.8;
  g.add(M(gBox(w - 0.02, 0.06, d - 0.06), mat('plastic_black'), 0, 0.03, 0.01));
  g.add(M(gBox(w, h - 0.08, d, 0.015), mat('stainless'), 0, (h - 0.08) / 2 + 0.06, 0.02));
  // doors (freezer below, fridge above) slightly proud
  g.add(M(gBox(w - 0.02, 0.62, 0.03, 0.01), mat('stainless'), 0, 0.38, -d / 2 - 0.0));
  g.add(M(gBox(w - 0.02, 1.03, 0.03, 0.01), mat('stainless'), 0, 1.22, -d / 2 - 0.0));
  // gap line + handles
  g.add(M(gBox(w - 0.02, 0.012, 0.034), mat('plastic_black'), 0, 0.705, -d / 2));
  g.add(M(gCyl(0.013, 0.013, 0.85, 8), mat('metal_brushed'), -w / 2 + 0.08, 1.24, -d / 2 - 0.045));
  g.add(M(gCyl(0.013, 0.013, 0.4, 8), mat('metal_brushed'), -w / 2 + 0.08, 0.42, -d / 2 - 0.045));
  // storytelling: pinned rota note + magnet
  const note = texMat('fridge_note', 96, 112, (gg) => {
    gg.fillStyle = '#fdf6dc'; gg.fillRect(0, 0, 96, 112);
    gg.fillStyle = '#3c4652'; gg.font = 'bold 11px Arial'; gg.fillText('CLEAN YOUR', 12, 22);
    gg.fillText('SHELF FRIDAY!', 12, 36);
    gg.fillStyle = '#7c848c'; for (let l = 0; l < 5; l++) gg.fillRect(12, 50 + l * 10, 60 - (l * 13) % 24, 4);
    gg.fillStyle = '#c0392b'; gg.font = '10px Arial'; gg.fillText('— facilities', 26, 104);
  }, { roughness: 0.9 });
  g.add(label(0.12, 0.14, note, 0.14, 1.32, -d / 2 - 0.032, { rz: -0.06 }));
  g.add(M(gCyl(0.012, 0.012, 0.008, 10), new THREE.MeshStandardMaterial({ color: 0xc0392b, roughness: 0.4 }), 0.14, 1.395, -d / 2 - 0.037, { rx: Math.PI / 2 }));
  setCol(g, col(0, 0.01, w, d + 0.04, h));
  return g;
});

def('microwave', 'Microwave', {
  footprint: [0.5, 0.36], height: 0.3, rooms: 'break room counter',
}, () => {
  const g = new THREE.Group();
  g.add(M(gBox(0.5, 0.29, 0.36, 0.012), mat('plastic_black'), 0, 0.155, 0));
  // door window + frame
  g.add(M(gBox(0.31, 0.22, 0.012, 0.004), mat('plastic_black'), -0.06, 0.16, -0.185));
  const win = texMat('micro_win', 128, 96, (gg) => {
    gg.fillStyle = '#101114'; gg.fillRect(0, 0, 128, 96);
    gg.fillStyle = 'rgba(200,220,230,0.07)';
    for (let y = 4; y < 96; y += 8) for (let x = 4; x < 128; x += 8) gg.fillRect(x, y, 4, 4);
  }, { roughness: 0.2 });
  g.add(label(0.27, 0.18, win, -0.06, 0.16, -0.194));
  g.add(M(gBox(0.014, 0.16, 0.014), mat('plastic_gray'), 0.085, 0.16, -0.19));
  // control strip
  const ctrl = texMat('micro_ctrl', 64, 128, (gg) => {
    gg.fillStyle = '#26282c'; gg.fillRect(0, 0, 64, 128);
    gg.fillStyle = '#2eff8a'; gg.fillRect(10, 10, 44, 18);
    gg.fillStyle = '#0c2a14'; gg.font = 'bold 13px monospace'; gg.fillText('0:00', 17, 24);
    gg.fillStyle = '#3a3d43';
    for (let r2 = 0; r2 < 4; r2++) for (let c = 0; c < 2; c++) gg.fillRect(10 + c * 24, 38 + r2 * 20, 18, 12);
  }, { emissive: true, emissiveIntensity: 0.4, roughness: 0.5 });
  g.add(label(0.1, 0.24, ctrl, 0.17, 0.155, -0.181));
  g.add(M(gBox(0.46, 0.012, 0.32), mat('plastic_black'), 0, 0.006, 0));
  setCol(g, col(0, 0, 0.5, 0.36, 0.3));
  return g;
});

def('coffee_machine', 'Drip coffee machine', {
  footprint: [0.26, 0.32], height: 0.38, rooms: 'break room counter',
}, () => {
  const g = new THREE.Group();
  // base + hotplate
  g.add(M(gBox(0.24, 0.035, 0.3, 0.008), mat('plastic_black'), 0, 0.018, 0));
  g.add(M(gCyl(0.085, 0.085, 0.006, 16), mat('metal_dark'), 0, 0.038, -0.06));
  // back tower + top head
  g.add(M(gBox(0.24, 0.34, 0.12, 0.01), mat('plastic_black'), 0, 0.205, 0.09));
  g.add(M(gBox(0.22, 0.075, 0.24, 0.012), mat('plastic_black'), 0, 0.335, 0.0));
  // glass pot with coffee + handle
  const potGlass = new THREE.MeshPhysicalMaterial({ color: 0xcfe4ee, transparent: true, opacity: 0.28, roughness: 0.08, metalness: 0 });
  g.add(M(gCyl(0.075, 0.06, 0.15, 16, true), potGlass, 0, 0.115, -0.06, { cast: false }));
  g.add(M(gCyl(0.073, 0.062, 0.07, 14), new THREE.MeshStandardMaterial({ color: 0x2b1a10, roughness: 0.3 }), 0, 0.078, -0.06));
  g.add(M(gTorus(0.075, 0.008, 6, 16), mat('plastic_black'), 0, 0.185, -0.06, { rx: Math.PI / 2 }));
  g.add(M(gBox(0.016, 0.09, 0.03), mat('plastic_black'), 0, 0.13, -0.145));
  // switch led
  g.add(M(gBox(0.03, 0.02, 0.008), mat('led_red'), 0.08, 0.05, -0.152));
  setCol(g, col(0, 0, 0.24, 0.31, 0.38));
  return g;
});

def('kettle', 'Electric kettle', {
  footprint: [0.2, 0.2], height: 0.24, rooms: 'break room counter',
}, () => {
  const g = new THREE.Group();
  g.add(M(gCyl(0.095, 0.1, 0.015, 18), mat('plastic_black'), 0, 0.008, 0));
  g.add(M(gLathe('kettle', [[0.001, 0.016], [0.09, 0.016], [0.095, 0.05], [0.085, 0.14], [0.06, 0.2], [0.055, 0.21], [0.0, 0.21]], 18), mat('stainless'), 0, 0, 0));
  g.add(M(gCyl(0.02, 0.03, 0.05, 10), mat('stainless'), 0, 0.19, -0.075, { rx: 0.9 })); // spout
  g.add(M(gTorus(0.055, 0.011, 6, 12, Math.PI * 0.9), mat('plastic_black'), 0, 0.16, 0.08, { ry: Math.PI / 2, rz: Math.PI / 2 - 0.3 }));
  g.add(M(gCyl(0.012, 0.012, 0.02, 8), mat('plastic_black'), 0, 0.225, 0));
  setCol(g, col(0, 0, 0.2, 0.2, 0.24));
  return g;
});

// vending machine front art (drinks or snacks)
function vendingTex(variant) {
  return canvasTex('vending_' + variant, 512, 1024, (g, w, h) => {
    const r = rng(variant === 'drinks' ? 21 : 22);
    g.fillStyle = '#1b2a38'; g.fillRect(0, 0, w, h);
    // header sign
    const grad = g.createLinearGradient(0, 0, 0, 150);
    grad.addColorStop(0, '#2a6f9e'); grad.addColorStop(1, '#14365c');
    g.fillStyle = grad; g.fillRect(18, 16, w - 36, 134);
    g.fillStyle = '#eaf6ff'; g.textAlign = 'center';
    g.font = 'bold 58px Arial, sans-serif';
    g.fillText('FROSTBITE', w / 2, 82);
    g.font = 'bold 30px Arial, sans-serif'; g.fillStyle = '#8fd8ff';
    g.fillText(variant === 'drinks' ? '· ICE COLD DRINKS ·' : '· SNACKS ·', w / 2, 126);
    // snowflake accents
    g.strokeStyle = '#8fd8ff'; g.lineWidth = 3;
    for (const sx of [52, w - 52]) {
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        g.beginPath(); g.moveTo(sx, 80); g.lineTo(sx + Math.cos(a) * 22, 80 + Math.sin(a) * 22); g.stroke();
      }
    }
    // glass window w/ product rows
    g.fillStyle = '#0d151d'; g.fillRect(26, 170, 330, 660);
    for (let row = 0; row < 5; row++) {
      const y = 200 + row * 128;
      // shelf + spiral hints
      for (let cnt = 0; cnt < 4; cnt++) {
        const x = 44 + cnt * 78;
        if (variant === 'drinks') {
          const hues = ['#3fa7d6', '#e0554a', '#e8b93d', '#7bd389', '#b06fc4'];
          g.fillStyle = hues[Math.floor(r() * hues.length)];
          g.fillRect(x, y + 22, 52, 84);
          g.fillStyle = 'rgba(255,255,255,0.25)'; g.fillRect(x + 8, y + 22, 10, 84);
          g.fillStyle = '#dfe8ec'; g.fillRect(x + 16, y + 6, 20, 16);
        } else {
          const hues = ['#d94f6b', '#e8912d', '#40b4a6', '#8fd8ff', '#c8d94f'];
          g.fillStyle = hues[Math.floor(r() * hues.length)];
          g.save(); g.translate(x + 26, y + 60); g.rotate((r() - 0.5) * 0.2);
          g.fillRect(-27, -48, 54, 96);
          g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(-27, -20, 54, 18);
          g.restore();
        }
      }
      g.fillStyle = '#3a4653'; g.fillRect(30, y + 108, 322, 6);
      g.fillStyle = '#8a97a5'; g.font = '13px monospace'; g.textAlign = 'left';
      for (let cnt = 0; cnt < 4; cnt++) g.fillText(String.fromCharCode(65 + row) + (cnt + 1), 52 + cnt * 78, y + 124);
    }
    // window sheen
    const sheen = g.createLinearGradient(26, 170, 356, 830);
    sheen.addColorStop(0, 'rgba(255,255,255,0.14)'); sheen.addColorStop(0.25, 'rgba(255,255,255,0.02)');
    sheen.addColorStop(0.6, 'rgba(255,255,255,0.1)'); sheen.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = sheen; g.fillRect(26, 170, 330, 660);
    // right control column
    g.fillStyle = '#22303d'; g.fillRect(370, 170, 122, 660);
    g.fillStyle = '#0e1620'; g.fillRect(384, 190, 94, 44); // display
    g.fillStyle = '#3dd97a'; g.font = 'bold 22px monospace'; g.fillText('1.50', 404, 220);
    for (let r2 = 0; r2 < 4; r2++) for (let c = 0; c < 3; c++) {
      g.fillStyle = '#3a4855'; g.fillRect(388 + c * 30, 250 + r2 * 30, 24, 22);
      g.fillStyle = '#9fb4c4'; g.font = '12px monospace';
      g.fillText(String(r2 * 3 + c + 1), 397 + c * 30, 265 + r2 * 30);
    }
    g.fillStyle = '#101820'; g.fillRect(388, 386, 88, 60); // coin slot area
    g.fillStyle = '#7d97ab'; g.fillRect(420, 396, 6, 28);
    g.fillStyle = '#2c3947'; g.fillRect(388, 470, 88, 130);
    // bottom flap
    g.fillStyle = '#10181f'; g.fillRect(26, 850, 330, 120);
    g.fillStyle = '#2c3947'; g.fillRect(50, 866, 282, 88);
    g.fillStyle = '#8a97a5'; g.font = 'bold 20px Arial'; g.textAlign = 'center';
    g.fillText('PUSH', 191, 916);
  });
}

def('vending_machine', 'Vending machine', {
  footprint: [0.9, 0.8], height: 1.9, rooms: 'break room, corridors', gallery: { variant: 'snacks' },
}, (opts = {}) => {
  const g = new THREE.Group();
  const w = 0.9, d = 0.8, h = 1.9;
  const variant = opts.variant ?? 'snacks';
  g.add(M(gBox(w, h - 0.06, d, 0.015), mat('metal_dark'), 0, (h - 0.06) / 2 + 0.06, 0.02));
  g.add(M(gBox(w - 0.1, 0.06, d - 0.1), mat('plastic_black'), 0, 0.03, 0.02));
  const frontM = new THREE.MeshStandardMaterial({
    map: vendingTex(variant), roughness: 0.4, metalness: 0.1,
    emissive: 0xffffff, emissiveMap: vendingTex(variant), emissiveIntensity: 0.5,
  });
  g.add(label(w - 0.08, h - 0.14, frontM, 0, h / 2 + 0.03, -d / 2 - 0.002));
  // glass pane proud over the window area
  const glassM = new THREE.MeshPhysicalMaterial({ color: 0xcfe4ee, transparent: true, opacity: 0.12, roughness: 0.06, metalness: 0 });
  g.add(M(gBox(0.53, 1.18, 0.01), glassM, -0.115, 1.05, -d / 2 - 0.012, { cast: false }));
  // pickup flap (3D)
  g.add(M(gBox(0.5, 0.16, 0.025, 0.008), mat('plastic_gray'), -0.115, 0.22, -d / 2 - 0.018));
  // side branding stripe
  const side = texMat('vending_side', 128, 512, (gg, cw, ch) => {
    gg.fillStyle = '#16344f'; gg.fillRect(0, 0, cw, ch);
    drawStar(gg, cw / 2, 110, 42);
    gg.save(); gg.translate(cw / 2 + 14, 330); gg.rotate(-Math.PI / 2);
    gg.fillStyle = '#8fd8ff'; gg.font = 'bold 40px Arial'; gg.textAlign = 'center';
    gg.fillText('FROSTBITE', 0, 14);
    gg.restore();
  }, { roughness: 0.45 });
  for (const s of [-1, 1]) g.add(label(d - 0.14, h - 0.3, side, s * (w / 2 + 0.001), h / 2 + 0.02, 0.02, { face: s > 0 ? '+x' : '-x' }));
  setCol(g, col(0, 0.02, w, d, h));
  return g;
});

def('water_cooler', 'Water cooler', {
  footprint: [0.34, 0.34], height: 1.24, rooms: 'offices, corridors',
}, () => {
  const g = new THREE.Group();
  g.add(M(gBox(0.32, 0.94, 0.32, 0.02), mat('plastic_white'), 0, 0.49, 0));
  g.add(M(gBox(0.3, 0.05, 0.3, 0.01), mat('plastic_gray'), 0, 0.975, 0));
  // taps + drip tray
  g.add(M(gBox(0.26, 0.1, 0.06), mat('plastic_gray'), 0, 0.82, -0.17));
  for (const s of [-1, 1]) {
    const tapM = new THREE.MeshStandardMaterial({ color: s < 0 ? 0x2b6da0 : 0xc0392b, roughness: 0.45 });
    g.add(M(gBox(0.035, 0.045, 0.03), tapM, s * 0.07, 0.83, -0.2));
    g.add(M(gCyl(0.008, 0.008, 0.03, 8), mat('plastic_white'), s * 0.07, 0.79, -0.19));
  }
  g.add(M(gBox(0.2, 0.02, 0.07, 0.005), mat('plastic_gray'), 0, 0.71, -0.17));
  // bottle
  const bottleM = new THREE.MeshPhysicalMaterial({ color: 0x7db8dc, transparent: true, opacity: 0.5, roughness: 0.15 });
  g.add(M(gLathe('cooler_bottle', [[0.001, 0], [0.09, 0.0], [0.13, 0.05], [0.135, 0.2], [0.12, 0.24], [0.05, 0.26], [0.045, 0.3], [0.0, 0.3]], 16), bottleM, 0, 0.99, 0, { cast: false }));
  const waterM = new THREE.MeshPhysicalMaterial({ color: 0x5aa3cc, transparent: true, opacity: 0.55, roughness: 0.1 });
  g.add(M(gCyl(0.115, 0.125, 0.13, 14), waterM, 0, 1.07, 0, { cast: false }));
  setCol(g, col(0, 0, 0.34, 0.34, 1.24));
  return g;
});

def('table_break', 'Break-room table (round)', {
  footprint: [1.1, 1.1], height: 0.74, rooms: 'break room',
}, () => {
  const g = new THREE.Group();
  g.add(M(gCyl(0.55, 0.55, 0.035, 28), mat('laminate_white'), 0, 0.7225, 0));
  g.add(M(gCyl(0.03, 0.03, 0.62, 12), mat('metal_brushed'), 0, 0.4, 0));
  g.add(M(gCyl(0.055, 0.06, 0.06, 12), mat('metal_brushed'), 0, 0.06, 0));
  g.add(M(gCyl(0.24, 0.26, 0.03, 20), mat('metal_brushed'), 0, 0.015, 0));
  setCol(g, col(0, 0, 1.1, 1.1, 0.74));
  return g;
});

def('bin_trash', 'Trash bin', {
  footprint: [0.36, 0.36], height: 0.6, rooms: 'everywhere',
}, () => {
  const g = new THREE.Group();
  g.add(M(gCyl(0.175, 0.14, 0.58, 16, true), mat('plastic_gray'), 0, 0.29, 0));
  g.add(M(gCyl(0.14, 0.14, 0.02, 16), mat('plastic_gray'), 0, 0.02, 0));
  g.add(M(gTorus(0.175, 0.012, 6, 16), mat('plastic_gray'), 0, 0.58, 0, { rx: Math.PI / 2 }));
  // liner bag folded over the rim
  const bagM = new THREE.MeshStandardMaterial({ color: 0x1c1e22, roughness: 0.6 });
  g.add(M(gCyl(0.168, 0.185, 0.09, 16, true), bagM, 0, 0.555, 0, { cast: false }));
  g.add(M(gCyl(0.166, 0.166, 0.004, 16), bagM, 0, 0.52, 0));
  setCol(g, col(0, 0, 0.36, 0.36, 0.6));
  return g;
});

def('bin_recycle', 'Recycling bin', {
  footprint: [0.4, 0.32], height: 0.55, rooms: 'break room, copy room',
}, () => {
  const g = new THREE.Group();
  const blue = new THREE.MeshStandardMaterial({ color: 0x2b6da0, roughness: 0.55 });
  g.add(M(gBox(0.4, 0.5, 0.3, 0.012), blue, 0, 0.25, 0));
  g.add(M(gBox(0.42, 0.05, 0.32, 0.01), blue, 0, 0.525, 0));
  g.add(M(gBox(0.26, 0.018, 0.2), mat('plastic_black'), 0, 0.552, 0));
  const dec = texMat('recycle_dec', 128, 128, (gg) => {
    gg.clearRect(0, 0, 128, 128);
    gg.strokeStyle = '#eaf2f8'; gg.lineWidth = 9; gg.lineCap = 'round';
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 - Math.PI / 2;
      gg.beginPath();
      gg.arc(64, 64, 34, a + 0.35, a + Math.PI * 2 / 3 - 0.25);
      gg.stroke();
      const ea = a + Math.PI * 2 / 3 - 0.25;
      const ex = 64 + Math.cos(ea) * 34, ey = 64 + Math.sin(ea) * 34;
      gg.beginPath(); gg.moveTo(ex - 8, ey - 8); gg.lineTo(ex + 6, ey); gg.lineTo(ex - 6, ey + 9); gg.closePath();
      gg.fillStyle = '#eaf2f8'; gg.fill();
    }
    gg.fillStyle = '#eaf2f8'; gg.font = 'bold 17px Arial'; gg.textAlign = 'center';
    gg.fillText('RECYCLE', 64, 118);
  }, { roughness: 0.55 });
  const d = label(0.2, 0.2, dec, 0, 0.28, -0.152);
  d.material.transparent = true;
  g.add(d);
  setCol(g, col(0, 0, 0.4, 0.32, 0.55));
  return g;
});

def('dispenser_towel', 'Paper-towel dispenser', {
  footprint: [0.29, 0.14], height: 1.5, mount: 'wall', rooms: 'restroom, kitchen',
}, () => {
  const g = new THREE.Group();
  const cy = 1.3;
  g.add(M(gBox(0.28, 0.37, 0.13, 0.015), mat('plastic_white'), 0, cy, -0.065));
  g.add(M(gBox(0.2, 0.02, 0.1), mat('plastic_gray'), 0, cy - 0.19, -0.06));
  g.add(M(gBox(0.14, 0.05, 0.003), mat('paper'), 0, cy - 0.21, -0.06, { rx: 0.15 }));
  const lbl = textTex('towel', 'PULL DOWN WITH BOTH HANDS', { w: 256, h: 32, bg: '#e9eae8', fg: '#7d838a', font: '13px Arial' });
  g.add(label(0.16, 0.02, new THREE.MeshStandardMaterial({ map: lbl, roughness: 0.7 }), 0, cy + 0.1, -0.132));
  setCol(g, col(0, -0.065, 0.28, 0.13, 0.44, cy - 0.24));
  return g;
});

def('dispenser_soap', 'Soap dispenser', {
  footprint: [0.12, 0.12], height: 1.25, mount: 'wall', rooms: 'restroom, kitchen',
}, () => {
  const g = new THREE.Group();
  const cy = 1.12;
  g.add(M(gBox(0.11, 0.17, 0.09, 0.012), mat('plastic_white'), 0, cy, -0.048));
  const soapM = new THREE.MeshPhysicalMaterial({ color: 0x9fd0e8, transparent: true, opacity: 0.6, roughness: 0.3 });
  g.add(M(gBox(0.07, 0.09, 0.02), soapM, 0, cy + 0.015, -0.092, { cast: false }));
  g.add(M(gBox(0.08, 0.03, 0.05, 0.008), mat('plastic_gray'), 0, cy - 0.1, -0.055));
  return g;
});

def('notice_board', 'Staff notice board', {
  footprint: [1.2, 0.08], height: 1.95, mount: 'wall', rooms: 'break room, corridor',
}, () => {
  const g = new THREE.Group();
  const cy = 1.45;
  g.add(M(gBox(1.2, 0.9, 0.03, 0.006), mat('metal_brushed'), 0, cy, -0.02));
  const felt = texMat('nb_felt', 256, 192, (gg, w, h) => {
    gg.fillStyle = '#5d6672'; gg.fillRect(0, 0, w, h);
    const r = rng(6);
    for (let i = 0; i < 1800; i++) {
      gg.fillStyle = r() > 0.5 ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)';
      gg.fillRect(r() * w, r() * h, 1.5, 1.5);
    }
  }, { roughness: 0.95 });
  g.add(label(1.12, 0.82, felt, 0, cy, -0.037));
  const hdr = textTex('nb_hdr', 'NLG STAFF NOTICES', { w: 512, h: 56, bg: '#14365c', fg: '#8fd8ff', font: 'bold 30px Arial' });
  g.add(label(0.7, 0.08, new THREE.MeshStandardMaterial({ map: hdr, roughness: 0.5 }), 0, cy + 0.33, -0.04));
  const r = rng(12);
  const sheet = (i) => texMat('nb_sheet' + i, 96, 128, (gg) => {
    gg.fillStyle = ['#ffffff', '#eef3f8', '#fdf6dc'][i % 3]; gg.fillRect(0, 0, 96, 128);
    gg.fillStyle = '#14365c'; gg.font = 'bold 10px Arial';
    gg.fillText(['WINTER SHIFT PLAN', 'DOCK SAFETY MEMO', 'IT: PASSWORD RESET', 'FIRST AID TRAINING', 'LOST: BLUE SCARF'][i % 5], 6, 15);
    gg.fillStyle = '#8a97a5';
    for (let l = 0; l < 9; l++) gg.fillRect(6, 26 + l * 10, 70 - ((i * 17 + l * 23) % 30), 4);
  }, { roughness: 0.85 });
  for (let i = 0; i < 5; i++) {
    const x = -0.42 + (i % 3) * 0.42 + (r() - 0.5) * 0.05;
    const y = cy + 0.1 - Math.floor(i / 3) * 0.36 + (r() - 0.5) * 0.04;
    g.add(label(0.15, 0.2, sheet(i), x, y, -0.043, { rz: (r() - 0.5) * 0.16 }));
  }
  return g;
});

def('mug', 'Coffee mug', {
  footprint: [0.12, 0.09], height: 0.1, rooms: 'desks, break room',
}, (opts = {}) => {
  const g = new THREE.Group();
  const colors = { navy: 0x1a3a5c, red: 0x9e3c34, white: 0xf0efe9, green: 0x3e5c46 };
  const c = colors[opts.color ?? 'navy'] ?? colors.navy;
  const bodyM = new THREE.MeshStandardMaterial({ color: c, roughness: 0.25 });
  g.add(M(gLathe('mug', [[0.001, 0.002], [0.04, 0.002], [0.044, 0.012], [0.044, 0.1], [0.038, 0.1], [0.038, 0.02], [0.001, 0.02]], 16), bodyM, 0, 0, 0));
  g.add(M(gTorus(0.026, 0.007, 6, 12, Math.PI * 1.5), bodyM, -0.048, 0.055, 0, { rz: Math.PI / 4 + Math.PI / 2 }));
  if (opts.coffee ?? true) {
    g.add(M(gCyl(0.036, 0.036, 0.004, 14), new THREE.MeshStandardMaterial({ color: 0x2b1a10, roughness: 0.25 }), 0, 0.075, 0));
  }
  return g;
});

def('cup_paper', 'Paper cup', {
  footprint: [0.08, 0.08], height: 0.11, rooms: 'break room, water cooler',
}, () => {
  const g = new THREE.Group();
  const band = canvasTex('cup_band', 256, 64, (gg, w, h) => {
    gg.fillStyle = '#f0efe9'; gg.fillRect(0, 0, w, h);
    gg.fillStyle = '#7a5c40';
    gg.font = 'bold 20px Arial'; gg.textAlign = 'center';
    gg.fillText('TUNDRA ROAST', w / 2, 30);
    gg.fillStyle = '#b8a992'; gg.font = '11px Arial';
    gg.fillText('· FRESH BREWED ·', w / 2, 48);
  });
  const m = new THREE.MeshStandardMaterial({ map: band, roughness: 0.8 });
  g.add(M(gCyl(0.04, 0.03, 0.105, 16, true), m, 0, 0.0525, 0));
  g.add(M(gCyl(0.03, 0.03, 0.004, 14), mat('paper'), 0, 0.004, 0));
  g.add(M(gTorus(0.04, 0.0035, 5, 14), mat('paper'), 0, 0.105, 0, { rx: Math.PI / 2 }));
  return g;
});

def('plate_stack', 'Plate stack', {
  footprint: [0.22, 0.22], height: 0.09, rooms: 'break room',
}, () => {
  const g = new THREE.Group();
  const r = rng(9);
  for (let i = 0; i < 4; i++) {
    const p = M(gLathe('plate', [[0.001, 0], [0.06, 0.0], [0.1, 0.012], [0.105, 0.02], [0.1, 0.02], [0.058, 0.01], [0.001, 0.008]], 20), mat('ceramic'), (r() - 0.5) * 0.008, i * 0.021, (r() - 0.5) * 0.008, { ry: r() * 3 });
    g.add(p);
  }
  return g;
});

def('food_container', 'Food container', {
  footprint: [0.17, 0.12], height: 0.08, rooms: 'break room, fridge',
}, () => {
  const g = new THREE.Group();
  const tub = new THREE.MeshPhysicalMaterial({ color: 0xe8f0f2, transparent: true, opacity: 0.5, roughness: 0.25 });
  g.add(M(gBox(0.16, 0.06, 0.11, 0.008), tub, 0, 0.032, 0, { cast: false }));
  const blue = new THREE.MeshStandardMaterial({ color: 0x2b6da0, roughness: 0.5 });
  g.add(M(gBox(0.17, 0.014, 0.12, 0.006), blue, 0, 0.069, 0));
  return g;
});

function snackTex(i) {
  return canvasTex('snack' + i, 128, 160, (g, w, h) => {
    const themes = [
      { bg: '#2a9fb8', fg: '#ffffff', name: 'POLAR', sub: 'PUFFS' },
      { bg: '#d94f6b', fg: '#fff3d0', name: 'AURORA', sub: 'CRISPS' },
      { bg: '#e8912d', fg: '#3a2410', name: 'YETI', sub: 'BITES' },
    ];
    const t = themes[i % 3];
    g.fillStyle = t.bg; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(255,255,255,0.22)';
    g.beginPath(); g.ellipse(w / 2, h * 0.62, 42, 30, 0.2, 0, 7); g.fill();
    g.fillStyle = t.fg; g.textAlign = 'center';
    g.font = 'bold 26px Arial'; g.fillText(t.name, w / 2, 42);
    g.font = 'bold 20px Arial'; g.fillText(t.sub, w / 2, 66);
    g.strokeStyle = t.fg; g.lineWidth = 2;
    g.strokeRect(8, 8, w - 16, h - 16);
    g.font = '11px Arial'; g.fillText('NET 45 g', w / 2, h - 16);
  });
}

def('snack_box', 'Snack box (open tray)', {
  footprint: [0.24, 0.16], height: 0.14, rooms: 'break room, vending area',
}, () => {
  const g = new THREE.Group();
  // open cardboard tray
  g.add(M(gBox(0.22, 0.012, 0.15), mat('cardboard'), 0, 0.006, 0));
  for (const s of [-1, 1]) {
    g.add(M(gBox(0.22, 0.06, 0.008), mat('cardboard'), 0, 0.036, s * 0.071));
    g.add(M(gBox(0.008, 0.06, 0.15), mat('cardboard'), s * 0.106, 0.036, 0));
  }
  const r = rng(5);
  for (let i = 0; i < 5; i++) {
    const m = new THREE.MeshStandardMaterial({ map: snackTex(i), roughness: 0.5 });
    const pack = M(gBox(0.055, 0.11, 0.02), m, -0.07 + i * 0.036, 0.062, (r() - 0.5) * 0.02, { rx: 0.25 + (r() - 0.3) * 0.12, ry: (r() - 0.5) * 0.2 });
    g.add(pack);
  }
  return g;
});

// ================================================================== restroom
def('sink_vanity', 'Restroom vanity (2 basins + mirror)', {
  footprint: [1.4, 0.56], height: 2.0, rooms: 'restrooms',
}, () => {
  const g = new THREE.Group();
  const topY = 0.84;
  g.add(M(gBox(1.4, 0.04, 0.55, 0.008), mat('laminate_gray'), 0, topY - 0.02, 0));
  g.add(M(gBox(1.4, 0.14, 0.05), mat('laminate_gray'), 0, topY - 0.11, -0.25));
  g.add(M(gBox(1.36, 0.6, 0.44), mat('laminate_white'), 0, topY - 0.36, 0.03));
  g.add(M(gBox(1.4, 0.09, 0.02), mat('laminate_gray'), 0, topY + 0.045, 0.264)); // backsplash
  for (const s of [-1, 1]) {
    const bx = s * 0.35;
    // basin: shallow lathe bowl sunk into the top
    g.add(M(gLathe('basin', [[0.001, 0.0], [0.1, 0.005], [0.15, 0.05], [0.16, 0.075], [0.145, 0.075], [0.095, 0.02], [0.001, 0.012]], 18), mat('ceramic'), bx, topY - 0.07, -0.02));
    // faucet
    g.add(M(gCyl(0.014, 0.018, 0.09, 10), mat('chrome'), bx, topY + 0.04, 0.17));
    g.add(M(gCyl(0.011, 0.011, 0.14, 8), mat('chrome'), bx, topY + 0.09, 0.1, { rx: Math.PI / 2 - 0.25 }));
    g.add(M(gBox(0.05, 0.012, 0.02), mat('chrome'), bx, topY + 0.095, 0.17));
    // drain
    g.add(M(gCyl(0.012, 0.012, 0.004, 10), mat('metal_brushed'), bx, topY - 0.058, -0.02));
  }
  // mirror over the vanity
  g.add(M(gBox(1.3, 0.76, 0.02, 0.005), mat('metal_brushed'), 0, 1.6, 0.27));
  g.add(label(1.24, 0.7, mat('mirror'), 0, 1.6, 0.258));
  setCol(g, col(0, 0.03, 1.4, 0.56, topY));
  return g;
});

function buildToilet() {
  const t = new THREE.Group();
  // pedestal + bowl + seat + tank
  t.add(M(gLathe('toilet_ped', [[0.001, 0], [0.13, 0], [0.15, 0.05], [0.11, 0.2], [0.13, 0.32], [0.16, 0.38], [0.001, 0.38]], 14), mat('ceramic'), 0, 0, 0.02, { sz: 1.25 }));
  t.add(M(gCyl(0.19, 0.16, 0.06, 16), mat('ceramic'), 0, 0.38, -0.03, { sz: 1.3 }));
  const seatM = new THREE.MeshStandardMaterial({ color: 0xf4f4f0, roughness: 0.35 });
  t.add(M(gCyl(0.195, 0.195, 0.018, 16), seatM, 0, 0.42, -0.03, { sz: 1.3 }));
  t.add(M(gBox(0.36, 0.5, 0.16, 0.02), mat('ceramic'), 0, 0.45, 0.23));
  t.add(M(gBox(0.3, 0.04, 0.1, 0.01), mat('metal_brushed'), 0.0, 0.72, 0.23));
  return t;
}

def('toilet_stall', 'Toilet stall', {
  footprint: [1.0, 1.55], height: 2.05, rooms: 'restrooms', gallery: { doorAngle: 0.9 },
}, (opts = {}) => {
  const g = new THREE.Group();
  const w = 1.0, dpt = 1.5, h = 1.95;
  // side partitions (floor-raised)
  for (const s of [-1, 1]) {
    g.add(M(gBox(0.03, h - 0.35, dpt, 0.006), mat('laminate_gray'), s * (w / 2 - 0.015), 0.3 + (h - 0.35) / 2, 0.03));
    g.add(M(gCyl(0.014, 0.014, 0.3, 8), mat('chrome'), s * (w / 2 - 0.015), 0.15, -0.5));
    g.add(M(gCyl(0.014, 0.014, 0.3, 8), mat('chrome'), s * (w / 2 - 0.015), 0.15, 0.5));
  }
  // front: hinge stile + door leaf (opens outward, -Z)
  const stileX = -w / 2 + 0.09;
  g.add(M(gBox(0.15, h - 0.35, 0.03, 0.006), mat('laminate_gray'), w / 2 - 0.075, 0.3 + (h - 0.35) / 2, -dpt / 2 + 0.015));
  const door = new THREE.Group();
  door.position.set(stileX, 0, -dpt / 2 + 0.015);
  door.rotation.y = -(opts.doorAngle ?? 0);
  const leaf = M(gBox(0.62, h - 0.4, 0.028, 0.006), mat('laminate_gray'), 0.335, 0.325 + (h - 0.4) / 2, 0);
  door.add(leaf);
  door.add(M(gBox(0.06, 0.05, 0.04), mat('metal_brushed'), 0.6, 1.05, 0.0)); // latch
  door.add(M(gTorus(0.025, 0.006, 6, 10, Math.PI), mat('chrome'), 0.335, 1.7, 0.02, { rx: -0.3 })); // coat hook
  g.add(door);
  // occupied sign strip on top edge? keep clean. toilet inside:
  const toilet = buildToilet();
  toilet.position.set(0.02, 0, 0.38);
  g.add(toilet);
  // TP holder
  g.add(M(gCyl(0.055, 0.055, 0.04, 12), mat('paper'), -w / 2 + 0.06, 0.65, 0.25, { rz: Math.PI / 2 }));
  g.add(M(gBox(0.02, 0.12, 0.12), mat('metal_brushed'), -w / 2 + 0.025, 0.66, 0.25));
  const boxes = [
    col(-w / 2 + 0.015, 0.03, 0.03, dpt, h),
    col(w / 2 - 0.015, 0.03, 0.03, dpt, h),
    col(0.02, 0.45, 0.44, 0.75, 0.8),
  ];
  if ((opts.doorAngle ?? 0) < 0.35) boxes.push(col(stileX + 0.335, -dpt / 2 + 0.015, 0.67, 0.03, h));
  setCol(g, ...boxes);
  return g;
});

def('urinal', 'Urinal', {
  footprint: [0.38, 0.35], height: 1.3, mount: 'wall', rooms: 'restrooms',
}, () => {
  const g = new THREE.Group();
  // ceramic shell: extruded side profile (back against wall at +Z=0)
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.lineTo(-0.06, 0.0);
  shape.quadraticCurveTo(-0.3, 0.02, -0.29, 0.14);
  shape.lineTo(-0.26, 0.4);
  shape.quadraticCurveTo(-0.24, 0.56, -0.1, 0.6);
  shape.lineTo(0, 0.62);
  shape.closePath();
  const geo = G('urinal_shell', () => {
    // profile drawn with -x = depth; rotate so the body protrudes toward -Z
    // (front convention) and the flat back sits on the wall plane at z=0
    const eg = new THREE.ExtrudeGeometry(shape, { depth: 0.3, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 2, curveSegments: 8 });
    eg.rotateY(-Math.PI / 2);
    eg.translate(0.15, 0, 0);
    return eg;
  });
  const shell = new THREE.Mesh(geo, mat('ceramic'));
  shell.position.set(0, 0.52, -0.0);
  shell.castShadow = shell.receiveShadow = true;
  g.add(shell);
  // dark bowl recess laid on the sloped front face
  g.add(M(gBox(0.22, 0.42, 0.05, 0.02), new THREE.MeshStandardMaterial({ color: 0xd7dcd8, roughness: 0.3 }), 0, 0.85, -0.235, { rx: 0.22 }));
  // flush valve
  g.add(M(gCyl(0.016, 0.016, 0.22, 8), mat('chrome'), 0, 1.26, -0.06));
  g.add(M(gBox(0.05, 0.06, 0.05, 0.01), mat('chrome'), 0, 1.2, -0.06));
  g.add(M(gBox(0.09, 0.02, 0.03), mat('chrome'), 0.05, 1.21, -0.06));
  setCol(g, col(0, -0.16, 0.38, 0.34, 1.1, 0.3));
  return g;
});

def('hand_dryer', 'Hand dryer', {
  footprint: [0.26, 0.18], height: 1.3, mount: 'wall', rooms: 'restrooms',
}, () => {
  const g = new THREE.Group();
  const cy = 1.15;
  g.add(M(gBox(0.25, 0.3, 0.16, 0.02), mat('metal_brushed'), 0, cy, -0.08));
  g.add(M(gBox(0.18, 0.05, 0.1, 0.01), mat('metal_dark'), 0, cy - 0.155, -0.075, { rx: 0.3 }));
  g.add(M(gCyl(0.006, 0.006, 0.004, 8), mat('led_green'), 0.08, cy - 0.1, -0.163, { rx: Math.PI / 2 }));
  const lbl = textTex('dryer', 'AIRSTREAM 2000', { w: 192, h: 32, bg: '#9aa1a7', fg: '#3c4147', font: 'bold 15px Arial' });
  g.add(label(0.12, 0.02, new THREE.MeshStandardMaterial({ map: lbl, roughness: 0.4, metalness: 0.5 }), 0, cy + 0.09, -0.162));
  setCol(g, col(0, -0.09, 0.25, 0.18, 0.38, cy - 0.2));
  return g;
});

def('mirror_panel', 'Mirror panel', {
  footprint: [0.62, 0.05], height: 1.95, mount: 'wall', rooms: 'restrooms, gym-corner',
}, () => {
  const g = new THREE.Group();
  const cy = 1.5;
  g.add(M(gBox(0.62, 0.92, 0.018, 0.004), mat('metal_brushed'), 0, cy, -0.012));
  g.add(label(0.58, 0.88, mat('mirror'), 0, cy, -0.023));
  for (const sy of [-1, 1]) for (const sx of [-1, 1]) {
    g.add(M(gBox(0.03, 0.012, 0.008), mat('chrome'), sx * 0.24, cy + sy * 0.44, -0.026));
  }
  return g;
});

// ====================================================== maintenance/electrical
function hazardTex(id, text, sub) {
  return canvasTex('hz_' + id, 256, 160, (g, w, h) => {
    g.fillStyle = '#e8b93d'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#1c1e22'; g.fillRect(0, 0, w, 34);
    g.fillStyle = '#e8b93d'; g.font = 'bold 22px Arial'; g.textAlign = 'center';
    g.fillText(text, w / 2, 25);
    g.fillStyle = '#1c1e22';
    g.beginPath(); g.moveTo(44, 128); g.lineTo(76, 70); g.lineTo(108, 128); g.closePath(); g.fill();
    g.fillStyle = '#e8b93d'; g.font = 'bold 40px Arial';
    g.fillText('⚡', 76, 120);
    g.fillStyle = '#1c1e22'; g.font = 'bold 15px Arial'; g.textAlign = 'left';
    const words = sub.split(' ');
    g.fillText(words.slice(0, 3).join(' '), 124, 84);
    g.fillText(words.slice(3).join(' '), 124, 106);
  });
}

def('panel_electrical', 'Electrical breaker panel', {
  footprint: [0.5, 0.16], height: 2.4, mount: 'wall', rooms: 'electrical room, service corridor',
}, () => {
  const g = new THREE.Group();
  const cy = 1.35;
  g.add(M(gBox(0.5, 0.7, 0.13, 0.01), mat('metal_beige'), 0, cy, -0.068));
  g.add(M(gBox(0.42, 0.6, 0.02, 0.005), mat('metal_beige'), 0, cy, -0.136));
  g.add(M(gBox(0.03, 0.06, 0.02), mat('metal_dark'), 0.16, cy, -0.145));
  // louver slots
  for (let i = 0; i < 5; i++) g.add(M(gBox(0.3, 0.012, 0.006), mat('metal_dark'), 0, cy - 0.22 + i * 0.028, -0.148));
  const hz = new THREE.MeshStandardMaterial({ map: hazardTex('panel', 'DANGER — 480 V', 'MAIN DISTRIBUTION PANEL MDP-1'), roughness: 0.6 });
  g.add(label(0.3, 0.19, hz, 0, cy + 0.14, -0.148));
  // conduit stubs
  for (const [x, up] of [[-0.15, true], [0.05, true], [0.15, false]]) {
    const len = up ? 2.4 - (cy + 0.35) : cy - 0.35;
    g.add(M(gCyl(0.02, 0.02, len, 8), mat('metal_beige'), x, up ? cy + 0.35 + len / 2 : len / 2, -0.05));
    g.add(M(gCyl(0.028, 0.028, 0.03, 8), mat('metal_beige'), x, up ? cy + 0.36 : cy - 0.36, -0.05));
  }
  setCol(g, col(0, -0.08, 0.5, 0.16, 0.75, cy - 0.375));
  return g;
});

def('transformer_cab', 'Utility transformer cabinet', {
  footprint: [0.8, 0.62], height: 1.5, rooms: 'electrical room',
}, () => {
  const g = new THREE.Group();
  const w = 0.8, d = 0.6, h = 1.5;
  g.add(M(gBox(w, h - 0.06, d, 0.012), mat('metal_beige'), 0, (h - 0.06) / 2 + 0.06, 0));
  g.add(M(gBox(w - 0.06, 0.06, d - 0.06), mat('metal_dark'), 0, 0.03, 0));
  // louvered vent field
  const vents = texMat('tx_vents', 128, 128, (gg) => {
    gg.fillStyle = '#c7c0ae'; gg.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 10; i++) {
      gg.fillStyle = '#8f8875'; gg.fillRect(12, 10 + i * 12, 104, 5);
      gg.fillStyle = '#5c5748'; gg.fillRect(12, 14 + i * 12, 104, 2);
    }
  }, { roughness: 0.55, metalness: 0.4 });
  g.add(label(0.5, 0.5, vents, 0, 0.9, -d / 2 - 0.002));
  // chevron hazard base band
  const chev = canvasTex('chevband', 128, 32, (gg, cw, ch) => {
    gg.fillStyle = '#e8b93d'; gg.fillRect(0, 0, cw, ch);
    gg.fillStyle = '#1c1e22';
    for (let x = -32; x < cw + 32; x += 32) {
      gg.beginPath(); gg.moveTo(x, ch); gg.lineTo(x + 16, 0); gg.lineTo(x + 32, 0); gg.lineTo(x + 16, ch); gg.closePath(); gg.fill();
    }
  }, { repeat: true });
  chev.repeat.set(3, 1);
  g.add(label(w - 0.04, 0.1, new THREE.MeshStandardMaterial({ map: chev, roughness: 0.6 }), 0, 0.15, -d / 2 - 0.004));
  const hz = new THREE.MeshStandardMaterial({ map: hazardTex('tx', 'DANGER — HIGH VOLTAGE', 'DRY-TYPE TRANSFORMER TX-2'), roughness: 0.6 });
  g.add(label(0.32, 0.2, hz, 0, 1.28, -d / 2 - 0.003));
  // lifting eyes + bolts
  for (const s of [-1, 1]) g.add(M(gTorus(0.025, 0.008, 6, 10), mat('metal_dark'), s * 0.3, h - 0.03, 0, { rx: 0 }));
  setCol(g, col(0, 0, w, d, h));
  return g;
});

def('pipe_run', 'Pipe segment (1 m)', {
  footprint: [1.0, 0.2], height: 2.5, mount: 'ceiling', rooms: 'service, utility', gallery: { elbow: true },
}, (opts = {}) => {
  const g = new THREE.Group();
  const rad = (opts.d ?? 0.15) / 2;
  const y = opts.y ?? 2.3;
  const pipeM = mat(opts.mat ?? 'metal_beige');
  g.add(M(gCyl(rad, rad, 1.0, 14), pipeM, 0, y, 0, { rz: Math.PI / 2 }));
  // flange couplings
  g.add(M(gCyl(rad * 1.3, rad * 1.3, 0.03, 14), pipeM, -0.42, y, 0, { rz: Math.PI / 2 }));
  if (opts.elbow) {
    g.add(M(gTorus(rad * 1.6, rad, 10, 8, Math.PI / 2), pipeM, 0.5, y - rad * 1.6, 0, { ry: 0, rz: 0 }));
    g.add(M(gCyl(rad, rad, 0.4, 14), pipeM, 0.5 + rad * 1.6, y - rad * 1.6 - 0.2 - 0.0, 0));
  } else {
    g.add(M(gCyl(rad * 1.3, rad * 1.3, 0.03, 14), pipeM, 0.42, y, 0, { rz: Math.PI / 2 }));
  }
  // hanger strap
  g.add(M(gBox(0.03, 2.5 - y - rad, 0.008), mat('metal_brushed'), -0.15, y + rad + (2.5 - y - rad) / 2, 0));
  g.add(M(gTorus(rad + 0.01, 0.008, 6, 12, Math.PI), mat('metal_brushed'), -0.15, y, 0, { rz: Math.PI }));
  return g;
});

def('valve_wheel', 'Riser valve', {
  footprint: [0.26, 0.26], height: 1.2, rooms: 'utility, sprinkler riser',
}, () => {
  const g = new THREE.Group();
  const red = mat('paint_red');
  g.add(M(gCyl(0.07, 0.08, 0.02, 12), mat('metal_dark'), 0, 0.01, 0));
  g.add(M(gCyl(0.045, 0.045, 1.0, 12), red, 0, 0.52, 0));
  g.add(M(gCyl(0.06, 0.06, 0.05, 12), red, 0, 1.03, 0));
  // handwheel
  const wheel = new THREE.Group();
  wheel.position.y = 1.09;
  wheel.add(M(gTorus(0.095, 0.013, 8, 18), red, 0, 0, 0, { rx: Math.PI / 2 }));
  for (let i = 0; i < 3; i++) {
    wheel.add(M(gCyl(0.008, 0.008, 0.19, 6), red, 0, 0, 0, { rz: Math.PI / 2, ry: (i / 3) * Math.PI }));
  }
  wheel.add(M(gCyl(0.02, 0.02, 0.05, 8), mat('metal_dark'), 0, 0.0, 0));
  g.add(wheel);
  // side branch + gauge
  g.add(M(gCyl(0.03, 0.03, 0.18, 8), red, 0.09, 0.8, 0, { rz: Math.PI / 2 }));
  g.add(M(gCyl(0.04, 0.04, 0.025, 12), mat('metal_brushed'), 0.19, 0.8, 0, { rz: Math.PI / 2 }));
  const tag = textTex('valve_tag', 'SPRINKLER RISER — DO NOT CLOSE', { w: 256, h: 40, bg: '#c0392b', fg: '#fff', font: 'bold 15px Arial' });
  g.add(label(0.16, 0.026, new THREE.MeshStandardMaterial({ map: tag, roughness: 0.6 }), 0, 0.62, -0.047));
  setCol(g, col(0, 0, 0.26, 0.26, 1.2));
  return g;
});

def('hvac_unit', 'HVAC ceiling cassette', {
  footprint: [0.9, 0.9], height: 2.6, mount: 'ceiling', rooms: 'offices, corridors',
}, (opts = {}) => {
  const g = new THREE.Group();
  const y = opts.ceilY ?? 2.6;
  g.add(M(gBox(0.84, 0.3, 0.84, 0.02), mat('metal_beige'), 0, y - 0.15, 0));
  const face = texMat('hvac_face', 256, 256, (gg) => {
    gg.fillStyle = '#e9eae8'; gg.fillRect(0, 0, 256, 256);
    gg.fillStyle = '#c9ccc8'; gg.fillRect(78, 78, 100, 100);
    gg.fillStyle = '#5c6064';
    for (let i = 0; i < 8; i++) gg.fillRect(84, 84 + i * 12, 88, 5);
    // corner vanes
    gg.fillStyle = '#b9bcb8';
    gg.fillRect(16, 16, 224, 20); gg.fillRect(16, 220, 224, 20);
    gg.fillRect(16, 16, 20, 224); gg.fillRect(220, 16, 20, 224);
    gg.fillStyle = '#8a8d89';
    gg.fillRect(20, 22, 216, 4); gg.fillRect(20, 230, 216, 4);
  }, { roughness: 0.6 });
  const f = label(0.9, 0.9, face, 0, y - 0.305, 0, { face: '+y' });
  f.rotation.x = Math.PI / 2; // face downward
  g.add(f);
  return g;
});

def('duct_run', 'Duct segment (1 m)', {
  footprint: [1.0, 0.55], height: 2.6, mount: 'ceiling', rooms: 'service corridor, utility',
}, (opts = {}) => {
  const g = new THREE.Group();
  const y = opts.y ?? 2.3;
  const galv = mat('metal_brushed');
  g.add(M(gBox(1.0, 0.3, 0.5, 0.01), galv, 0, y, 0));
  for (const s of [-1, 1]) {
    g.add(M(gBox(0.03, 0.34, 0.54), galv, s * 0.485, y, 0));
  }
  // hanger straps to ceiling
  for (const s of [-1, 1]) {
    g.add(M(gBox(0.03, 2.6 - y - 0.15, 0.008), galv, s * 0.3, y + 0.15 + (2.6 - y - 0.15) / 2, 0.2));
    g.add(M(gBox(0.03, 2.6 - y - 0.15, 0.008), galv, s * 0.3, y + 0.15 + (2.6 - y - 0.15) / 2, -0.2));
    g.add(M(gBox(0.03, 0.008, 0.51), galv, s * 0.3, y - 0.157, 0));
  }
  return g;
});

def('fire_extinguisher', 'Fire extinguisher + bracket', {
  footprint: [0.2, 0.2], height: 1.3, mount: 'wall', rooms: 'corridors, kitchen, garage',
}, () => {
  const g = new THREE.Group();
  const cy = 0.95;
  const red = mat('paint_red');
  // wall bracket
  g.add(M(gBox(0.06, 0.3, 0.02), mat('metal_dark'), 0, cy, -0.02));
  g.add(M(gBox(0.14, 0.03, 0.1), mat('metal_dark'), 0, cy - 0.1, -0.08));
  // tank
  g.add(M(gCyl(0.075, 0.075, 0.42, 14), red, 0, cy, -0.1));
  g.add(M(gSphere(0.075, 14, 8), red, 0, cy + 0.21, -0.1, { sy: 0.5 }));
  g.add(M(gCyl(0.02, 0.02, 0.06, 8), mat('metal_brushed'), 0, cy + 0.26, -0.1));
  // lever handles + pin
  g.add(M(gBox(0.024, 0.014, 0.14), mat('metal_brushed'), 0, cy + 0.3, -0.14));
  g.add(M(gBox(0.024, 0.012, 0.12), mat('metal_brushed'), 0, cy + 0.325, -0.13, { rx: 0.25 }));
  // hose loop
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.02, cy + 0.26, -0.14),
    new THREE.Vector3(0.09, cy + 0.1, -0.16),
    new THREE.Vector3(0.08, cy - 0.12, -0.13),
    new THREE.Vector3(0.06, cy - 0.19, -0.1),
  ]);
  const hose = new THREE.Mesh(new THREE.TubeGeometry(curve, 12, 0.011, 6), mat('rubber'));
  hose.castShadow = true;
  g.add(hose);
  // gauge + label
  g.add(M(gCyl(0.02, 0.02, 0.012, 10), mat('plastic_white'), 0, cy + 0.24, -0.125, { rx: Math.PI / 2 - 0.4 }));
  const lbl = canvasTex('ext_label', 96, 128, (gg, w, h) => {
    gg.fillStyle = '#f2f0ea'; gg.fillRect(0, 0, w, h);
    gg.fillStyle = '#c0392b'; gg.fillRect(0, 0, w, 34);
    gg.fillStyle = '#fff'; gg.font = 'bold 15px Arial'; gg.textAlign = 'center';
    gg.fillText('FIRE', w / 2, 15); gg.fillText('EXTINGUISHER', w / 2, 30);
    gg.fillStyle = '#2c3540'; gg.font = 'bold 12px Arial';
    gg.fillText('ABC · DRY CHEM', w / 2, 56);
    gg.fillStyle = '#7c848c';
    for (let i = 0; i < 5; i++) gg.fillRect(10, 68 + i * 10, w - 20, 4);
  });
  const lm = new THREE.MeshStandardMaterial({ map: lbl, roughness: 0.5 });
  const wrap = new THREE.Mesh(gCyl(0.0755, 0.0755, 0.16, 14, true), lm);
  wrap.position.set(0, cy - 0.02, -0.1);
  wrap.rotation.y = Math.PI;
  wrap.castShadow = false;
  g.add(wrap);
  setCol(g, col(0, -0.1, 0.2, 0.2, 0.58, cy - 0.23));
  return g;
});

def('fire_cabinet', 'Fire cabinet (glass front)', {
  footprint: [0.66, 0.22], height: 1.65, mount: 'wall', rooms: 'corridors, lobby',
}, () => {
  const g = new THREE.Group();
  const cy = 1.2;
  const red = mat('paint_red');
  g.add(M(gBox(0.65, 0.85, 0.2, 0.012), red, 0, cy, -0.1));
  g.add(M(gBox(0.55, 0.75, 0.03), new THREE.MeshStandardMaterial({ color: 0x1c1e22, roughness: 0.8 }), 0, cy, -0.19));
  // interior extinguisher (simplified)
  g.add(M(gCyl(0.06, 0.06, 0.34, 12), red, 0, cy - 0.06, -0.12));
  g.add(M(gCyl(0.016, 0.016, 0.05, 8), mat('metal_brushed'), 0, cy + 0.14, -0.12));
  // glass door + frame + handle
  g.add(M(gBox(0.56, 0.76, 0.01), new THREE.MeshPhysicalMaterial({ color: 0xcfe4ee, transparent: true, opacity: 0.16, roughness: 0.05 }), 0, cy, -0.205, { cast: false }));
  g.add(M(gBox(0.6, 0.03, 0.02), red, 0, cy + 0.4, -0.2));
  g.add(M(gBox(0.6, 0.03, 0.02), red, 0, cy - 0.4, -0.2));
  g.add(M(gBox(0.03, 0.83, 0.02), red, -0.29, cy, -0.2));
  g.add(M(gBox(0.03, 0.83, 0.02), red, 0.29, cy, -0.2));
  g.add(M(gBox(0.02, 0.12, 0.03), mat('metal_brushed'), 0.24, cy, -0.215));
  const fire = textTex('fire_cab', 'F I R E', { w: 192, h: 48, bg: '#c0392b', fg: '#ffffff', font: 'bold 30px Arial' });
  g.add(label(0.3, 0.075, new THREE.MeshStandardMaterial({ map: fire, roughness: 0.5 }), 0, cy + 0.475, -0.2));
  setCol(g, col(0, -0.1, 0.66, 0.22, 0.9, cy - 0.45));
  return g;
});

def('sprinkler_head', 'Sprinkler head', {
  footprint: [0.08, 0.08], height: 2.6, mount: 'ceiling', rooms: 'all interiors',
}, (opts = {}) => {
  const g = new THREE.Group();
  const y = opts.ceilY ?? 2.6;
  g.add(M(gCyl(0.045, 0.05, 0.012, 14), mat('chrome'), 0, y - 0.006, 0));
  g.add(M(gCyl(0.012, 0.012, 0.05, 8), mat('chrome'), 0, y - 0.035, 0));
  const bulbM = new THREE.MeshPhysicalMaterial({ color: 0xd03028, transparent: true, opacity: 0.85, roughness: 0.1 });
  g.add(M(gCyl(0.004, 0.006, 0.03, 6), bulbM, 0, y - 0.07, 0));
  g.add(M(gCyl(0.02, 0.02, 0.004, 10), mat('brass'), 0, y - 0.088, 0));
  return g;
});

def('smoke_detector', 'Smoke detector', {
  footprint: [0.13, 0.13], height: 2.6, mount: 'ceiling', rooms: 'all interiors',
}, (opts = {}) => {
  const g = new THREE.Group();
  const y = opts.ceilY ?? 2.6;
  g.add(M(gCyl(0.065, 0.055, 0.035, 16), mat('plastic_white'), 0, y - 0.018, 0));
  g.add(M(gTorus(0.045, 0.006, 6, 16), mat('plastic_white'), 0, y - 0.036, 0, { rx: Math.PI / 2 }));
  g.add(M(gCyl(0.004, 0.004, 0.006, 6), mat('led_red'), 0.028, y - 0.038, 0));
  return g;
});

def('light_emergency', 'Emergency twin-head light', {
  footprint: [0.5, 0.16], height: 2.42, mount: 'wall', rooms: 'corridors, stairwell, service',
}, (opts = {}) => {
  const g = new THREE.Group();
  const cy = 2.3;
  const on = opts.on ?? true;
  g.add(M(gBox(0.3, 0.13, 0.09, 0.012), mat('plastic_beige'), 0, cy, -0.045));
  g.add(M(gCyl(0.005, 0.005, 0.005, 8), mat(on ? 'led_red' : 'plastic_gray'), 0.1, cy - 0.045, -0.092, { rx: Math.PI / 2 }));
  const lensM = on
    ? new THREE.MeshStandardMaterial({ color: 0xfff4d8, emissive: 0xffe9b8, emissiveIntensity: 2.2, roughness: 0.3 })
    : mat('plastic_white');
  for (const s of [-1, 1]) {
    const head = new THREE.Group();
    head.position.set(s * 0.19, cy + 0.02, -0.05);
    head.rotation.set(-0.5, s * 0.35, 0);
    head.add(M(gCyl(0.045, 0.055, 0.07, 10), mat('plastic_beige'), 0, 0, 0, { rx: Math.PI / 2 }));
    head.add(M(gCyl(0.04, 0.04, 0.012, 10), lensM, 0, 0, -0.04, { rx: Math.PI / 2 }));
    g.add(head);
  }
  return g;
});

def('sign_exit', 'Exit sign (emissive)', {
  footprint: [0.4, 0.09], height: 2.6, rooms: 'every egress route', gallery: { mount: 'ceiling' },
}, (opts = {}) => {
  const g = new THREE.Group();
  const mountKind = opts.mount ?? 'wall';
  const face = canvasTex('exit_face' + (opts.arrow ?? 'r'), 256, 128, (gg, w, h) => {
    gg.fillStyle = '#1a0d0c'; gg.fillRect(0, 0, w, h);
    gg.fillStyle = '#ff4433';
    gg.font = 'bold 74px Arial Narrow, Arial, sans-serif'; gg.textAlign = 'center';
    gg.fillText('EXIT', w / 2 + (opts.arrow ? -18 : 0), 92);
    if (opts.arrow ?? true) {
      gg.beginPath();
      const ax = w - 44;
      gg.moveTo(ax - 16, 44); gg.lineTo(ax + 14, 64); gg.lineTo(ax - 16, 84);
      gg.closePath(); gg.fill();
    }
  });
  const faceM = new THREE.MeshStandardMaterial({
    map: face, roughness: 0.4, emissive: 0xffffff, emissiveMap: face, emissiveIntensity: 1.6,
  });
  const cy = mountKind === 'ceiling' ? 2.32 : 2.25;
  g.add(M(gBox(0.38, 0.19, 0.06, 0.008), mat('plastic_black'), 0, cy, mountKind === 'ceiling' ? 0 : -0.032));
  g.add(label(0.34, 0.16, faceM, 0, cy, (mountKind === 'ceiling' ? -0.032 : -0.064)));
  if (mountKind === 'ceiling') {
    const back = label(0.34, 0.16, faceM, 0, cy, 0.032);
    back.rotation.y = 0; // faces +Z
    g.add(back);
    for (const s of [-1, 1]) g.add(M(gCyl(0.007, 0.007, 2.6 - cy - 0.095, 6), mat('plastic_black'), s * 0.14, cy + 0.095 + (2.6 - cy - 0.095) / 2, 0));
  }
  return g;
});

// ========================================================== janitor / loading
def('cart_janitor', 'Janitor cart', {
  footprint: [1.0, 0.52], height: 1.0, rooms: 'janitor closet, corridors',
}, () => {
  const g = new THREE.Group();
  const gray = mat('plastic_gray');
  // chassis shelves + posts
  g.add(M(gBox(0.78, 0.05, 0.48, 0.012), gray, -0.06, 0.12, 0));
  g.add(M(gBox(0.78, 0.04, 0.48, 0.012), gray, -0.06, 0.52, 0));
  g.add(M(gBox(0.78, 0.06, 0.48, 0.012), gray, -0.06, 0.93, 0));
  for (const sx of [-0.42, 0.3]) for (const sz of [-1, 1]) {
    g.add(M(gBox(0.035, 0.85, 0.035), gray, sx, 0.5, sz * 0.21));
  }
  // top tray contents: bottles + rags
  const bcols = [0x2b6da0, 0x3e8c4a, 0xd9822b];
  bcols.forEach((c, i) => {
    const m = new THREE.MeshStandardMaterial({ color: c, roughness: 0.4 });
    g.add(M(gBox(0.07, 0.16, 0.07, 0.01), m, -0.32 + i * 0.14, 1.04, -0.08));
    g.add(M(gCyl(0.014, 0.02, 0.05, 8), mat('plastic_black'), -0.32 + i * 0.14, 1.145, -0.08));
  });
  g.add(M(gBox(0.16, 0.05, 0.2, 0.015), new THREE.MeshStandardMaterial({ color: 0xe8e2d0, roughness: 0.9 }), 0.12, 0.985, 0.08));
  // trash-bag ring at the back (+X end) with dark bag
  g.add(M(gTorus(0.19, 0.014, 8, 18), gray, 0.53, 0.9, 0, { rx: Math.PI / 2 }));
  const bagM = new THREE.MeshStandardMaterial({ color: 0x1c1e22, roughness: 0.65 });
  g.add(M(gCyl(0.185, 0.13, 0.62, 14, true), bagM, 0.53, 0.6, 0, { cast: true }));
  g.add(M(gCyl(0.13, 0.13, 0.01, 14), bagM, 0.53, 0.3, 0));
  // mop bucket parked at the front (-X)
  g.add(M(gBox(0.26, 0.26, 0.3, 0.02), mat('paint_yellow'), -0.62, 0.2, 0));
  g.add(M(gCyl(0.02, 0.02, 0.9, 8), mat('metal_brushed'), -0.62, 0.75, 0.08, { rz: 0.12 }));
  g.add(M(gCyl(0.045, 0.03, 0.12, 8), new THREE.MeshStandardMaterial({ color: 0xd8d4c8, roughness: 0.95 }), -0.68, 1.16, 0.08, { rz: 0.12 }));
  // casters
  for (const sx of [-0.4, 0.32]) for (const sz of [-1, 1]) {
    g.add(M(gCyl(0.045, 0.045, 0.035, 10), mat('plastic_black'), sx, 0.045, sz * 0.19, { rz: Math.PI / 2 }));
  }
  setCol(g, col(0, 0, 1.0, 0.52, 1.0));
  return g;
});

def('mop_bucket', 'Mop bucket + wringer', {
  footprint: [0.42, 0.36], height: 1.15, rooms: 'janitor closet, wet floors',
}, () => {
  const g = new THREE.Group();
  const yellow = mat('paint_yellow');
  g.add(M(gBox(0.35, 0.3, 0.3, 0.02), yellow, 0, 0.2, 0.0));
  g.add(M(gBox(0.3, 0.12, 0.22, 0.015), yellow, 0, 0.41, 0.03));
  g.add(M(gBox(0.26, 0.02, 0.03), mat('metal_brushed'), 0, 0.48, -0.06, { rx: 0.5 }));
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    g.add(M(gCyl(0.032, 0.032, 0.03, 10), mat('plastic_black'), sx * 0.13, 0.032, sz * 0.11, { rz: Math.PI / 2 }));
  }
  // mop standing in it
  g.add(M(gCyl(0.016, 0.016, 0.95, 8), mat('metal_brushed'), 0.05, 0.62, 0.02, { rz: -0.18 }));
  g.add(M(gCyl(0.05, 0.035, 0.14, 8), new THREE.MeshStandardMaterial({ color: 0xd8d4c8, roughness: 0.95 }), 0.14, 1.06, 0.02, { rz: -0.18 }));
  setCol(g, col(0, 0, 0.42, 0.36, 0.5));
  return g;
});

def('broom', 'Push broom (leaning)', {
  footprint: [0.45, 0.2], height: 1.35, rooms: 'janitor closet, service',
}, () => {
  const g = new THREE.Group();
  const lean = 0.16;
  g.add(M(gCyl(0.014, 0.014, 1.3, 8), mat('wood_desk'), 0, 0.66, -0.02, { rx: -lean }));
  g.add(M(gBox(0.4, 0.05, 0.06, 0.01), mat('wood_desk'), 0, 0.08, 0.085));
  const bristleM = new THREE.MeshStandardMaterial({ color: 0x8a6a3a, roughness: 1.0 });
  g.add(M(gBox(0.38, 0.06, 0.05), bristleM, 0, 0.03, 0.085));
  setCol(g, col(0, 0.085, 0.42, 0.16, 0.12)); // head only; the lean stays passable
  return g;
});

def('bottle_cleaning', 'Cleaning spray bottle', {
  footprint: [0.1, 0.08], height: 0.28, rooms: 'janitor cart, under sinks', gallery: { trio: true },
}, (opts = {}) => {
  const build1 = (ci) => {
    const b = new THREE.Group();
    const themes = [
      { liquid: 0x3fa7d6, name: 'GLACIA-CLEAN' },
      { liquid: 0x7bd389, name: 'PINE POLAR' },
      { liquid: 0xe8912d, name: 'CITRA BLAST' },
    ];
    const t = themes[ci % 3];
    const liquidM = new THREE.MeshPhysicalMaterial({ color: t.liquid, transparent: true, opacity: 0.75, roughness: 0.25 });
    b.add(M(gLathe('spraybody', [[0.001, 0], [0.04, 0.0], [0.045, 0.02], [0.045, 0.13], [0.028, 0.17], [0.02, 0.2], [0.0, 0.2]], 12), liquidM, 0, 0, 0, { sz: 0.72 }));
    const lbl = textTex('spray' + ci, t.name, { w: 128, h: 48, bg: '#f0efe9', fg: '#2c3540', font: 'bold 15px Arial' });
    b.add(label(0.055, 0.05, new THREE.MeshStandardMaterial({ map: lbl, roughness: 0.6 }), 0, 0.09, -0.034));
    // trigger head
    b.add(M(gCyl(0.012, 0.012, 0.045, 8), mat('plastic_white'), 0, 0.222, 0));
    b.add(M(gBox(0.024, 0.028, 0.09), mat('plastic_white'), 0, 0.252, -0.02));
    b.add(M(gBox(0.014, 0.05, 0.02), mat('plastic_white'), 0, 0.21, -0.045, { rx: 0.25 }));
    return b;
  };
  if (opts.trio) {
    const g = new THREE.Group();
    for (let i = 0; i < 3; i++) {
      const b = build1(i);
      b.position.x = (i - 1) * 0.11;
      b.rotation.y = (i - 1) * 0.4;
      g.add(b);
    }
    return g;
  }
  return build1(opts.c ?? 0);
});

def('shelf_utility', 'Utility shelving (steel)', {
  footprint: [1.0, 0.5], height: 1.8, rooms: 'janitor, storage, garage', gallery: { filled: true },
}, (opts = {}) => {
  const g = new THREE.Group();
  const w = 1.0, d = 0.5, h = 1.8;
  const steel = mat('plastic_gray');
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    g.add(M(gBox(0.04, h, 0.012), steel, sx * (w / 2 - 0.02), h / 2, sz * (d / 2 - 0.006)));
    g.add(M(gBox(0.012, h, 0.04), steel, sx * (w / 2 - 0.006), h / 2, sz * (d / 2 - 0.02)));
  }
  for (let i = 0; i < 4; i++) {
    const sy = 0.12 + i * (h - 0.2) / 3;
    g.add(M(gBox(w - 0.02, 0.035, d - 0.02, 0.006), steel, 0, sy, 0));
  }
  if (opts.filled ?? true) {
    const r = rng(52);
    // boxes, paint cans, coiled cable
    g.add(M(gBox(0.34, 0.26, 0.34, 0.006), mat('cardboard'), -0.25, 0.14 + 0.13 + 0.02, 0));
    g.add(M(gBox(0.26, 0.2, 0.3, 0.006), mat('cardboard'), 0.22, 0.14 + 0.1 + 0.02, -0.03, { ry: 0.15 }));
    for (let i = 0; i < 3; i++) {
      g.add(M(gCyl(0.07, 0.07, 0.16, 12), mat('metal_brushed'), -0.3 + i * 0.2, 0.65 + 0.1, 0.05));
    }
    g.add(M(gTorus(0.09, 0.02, 6, 12), mat('paint_orange'), 0.3, 0.72 + 0.06, 0, { rx: Math.PI / 2 }));
    g.add(M(gBox(0.3, 0.14, 0.22, 0.01), mat('plastic_black'), 0.25, 1.25 + 0.07, 0));
    g.add(M(gBox(0.2, 0.22, 0.2, 0.006), mat('cardboard'), -0.28, 1.19 + 0.11, 0, { ry: -0.1 }));
  }
  setCol(g, col(0, 0, w, d, h));
  return g;
});

function shippingLabelTex() {
  return canvasTex('ship_label', 128, 96, (g, w, h) => {
    g.fillStyle = '#f2f0ea'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#2c3540'; g.lineWidth = 2; g.strokeRect(3, 3, w - 6, h - 6);
    g.fillStyle = '#14365c'; g.font = 'bold 11px Arial';
    g.fillText('NORTHSTAR', 8, 18); g.fillText('LOGISTICS GROUP', 8, 30);
    drawStar(g, 108, 22, 12);
    g.fillStyle = '#2c3540';
    for (let i = 0; i < 3; i++) g.fillRect(8, 40 + i * 9, 80 - i * 22, 4);
    // barcode
    const r = rng(99);
    g.fillStyle = '#1c1e22';
    let x = 8;
    while (x < 112) { const bw = 1 + Math.floor(r() * 3); g.fillRect(x, 70, bw, 18); x += bw + 1 + Math.floor(r() * 3); }
  });
}

def('box_cardboard', 'Cardboard box', {
  footprint: [0.5, 0.4], height: 0.35, rooms: 'loading, storage, offices', gallery: { open: true, size: 'm' },
}, (opts = {}) => {
  const g = new THREE.Group();
  const dims = { s: [0.35, 0.25, 0.28], m: [0.5, 0.35, 0.4], l: [0.62, 0.45, 0.5] }[opts.size ?? 'm'];
  const [w, h, d] = dims;
  const cb = mat('cardboard');
  if (opts.open) {
    // open carton: walls + flaps folded outward + packing paper
    g.add(M(gBox(w, 0.014, d), cb, 0, 0.007, 0));
    for (const s of [-1, 1]) {
      g.add(M(gBox(w, h, 0.012), cb, 0, h / 2, s * (d / 2 - 0.006)));
      g.add(M(gBox(0.012, h, d), cb, s * (w / 2 - 0.006), h / 2, 0));
    }
    for (const s of [-1, 1]) {
      g.add(M(gBox(w, 0.012, d * 0.42), cb, 0, h + Math.sin(0.9) * d * 0.2, s * (d / 2 + Math.cos(0.9) * d * 0.2), { rx: s * 1.9 }));
      g.add(M(gBox(w * 0.42, 0.012, d), cb, s * (w / 2 + Math.cos(1.1) * w * 0.2), h + Math.sin(1.1) * w * 0.18, 0, { rz: s * -2.0 }));
    }
    const paperM = new THREE.MeshStandardMaterial({ color: 0xe8e4da, roughness: 0.95, flatShading: true });
    const r = rng(61);
    for (let i = 0; i < 3; i++) {
      const wad = new THREE.Mesh(G('paperwad', () => new THREE.IcosahedronGeometry(0.09, 0)), paperM);
      wad.position.set((r() - 0.5) * w * 0.5, h - 0.05, (r() - 0.5) * d * 0.5);
      wad.scale.set(0.7 + r() * 0.5, 0.5 + r() * 0.3, 0.7 + r() * 0.5);
      wad.rotation.set(r() * 3, r() * 3, r() * 3);
      wad.castShadow = true;
      g.add(wad);
    }
  } else {
    g.add(M(gBox(w, h, d, 0.008), cb, 0, h / 2, 0));
    // packing tape
    const tapeM = new THREE.MeshStandardMaterial({ color: 0xcbb98a, roughness: 0.5 });
    g.add(M(gBox(0.06, 0.004, d + 0.006), tapeM, 0, h, 0));
    g.add(M(gBox(0.06, h * 0.35, 0.004), tapeM, 0, h - h * 0.35 / 2 + 0.002, -d / 2 - 0.004));
  }
  const lm = new THREE.MeshStandardMaterial({ map: shippingLabelTex(), roughness: 0.7 });
  g.add(label(0.16, 0.12, lm, w * 0.12, opts.open ? h * 0.5 : h * 0.55, -d / 2 - 0.008));
  if (h >= 0.3) setCol(g, col(0, 0, w, d, opts.open ? h : h));
  return g;
});

def('crate_shipping', 'Wood shipping crate', {
  footprint: [0.8, 0.6], height: 0.62, rooms: 'loading, garage',
}, () => {
  const g = new THREE.Group();
  const w = 0.8, d = 0.6, h = 0.62;
  const wd = mat('wood_desk');
  g.add(M(gBox(w, 0.04, d), wd, 0, 0.05, 0));
  // slats on sides with gaps
  for (let i = 0; i < 3; i++) {
    const sy = 0.14 + i * 0.17;
    for (const s of [-1, 1]) {
      g.add(M(gBox(w, 0.11, 0.022), wd, 0, sy, s * (d / 2 - 0.011)));
      g.add(M(gBox(0.022, 0.11, d - 0.05), wd, s * (w / 2 - 0.011), sy, 0));
    }
  }
  // corner battens + top
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    g.add(M(gBox(0.05, h - 0.06, 0.05), wd, sx * (w / 2 - 0.025), (h - 0.06) / 2 + 0.03, sz * (d / 2 - 0.025)));
  }
  for (let i = 0; i < 4; i++) {
    g.add(M(gBox(w, 0.025, 0.12), wd, 0, h - 0.012, -d / 2 + 0.08 + i * 0.145));
  }
  // stencil
  const stencil = canvasTex('crate_stencil', 256, 128, (g2, w2, h2) => {
    g2.clearRect(0, 0, w2, h2);
    g2.fillStyle = 'rgba(28,30,34,0.85)';
    g2.font = 'bold 24px Arial'; g2.textAlign = 'center';
    g2.fillText('NORTHSTAR', w2 / 2, 42);
    g2.fillText('LOGISTICS GROUP', w2 / 2, 72);
    g2.font = 'bold 17px Arial';
    g2.fillText('◄ THIS SIDE UP ►', w2 / 2, 106);
  });
  const sm = new THREE.MeshStandardMaterial({ map: stencil, roughness: 0.85, transparent: true });
  g.add(label(0.6, 0.3, sm, 0, 0.32, -d / 2 - 0.013));
  setCol(g, col(0, 0, w, d, h));
  return g;
});

def('pallet', 'Wood pallet', {
  footprint: [1.2, 0.8], height: 0.14, rooms: 'loading, garage',
}, () => {
  const g = new THREE.Group();
  const wd = mat('wood_desk');
  // bottom skids along X
  for (const z of [-0.33, 0, 0.33]) g.add(M(gBox(1.2, 0.05, 0.1), wd, 0, 0.025, z));
  // blocks
  for (const x of [-0.55, 0, 0.55]) for (const z of [-0.33, 0, 0.33]) {
    g.add(M(gBox(0.09, 0.05, 0.09), wd, x, 0.073, z));
  }
  // deck boards along Z
  for (let i = 0; i < 7; i++) {
    g.add(M(gBox(0.115, 0.022, 0.8), wd, -0.54 + i * 0.18, 0.11, 0));
  }
  setCol(g, col(0, 0, 1.2, 0.8, 0.14));
  return g;
});

def('pallet_stack_boxes', 'Pallet with strapped boxes', {
  footprint: [1.2, 0.8], height: 1.15, rooms: 'loading, garage',
}, () => {
  const g = new THREE.Group();
  const pallet = PROPS.pallet.build({});
  g.add(pallet);
  const cb = mat('cardboard');
  const r = rng(71);
  // two tiers of cartons (2×2 per tier with slight jitter)
  let y = 0.12;
  for (const tier of [0, 1]) {
    const bh = tier === 0 ? 0.42 : 0.38;
    for (let i = 0; i < 4; i++) {
      const bw = 0.5 + (r() - 0.5) * 0.06, bd = 0.36;
      const x = (i % 2 === 0 ? -1 : 1) * 0.281;
      const z = (i < 2 ? -1 : 1) * 0.185;
      g.add(M(gBox(bw, bh, bd, 0.006), cb, x + (r() - 0.5) * 0.02, y + bh / 2, z + (r() - 0.5) * 0.02, { ry: (r() - 0.5) * 0.06 }));
    }
    y += bh + 0.01;
  }
  const lm = new THREE.MeshStandardMaterial({ map: shippingLabelTex(), roughness: 0.7 });
  g.add(label(0.15, 0.11, lm, -0.28, 0.4, -0.375));
  g.add(label(0.15, 0.11, lm, 0.25, 0.75, -0.37, { rz: 0.02 }));
  // strapping bands
  const bandM = new THREE.MeshStandardMaterial({ color: 0x1c1e22, roughness: 0.5 });
  for (const x of [-0.3, 0.3]) {
    g.add(M(gBox(0.016, 0.9, 0.004), bandM, x, 0.57, -0.376));
    g.add(M(gBox(0.016, 0.9, 0.004), bandM, x, 0.57, 0.376));
    g.add(M(gBox(0.016, 0.004, 0.756), bandM, x, 1.023, 0));
  }
  setCol(g, col(0, 0, 1.2, 0.8, 1.05));
  return g;
});

def('hand_truck', 'Hand truck', {
  footprint: [0.52, 0.5], height: 1.2, rooms: 'loading, mail room',
}, () => {
  const g = new THREE.Group();
  const frameM = mat('paint_red');
  const lean = -0.12;
  const fr = new THREE.Group();
  fr.rotation.x = lean;
  for (const s of [-1, 1]) {
    fr.add(M(gCyl(0.015, 0.015, 1.15, 8), frameM, s * 0.18, 0.575, 0.0));
  }
  for (let i = 0; i < 3; i++) fr.add(M(gCyl(0.012, 0.012, 0.36, 8), frameM, 0, 0.28 + i * 0.32, 0, { rz: Math.PI / 2 }));
  fr.add(M(gTorus(0.18, 0.015, 6, 12, Math.PI), frameM, 0, 1.15, 0, { rz: 0 }));
  // toe plate (lifted so the leaned frame keeps its front lip off the floor)
  fr.add(M(gBox(0.44, 0.012, 0.3, 0.004), mat('metal_brushed'), 0, 0.05, -0.155));
  g.add(fr);
  // wheels
  for (const s of [-1, 1]) {
    g.add(M(gCyl(0.1, 0.1, 0.045, 14), mat('rubber'), s * 0.235, 0.1, 0.1, { rz: Math.PI / 2 }));
    g.add(M(gCyl(0.045, 0.045, 0.05, 10), mat('metal_brushed'), s * 0.235, 0.1, 0.1, { rz: Math.PI / 2 }));
  }
  g.add(M(gCyl(0.015, 0.015, 0.47, 8), mat('metal_dark'), 0, 0.1, 0.1, { rz: Math.PI / 2 }));
  setCol(g, col(0, 0, 0.52, 0.5, 1.2));
  return g;
});

def('ladder_step', 'Step ladder (A-frame)', {
  footprint: [0.52, 0.75], height: 1.26, rooms: 'maintenance, storage',
}, () => {
  const g = new THREE.Group();
  const alu = mat('metal_brushed');
  const a = 0.2; // lean of each leg pair (radians from vertical)
  const tanA = Math.tan(a);
  for (const side of [-1, 1]) { // -1 front (steps), +1 back
    for (const s of [-1, 1]) {
      const rail = M(gBox(0.045, 1.28, 0.022), alu, s * 0.2, 0.615, side * 0.155, { rx: side * a });
      g.add(rail);
      // rubber foot
      g.add(M(gBox(0.05, 0.03, 0.05), mat('rubber'), s * 0.2, 0.015, side * (0.155 + 0.615 * tanA)));
    }
  }
  // steps on the front side follow the rail lean
  for (let i = 0; i < 3; i++) {
    const sy = 0.29 + i * 0.29;
    const z = -0.155 + (sy - 0.615) * tanA;
    g.add(M(gBox(0.4, 0.022, 0.1, 0.004), alu, 0, sy, z));
  }
  // top cap + spreader braces
  g.add(M(gBox(0.46, 0.04, 0.24, 0.01), mat('paint_yellow'), 0, 1.24, 0));
  for (const s of [-1, 1]) g.add(M(gBox(0.014, 0.014, 0.29), alu, s * 0.185, 0.72, 0));
  setCol(g, col(0, 0, 0.52, 0.75, 1.26));
  return g;
});

def('tool_case', 'Tool case', {
  footprint: [0.46, 0.2], height: 0.36, rooms: 'maintenance',
}, () => {
  const g = new THREE.Group();
  const shell = new THREE.MeshStandardMaterial({ color: 0xb02a22, roughness: 0.5 });
  g.add(M(gBox(0.45, 0.2, 0.19, 0.015), shell, 0, 0.1, 0));
  g.add(M(gBox(0.45, 0.13, 0.19, 0.015), mat('plastic_black'), 0, 0.265, 0));
  // ridges + latches + handle
  for (let i = 0; i < 5; i++) g.add(M(gBox(0.012, 0.32, 0.194), mat('plastic_black'), -0.16 + i * 0.08, 0.165, 0));
  for (const s of [-1, 1]) g.add(M(gBox(0.05, 0.06, 0.014), mat('metal_brushed'), s * 0.12, 0.2, -0.1));
  g.add(M(gTorus(0.055, 0.011, 6, 12, Math.PI), mat('plastic_black'), 0, 0.335, 0, { rz: 0 }));
  const lbl = textTex('toolcase', 'IRONREACH TOOLS', { w: 192, h: 40, bg: '#1c1e22', fg: '#e8b93d', font: 'bold 17px Arial' });
  g.add(label(0.16, 0.035, new THREE.MeshStandardMaterial({ map: lbl, roughness: 0.5 }), 0.08, 0.09, -0.098));
  setCol(g, col(0, 0, 0.46, 0.2, 0.36));
  return g;
});

def('cone_warning', 'Traffic cone', {
  footprint: [0.3, 0.3], height: 0.52, rooms: 'garage, wet floors',
}, () => {
  const g = new THREE.Group();
  const orange = mat('paint_orange');
  g.add(M(gBox(0.3, 0.025, 0.3, 0.008), orange, 0, 0.013, 0));
  g.add(M(gCyl(0.02, 0.115, 0.5, 14), orange, 0, 0.275, 0));
  const bandM = new THREE.MeshStandardMaterial({ color: 0xf4f5f2, roughness: 0.25 });
  g.add(M(gCyl(0.062, 0.083, 0.11, 14), bandM, 0, 0.29, 0));
  setCol(g, col(0, 0, 0.3, 0.3, 0.52));
  return g;
});

def('mat_floor', 'Entry floor mat', {
  footprint: [1.2, 0.75], height: 0.02, rooms: 'entrances',
}, () => {
  const g = new THREE.Group();
  const matTex = canvasTex('floormat', 256, 160, (gg, w, h) => {
    gg.fillStyle = '#2e3134'; gg.fillRect(0, 0, w, h);
    const r = rng(2);
    for (let i = 0; i < 1600; i++) {
      gg.fillStyle = r() > 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.2)';
      gg.fillRect(r() * w, r() * h, 2, 2);
    }
    gg.strokeStyle = '#4a4e52'; gg.lineWidth = 6; gg.strokeRect(8, 8, w - 16, h - 16);
    gg.fillStyle = 'rgba(143,216,255,0.5)';
    gg.font = 'bold 26px Arial'; gg.textAlign = 'center';
    gg.fillText('NORTHSTAR LOGISTICS', w / 2, h / 2 + 4);
    gg.font = '15px Arial'; gg.fillStyle = 'rgba(143,216,255,0.35)';
    gg.fillText('GROUP', w / 2, h / 2 + 30);
  });
  g.add(M(gBox(1.2, 0.018, 0.75, 0.006), new THREE.MeshStandardMaterial({ map: matTex, roughness: 0.98 }), 0, 0.009, 0));
  return g;
});

def('barrier_loading', 'Loading barrier', {
  footprint: [1.5, 0.4], height: 1.05, rooms: 'garage, loading dock',
}, () => {
  const g = new THREE.Group();
  const chev = canvasTex('barrier_chev', 128, 32, (gg, cw, ch) => {
    gg.fillStyle = '#e8b93d'; gg.fillRect(0, 0, cw, ch);
    gg.fillStyle = '#1c1e22';
    for (let x = -32; x < cw + 32; x += 32) {
      gg.beginPath(); gg.moveTo(x, ch); gg.lineTo(x + 16, 0); gg.lineTo(x + 32, 0); gg.lineTo(x + 16, ch); gg.closePath(); gg.fill();
    }
  }, { repeat: true });
  chev.repeat.set(4, 1);
  const chevM = new THREE.MeshStandardMaterial({ map: chev, roughness: 0.55 });
  for (const y of [0.55, 0.95]) {
    const rail = M(gBox(1.5, 0.14, 0.04, 0.008), chevM, 0, y, 0);
    g.add(rail);
  }
  for (const s of [-1, 1]) {
    g.add(M(gBox(0.06, 1.0, 0.06), mat('metal_dark'), s * 0.66, 0.5, 0));
    g.add(M(gBox(0.3, 0.05, 0.4, 0.01), mat('metal_dark'), s * 0.66, 0.025, 0));
  }
  setCol(g, col(0, 0, 1.5, 0.4, 1.05));
  return g;
});

def('garage_control_box', 'Dock door control', {
  footprint: [0.18, 0.1], height: 1.45, mount: 'wall', rooms: 'garage, loading',
}, () => {
  const g = new THREE.Group();
  const cy = 1.25;
  g.add(M(gBox(0.16, 0.24, 0.08, 0.01), mat('metal_beige'), 0, cy, -0.042));
  const btn = (color, y, glow) => {
    const m = new THREE.MeshStandardMaterial({ color, roughness: 0.4, emissive: glow ? color : 0x000000, emissiveIntensity: glow ? 0.7 : 0 });
    g.add(M(gCyl(0.022, 0.022, 0.018, 10), m, 0, y, -0.086, { rx: Math.PI / 2 }));
  };
  btn(0x3e8c4a, cy + 0.06, true);
  btn(0xc0392b, cy, true);
  btn(0x2c2e33, cy - 0.06, false);
  const lbl = textTex('dockctl', 'DOCK DOOR 1', { w: 160, h: 32, bg: '#c7c0ae', fg: '#2c3540', font: 'bold 15px Arial' });
  g.add(label(0.13, 0.026, new THREE.MeshStandardMaterial({ map: lbl, roughness: 0.6 }), 0, cy + 0.135, -0.083));
  g.add(M(gCyl(0.015, 0.015, cy - 0.12, 8), mat('metal_beige'), 0, (cy - 0.12) / 2, -0.03));
  return g;
});

// ================================================================ cargo van
// Livery drawn per side so the logo block sits toward the FRONT of the
// vehicle on both flanks. Only the sweep shapes are mirrored — glyphs are
// always drawn upright (a scale(-1,1) here would mirror the lettering).
function vanLiveryTex(side) {
  return canvasTex('van_livery_' + side, 1024, 512, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    // On the right flank ('+x' face) canvas x=0 maps to the rear, so the
    // whole layout anchors to the right edge there.
    const anchorRight = side === 'right';
    g.save();
    if (anchorRight) { g.translate(w, 0); g.scale(-1, 1); }
    // navy sweep + cyan stripe
    g.fillStyle = '#14365c';
    g.beginPath();
    g.moveTo(0, h); g.lineTo(0, h * 0.62); g.lineTo(w * 0.42, h * 0.5); g.lineTo(w, h * 0.66); g.lineTo(w, h); g.closePath();
    g.fill();
    g.fillStyle = '#8fd8ff';
    g.beginPath();
    g.moveTo(0, h * 0.62); g.lineTo(w * 0.42, h * 0.5); g.lineTo(w, h * 0.66); g.lineTo(w, h * 0.62); g.lineTo(w * 0.42, h * 0.46); g.lineTo(0, h * 0.58); g.closePath();
    g.fill();
    g.restore();
    const x0 = anchorRight ? w - 150 : 150;
    drawStar(g, x0, 190, 92, { ring: '#14365c', star: '#14365c', dot: false });
    g.textAlign = anchorRight ? 'right' : 'left';
    const tx = anchorRight ? w - 280 : 280;
    g.fillStyle = '#14365c';
    g.font = 'bold 86px Arial Narrow, Arial, sans-serif';
    g.fillText('NORTHSTAR', tx, 210);
    g.font = 'bold 40px Arial, sans-serif';
    g.fillStyle = '#3f6d99';
    g.fillText('L O G I S T I C S   G R O U P', tx + (anchorRight ? -4 : 4), 264);
    g.font = 'bold 30px Arial';
    g.fillStyle = '#eaf6ff';
    g.fillText('UNIT 204 · ARCTIC FREIGHT & DISPATCH', tx + (anchorRight ? -4 : 4), h * 0.86);
  });
}

def('van_cargo', 'Cargo van (extraction vehicle)', {
  footprint: [1.96, 4.9], height: 2.12, rooms: 'extraction garage', gallery: { rearOpen: true },
}, (opts = {}) => {
  const g = new THREE.Group();
  const rearOpen = opts.rearOpen ?? false;
  const paint = mat('van_white');
  const dark = mat('plastic_black');
  const glassTint = new THREE.MeshPhysicalMaterial({ color: 0x26313c, transparent: true, opacity: 0.9, roughness: 0.12, metalness: 0.25 });
  const innerM = new THREE.MeshStandardMaterial({ color: 0x565b61, roughness: 0.85 });
  const navy = mat('paint_navy');

  // ---- cargo box: hollow shell so the open rear shows a real load bay
  // (van faces -Z; box spans z -0.45 .. 2.4, outer width 1.94)
  const BW = 1.94, wallT = 0.05;
  const wz0 = -0.45, wz1 = 2.34;                     // wall/floor extent
  const wzc = (wz0 + wz1) / 2, wlen = wz1 - wz0;
  g.add(M(gBox(BW, 0.1, wlen), paint, 0, 0.47, wzc));                    // floor
  g.add(M(gBox(BW - 0.26, 0.02, wlen - 0.16), mat('rubber'), 0, 0.53, wzc)); // deck mat
  for (const s of [-1, 1]) {
    g.add(M(gBox(wallT, 1.5, wlen), paint, s * (BW - wallT) / 2, 1.27, wzc)); // side walls
    g.add(M(gBox(0.012, 1.4, wlen - 0.1), innerM, s * (BW / 2 - wallT - 0.006), 1.24, wzc)); // gray lining
  }
  g.add(M(gBox(BW, 0.09, wz1 - wz0 + 0.06), paint, 0, 2.065, wzc + 0.03)); // roof
  g.add(M(gBox(BW - 0.08, 1.5, 0.06), paint, 0, 1.27, wz0 + 0.03));       // front bulkhead
  g.add(M(gBox(BW - 0.12, 1.38, 0.012), innerM, 0, 1.23, wz0 + 0.066));   // bulkhead lining
  g.add(M(gBox(BW, 0.17, 0.06), paint, 0, 1.935, 2.37));                  // rear header
  g.add(M(gBox(BW, 0.1, 0.06), dark, 0, 0.47, 2.37));                     // rear sill
  // interior: bench seats + inner wheel wells + grab rails + dome light
  for (const s of [-1, 1]) {
    g.add(M(gBox(0.36, 0.3, 1.9), innerM, s * 0.64, 0.68, 0.5));
    g.add(M(gBox(0.36, 0.07, 1.9, 0.01), mat('fabric_gray'), s * 0.64, 0.865, 0.5));
    g.add(M(gBox(0.3, 0.3, 0.86), innerM, s * 0.74, 0.65, 1.42));
    g.add(M(gCyl(0.014, 0.014, 2.0, 8), innerM, s * 0.55, 1.97, 0.85, { rx: Math.PI / 2 }));
  }
  if (rearOpen) {
    g.add(M(gBox(0.5, 0.02, 0.12), new THREE.MeshStandardMaterial({ color: 0xfff6e0, emissive: 0xfff2cc, emissiveIntensity: 2.0, roughness: 0.4 }), 0, 2.0, 1.4, { cast: false }));
  }

  // ---- rear barn doors, hinged on the outer jambs (open ~150 degrees)
  const doorGeo = gBox(0.92, 1.32, 0.05, 0.01);
  const starT = texMat('van_doorstar', 128, 128, (gg) => {
    gg.clearRect(0, 0, 128, 128);
    drawStar(gg, 64, 64, 46, { ring: '#14365c', star: '#14365c', dot: false });
  }, { roughness: 0.4 });
  starT.transparent = true;
  const hiVis = new THREE.MeshStandardMaterial({ color: 0xc0392b, roughness: 0.5 });
  for (const s of [-1, 1]) {
    const door = new THREE.Group();
    door.position.set(s * 0.945, 1.185, 2.372);
    door.rotation.y = rearOpen ? s * 2.6 : 0;
    door.add(M(doorGeo, paint, -s * 0.463, 0, 0));
    // hi-vis strips on both faces (visible closed AND swung open)
    door.add(M(gBox(0.07, 1.2, 0.012), hiVis, -s * 0.09, 0, 0.026));
    door.add(M(gBox(0.07, 1.2, 0.012), hiVis, -s * 0.09, 0, -0.026));
    door.add(M(gBox(0.02, 0.34, 0.03), mat('metal_brushed'), -s * 0.2, -0.05, 0.032));
    door.add(label(0.34, 0.34, starT, -s * 0.5, 0.18, 0.031, { face: '+z' }));
    g.add(door);
  }

  // ---- cab + hood (front)
  g.add(M(gBox(1.86, 0.66, 1.15, 0.03), paint, 0, 0.83, -1.02));          // cab body
  g.add(M(gBox(1.8, 0.79, 0.05), paint, 0, 1.555, -0.475));               // glasshouse rear mask
  g.add(M(gBox(1.8, 0.09, 0.97, 0.02), paint, 0, 1.925, -0.96));          // cab roof
  const ws = M(gBox(1.66, 0.78, 0.03), glassTint, 0, 1.5, -1.59, { rx: 0.345, cast: false });
  g.add(ws);
  for (const s of [-1, 1]) {
    g.add(M(gBox(0.07, 0.8, 0.06), paint, s * 0.84, 1.5, -1.59, { rx: 0.345 })); // A-pillars
    // side glass in dark gasket
    g.add(M(gBox(0.014, 0.66, 0.92), dark, s * 0.926, 1.5, -0.98, { cast: false }));
    g.add(M(gBox(0.014, 0.58, 0.84), glassTint, s * 0.9285, 1.49, -0.98, { cast: false }));
    // door seam + handle + beltline stripe
    g.add(M(gBox(0.008, 0.62, 0.012), dark, s * 0.932, 0.83, -0.6));
    g.add(M(gBox(0.008, 0.025, 0.17), dark, s * 0.933, 1.08, -0.72));
    g.add(M(gBox(0.008, 0.1, 1.13), navy, s * 0.932, 1.02, -1.02));
    // mirrors
    g.add(M(gBox(0.14, 0.03, 0.03), dark, s * 0.99, 1.56, -1.5));
    g.add(M(gBox(0.14, 0.24, 0.03, 0.008), dark, s * 1.06, 1.46, -1.48));
  }
  g.add(M(gBox(1.78, 0.09, 0.14), paint, 0, 1.1, -1.75));                 // cowl
  g.add(M(gBox(1.8, 0.48, 0.66, 0.04), paint, 0, 0.82, -2.0));            // hood
  g.add(M(gBox(1.86, 0.52, 0.1, 0.03), paint, 0, 0.78, -2.36));           // nose fascia
  for (const s of [-1, 1]) {
    g.add(M(gBox(0.008, 0.1, 0.62), navy, s * 0.906, 1.02, -1.99));       // hood stripe
  }
  // grille + headlights + plates + bumpers
  const grille = texMat('van_grille', 256, 96, (gg, w2, h2) => {
    gg.fillStyle = '#26282c'; gg.fillRect(0, 0, w2, h2);
    for (let i = 0; i < 4; i++) { gg.fillStyle = '#3a3d43'; gg.fillRect(10, 10 + i * 20, w2 - 20, 9); }
    drawStar(gg, w2 / 2, h2 / 2, 30, { ring: '#c3c9cd', star: '#c3c9cd', dot: false });
  }, { roughness: 0.45, metalness: 0.4 });
  g.add(label(0.96, 0.3, grille, 0, 0.84, -2.412));
  const lightM = new THREE.MeshStandardMaterial({ color: 0xd8e4ea, roughness: 0.2, emissive: 0xfff2cc, emissiveIntensity: (opts.lightsOn ?? true) ? 1.2 : 0 });
  for (const s of [-1, 1]) {
    g.add(M(gBox(0.32, 0.13, 0.04, 0.01), lightM, s * 0.64, 0.88, -2.4));
    g.add(M(gBox(0.07, 0.09, 0.04), new THREE.MeshStandardMaterial({ color: 0x8a1c14, roughness: 0.3, emissive: 0xff2211, emissiveIntensity: 0.6 }), s * 0.7, 0.47, 2.405)); // tail lights on the sill
  }
  const plateM = new THREE.MeshStandardMaterial({ map: textTex('van_plate', 'NLG·204', { w: 128, h: 40, bg: '#e8eaea', fg: '#14365c', font: 'bold 26px Arial' }), roughness: 0.4 });
  g.add(label(0.3, 0.09, plateM, 0, 0.57, -2.417));
  g.add(label(0.28, 0.085, plateM, 0, 0.47, 2.402, { face: '+z' }));
  g.add(M(gBox(1.9, 0.2, 0.14, 0.02), dark, 0, 0.42, -2.4));              // front bumper
  g.add(M(gBox(1.66, 0.09, 0.24, 0.01), dark, 0, 0.345, 2.5));            // rear step
  // roof marker lights (amber front, red rear)
  for (let i = -1; i <= 1; i++) {
    g.add(M(gBox(0.1, 0.03, 0.05), new THREE.MeshStandardMaterial({ color: 0xd97b1f, emissive: 0xff9c2a, emissiveIntensity: 0.8, roughness: 0.4 }), i * 0.55, 2.125, -0.4));
  }
  for (const s of [-1, 1]) {
    g.add(M(gBox(0.08, 0.03, 0.05), new THREE.MeshStandardMaterial({ color: 0x8a1c14, emissive: 0xff2211, emissiveIntensity: 0.6, roughness: 0.4 }), s * 0.75, 2.125, 2.34));
  }

  // ---- livery decals on the (exact-width) box walls
  for (const s of [-1, 1]) {
    const liv = new THREE.MeshStandardMaterial({ map: vanLiveryTex(s < 0 ? 'left' : 'right'), transparent: true, roughness: 0.35, metalness: 0.1, polygonOffset: true, polygonOffsetFactor: -1 });
    g.add(label(2.6, 1.32, liv, s * (BW / 2 + 0.002), 1.28, 0.95, { face: s > 0 ? '+x' : '-x' }));
  }

  // ---- running gear: wheels tucked into dark arches, no skirt hiding them
  const wheel = (x, z) => {
    const grp = new THREE.Group();
    grp.add(M(gCyl(0.34, 0.34, 0.24, 18), mat('rubber'), 0, 0, 0, { rz: Math.PI / 2 }));
    grp.add(M(gCyl(0.18, 0.18, 0.25, 12), mat('metal_brushed'), 0, 0, 0, { rz: Math.PI / 2 }));
    grp.add(M(gCyl(0.05, 0.05, 0.26, 8), dark, 0, 0, 0, { rz: Math.PI / 2 }));
    grp.position.set(x, 0.34, z);
    return grp;
  };
  for (const s of [-1, 1]) {
    g.add(wheel(s * 0.72, -1.6));
    g.add(wheel(s * 0.72, 1.42));
    g.add(M(gBox(0.34, 0.42, 0.92), dark, s * 0.75, 0.52, -1.6));         // front arch
    g.add(M(gBox(0.34, 0.36, 0.92), dark, s * 0.75, 0.45, 1.42));         // rear arch
  }
  g.add(M(gBox(1.46, 0.16, 3.7), dark, 0, 0.33, -0.1));                   // chassis fill

  const boxes = [col(0, 0.02, 1.96, 4.9, 2.12), col(0, 2.52, 1.7, 0.26, 0.42)];
  if (rearOpen) {
    boxes.push(col(1.38, 2.62, 0.9, 0.62, 1.34, 0.52), col(-1.38, 2.62, 0.9, 0.62, 1.34, 0.52));
  }
  setCol(g, ...boxes);
  return g;
});
