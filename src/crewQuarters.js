// Crew quarters, galley, mess corner and washroom alcove. Owner: crew agent.
// Bunks port z 6.6-10.6, lockers stbd 7.3-8.2, galley stbd 8.5-10.8,
// mess table port 11.0-12.3, washroom stbd 11.0-12.6.
// Keep-out: port porthole deadlight at (-1.44, 1.42, 11.55) r 0.28 (hull agent).

import * as THREE from 'three';
import * as M from './materials.js';
import * as K from './greebles.js';
import { makeRng } from './rng.js';
import { makeCanvas, fillBase, mottle, stencilText, canvasTexture, speckle } from './textures.js';

// wavy cloth plane (for curtains / hanging towel)
function clothPlane(w, h, mat, seed, waveAmp = 0.03) {
  const geo = new THREE.PlaneGeometry(w, h, 16, 8);
  const rng = makeRng(seed);
  const phase = rng.range(0, 6);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i);
    const hang = (y / h + 0.5); // more wave at bottom
    pos.setZ(i, Math.sin(x * 14 + phase) * waveAmp * (1.2 - hang) + Math.sin(x * 31 + phase * 2) * waveAmp * 0.4);
  }
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  mesh.userData.static = true;
  return mesh;
}

// the ONE extra local fabric: muted navy-gray spare blanket (fabricBlanket pattern)
let _navyBlanketMat = null;
function navyBlanket() {
  if (_navyBlanketMat) return _navyBlanketMat;
  const c = makeCanvas(512, 512);
  const ctx = c.getContext('2d');
  fillBase(ctx, '#4a5058');
  mottle(ctx, 'navy-blanket-mottle', { cells: 5, octaves: 3, amount: 0.13 });
  ctx.strokeStyle = 'rgba(28,31,36,0.8)'; ctx.lineWidth = 3; ctx.setLineDash([8, 6]);
  ctx.strokeRect(18, 18, 476, 476); ctx.setLineDash([]);
  ctx.fillStyle = 'rgba(205,200,188,0.85)';
  ctx.fillRect(390, 430, 70, 34);
  stencilText(ctx, 'DSV-7', 425, 447, { size: 15, color: 'rgba(52,56,62,0.9)', spacing: 1 });
  speckle(ctx, 'navy-blanket-fuzz', { count: 1400, colors: ['rgba(214,218,226,0.05)', 'rgba(12,14,18,0.08)'], size: 1.2 });
  _navyBlanketMat = new THREE.MeshPhysicalMaterial({
    name: 'fabricNavy', roughness: 0.95, metalness: 0,
    sheen: 0.55, sheenRoughness: 0.8, sheenColor: new THREE.Color(0x737a86),
    map: canvasTexture(c, { srgb: true }),
    normalMap: M.fabricBlanket().normalMap, normalScale: new THREE.Vector2(0.9, 0.9),
    envMapIntensity: 0.25,
  });
  return _navyBlanketMat;
}

// tiny harbor postcard (no people) taped to the hull inside a bunk
function postcardCanvas() {
  const c = makeCanvas(128, 96);
  const ctx = c.getContext('2d');
  fillBase(ctx, '#d8d2c0');
  const px = 8, py = 8, pw = 112, ph = 64;
  const sky = ctx.createLinearGradient(0, py, 0, py + ph);
  sky.addColorStop(0, '#a8c4d0');
  sky.addColorStop(0.5, '#d8b98c');
  sky.addColorStop(0.6, '#d8a04c');
  sky.addColorStop(0.62, '#41626b');
  sky.addColorStop(1, '#0a2e33');
  ctx.fillStyle = sky; ctx.fillRect(px, py, pw, ph);
  ctx.fillStyle = '#e8cf9a';
  ctx.beginPath(); ctx.arc(px + 80, py + 34, 7, 0, 7); ctx.fill();
  ctx.fillStyle = 'rgba(232,207,154,0.5)'; ctx.fillRect(px + 70, py + 42, 20, 2);
  ctx.fillStyle = '#3c4a42';
  ctx.beginPath();
  ctx.moveTo(px, py + 42); ctx.lineTo(px + 34, py + 30); ctx.lineTo(px + 54, py + 42); ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#c9c2ac'; ctx.fillRect(px + 28, py + 18, 5, 13);
  ctx.fillStyle = '#8e3030'; ctx.fillRect(px + 28, py + 18, 5, 4);
  stencilText(ctx, 'AZORES', 64, 85, { size: 11, color: 'rgba(90,80,60,0.85)', spacing: 2 });
  // tape corners
  ctx.fillStyle = 'rgba(160,158,150,0.75)';
  ctx.fillRect(0, 0, 18, 8); ctx.fillRect(110, 0, 18, 8);
  mottle(ctx, 'postcard-age', { cells: 5, octaves: 2, amount: 0.07 });
  return c;
}

// pin board with taped notes
function pinBoardCanvas() {
  const c = makeCanvas(256, 192);
  const ctx = c.getContext('2d');
  fillBase(ctx, '#6a5a44');
  mottle(ctx, 'corkboard', { cells: 10, octaves: 3, amount: 0.16 });
  const rng = makeRng('notes');
  const notes = [
    ['WATCH BILL', '0400 VOSS', '0800 OKAFOR', '1200 LINDQVIST'],
    ['GALLEY DUTY', 'MON: KAI', 'TUE: R.V.', 'WED: A.O.'],
    ['REMINDER', 'CO2 SCRUB', 'FILTERS @ 1800'],
  ];
  let x = 12;
  for (const note of notes) {
    const w = 70 + rng() * 8, h = 76 + rng() * 20;
    const y = 16 + rng() * 40;
    ctx.save();
    ctx.translate(x + w / 2, y + h / 2);
    ctx.rotate(rng.range(-0.08, 0.08));
    ctx.fillStyle = '#c9c2ac';
    ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.fillStyle = 'rgba(150,150,150,0.8)';
    ctx.fillRect(-6, -h / 2 - 2, 12, 6); // tape
    ctx.fillStyle = '#33322c';
    ctx.font = '9px "DejaVu Sans", sans-serif';
    ctx.textAlign = 'center';
    for (let i = 0; i < note.length; i++) ctx.fillText(note[i], 0, -h / 2 + 16 + i * 13);
    ctx.restore();
    x += w + 10;
  }
  speckle(ctx, 'board-wear', { count: 60, colors: ['rgba(30,25,20,0.3)'], size: 1.5 });
  return c;
}

function mug(color) {
  const g = new THREE.Group();
  g.userData.static = true;
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.35, metalness: 0, envMapIntensity: 0.7 });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.03, 0.08, 12, 1, false), mat);
  body.position.y = 0.04;
  g.add(body);
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.02, 0.006, 6, 12, Math.PI * 1.4), mat);
  handle.position.set(0.036, 0.045, 0);
  handle.rotation.z = -0.6;
  g.add(handle);
  return g;
}

// foul-weather jacket hung from a hook: volumetric cloth mass gathered at the
// hook and flaring to the hem, with hanging sleeves + collar roll. A flattened
// cone with radial fold ridges reads far better in raking light than a plane.
function hangingJacket(mat, seed) {
  const g = new THREE.Group();
  g.userData.static = true;
  const rng = makeRng(seed);
  const h = 0.36;
  const ph = rng.range(0, 6);
  const torsoGeo = new THREE.CylinderGeometry(0.05, 0.112, h, 22, 6, false);
  const pos = torsoGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const r = Math.hypot(x, z);
    if (r < 1e-4) continue;
    const th = Math.atan2(z, x);
    const t = 0.5 - y / h; // 0 top .. 1 hem
    // soft vertical fold ridges, stronger toward the hem
    const fold = 1 + (Math.sin(th * 4 + ph) * 0.09 + Math.sin(th * 7 + ph * 2.3) * 0.045) * (0.3 + 0.7 * t);
    pos.setX(i, x * fold);
    pos.setZ(i, z * fold * 0.46); // flatten front-back
    // uneven hem
    if (t > 0.9) pos.setY(i, y + Math.sin(th * 3 + ph) * 0.012 + Math.sin(th * 6 + ph * 3) * 0.006);
  }
  torsoGeo.computeVertexNormals();
  const torso = new THREE.Mesh(torsoGeo, mat);
  torso.castShadow = true;
  torso.userData.static = true;
  g.add(torso);
  // sleeves hang at the sides, breaking the cone outline, one lower than the other
  for (const s of [-1, 1]) {
    const sLen = s < 0 ? 0.24 : 0.2;
    const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.03, sLen, 10), mat);
    sleeve.position.set(s * 0.094, s < 0 ? -0.055 : -0.03, 0.032);
    sleeve.rotation.z = s * 0.16;
    sleeve.rotation.x = -0.05;
    sleeve.castShadow = true;
    sleeve.userData.static = true;
    g.add(sleeve);
    const cuffFold = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.026, 0.03, 10), mat);
    cuffFold.position.set(s * 0.113, (s < 0 ? -0.055 : -0.03) - sLen / 2 + 0.01, 0.038);
    cuffFold.rotation.z = s * 0.16;
    cuffFold.userData.static = true;
    g.add(cuffFold);
  }
  // collar roll bunched at the gather point, tucked inside the top radius
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.031, 0.011, 7, 14), mat);
  collar.rotation.x = Math.PI / 2 - 0.2;
  collar.rotation.z = 0.12;
  collar.position.set(0.006, h / 2 + 0.002, 0.005);
  collar.userData.static = true;
  g.add(collar);
  // hanging loop reaching up to the hook
  const loop = new THREE.Mesh(new THREE.TorusGeometry(0.011, 0.003, 6, 12), M.bareSteel());
  loop.position.set(0, h / 2 + 0.022, 0.005);
  loop.userData.static = true;
  g.add(loop);
  return g;
}

// rubber sea boot: sole + foot + shaft
function boot() {
  const g = new THREE.Group();
  g.userData.static = true;
  const sole = new THREE.Mesh(K.roundedBox(0.095, 0.028, 0.26, 0.01), M.rubberMat());
  sole.position.y = 0.014;
  sole.userData.static = true;
  g.add(sole);
  const upper = new THREE.Mesh(K.roundedBox(0.088, 0.062, 0.245, 0.022), M.plasticBlack());
  upper.position.set(0, 0.058, -0.004);
  upper.castShadow = true;
  upper.userData.static = true;
  g.add(upper);
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.047, 0.052, 0.17, 10), M.plasticBlack());
  shaft.position.set(0, 0.165, -0.062);
  shaft.userData.static = true;
  g.add(shaft);
  const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.049, 0.049, 0.022, 10), M.rubberMat());
  cuff.position.set(0, 0.252, -0.062);
  cuff.userData.static = true;
  g.add(cuff);
  return g;
}

export function build(ctx) {
  const g = new THREE.Group();
  g.name = 'crewQuarters';
  const C = ctx.collision;

  // shared cloth for bunk curtains + the mess porthole curtain
  const curtainMat = new THREE.MeshStandardMaterial({
    color: 0x4a5548, roughness: 0.95, metalness: 0,
    normalMap: M.fabricBlanket().normalMap, normalScale: new THREE.Vector2(0.7, 0.7),
    side: THREE.DoubleSide, envMapIntensity: 0.25,
  });
  // worn foul-weather jacket cloth: very dark umber so it stays dark even
  // directly under the warm corridor lamps
  const jacketMat = new THREE.MeshStandardMaterial({
    color: 0x35291d, roughness: 0.92, metalness: 0,
    normalMap: M.fabricBlanket().normalMap, normalScale: new THREE.Vector2(0.7, 0.7),
    envMapIntensity: 0.2,
  });

  // ============================ bunks (port) =================================
  // two columns along z, two stacked each: frames + bedding (varied per rack)
  const bunkW = 0.64, bunkL = 1.86;
  let restBunkRoot = null;
  let restHighlight = null;

  const crewNames = ['R. VOSS', 'A. OKAFOR', 'M. LINDQVIST', 'T. KAI'];
  let nameIdx = 0;

  for (const zc of [7.72, 9.68]) {
    const col = new THREE.Group();
    col.position.set(0, 0, zc);
    // vertical posts
    for (const [px, pz] of [[-0.72, -bunkL / 2], [-0.72, bunkL / 2]]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.021, 0.021, 1.86, 10), M.bareSteel());
      post.position.set(px, 0.93, pz);
      post.userData.static = true;
      col.add(post);
    }
    for (const baseY of [0.32, 1.12]) {
      const bunk = new THREE.Group();
      bunk.position.set(-1.02, baseY, 0);
      const rb = makeRng(`bedding:${zc}:${baseY}`);
      const sleptIn = zc > 9 && baseY < 1; // lower aft rack: watch just turned out
      const navy = zc > 9 && baseY >= 1;   // upper aft rack: spare navy-gray blanket
      const blanketMat = navy ? navyBlanket() : M.fabricBlanket();
      // frame rails
      const railF = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.06, bunkL), M.panelPaint('bunkFrame', '#77806f'));
      railF.position.set(0.3, 0, 0);
      bunk.add(railF);
      const railB = railF.clone();
      railB.position.x = -0.31;
      bunk.add(railB);
      // base panel
      const base = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.025, bunkL), M.panelPaint('bunkFrame', '#77806f'));
      base.position.y = -0.02;
      bunk.add(base);
      // mattress
      const mattress = new THREE.Mesh(K.roundedBox(bunkW - 0.06, 0.09, bunkL - 0.06, 0.03), M.mattressTicking());
      mattress.position.y = 0.055;
      mattress.castShadow = true;
      bunk.add(mattress);
      // sheet (folded back at head end)
      const sheet = new THREE.Mesh(K.roundedBox(bunkW - 0.08, 0.03, (bunkL - 0.12) * 0.72, 0.014), M.fabricSheet());
      sheet.position.set(0, 0.11, 0.11);
      bunk.add(sheet);

      const bLen = (bunkL - 0.1) * 0.62;
      const headEdge = 0.22 - bLen / 2;
      if (!sleptIn) {
        // ---- made-up rack: blanket with fold, sheet cuff, drape over the rail
        const rotY = rb.range(-0.022, 0.022);
        const blanket = new THREE.Mesh(K.roundedBox(bunkW - 0.05, 0.045, bLen, 0.02), blanketMat);
        blanket.position.set(0, 0.115, 0.22);
        blanket.rotation.set(0.012 + rb.range(-0.004, 0.008), rotY, rb.range(0.004, 0.012));
        blanket.castShadow = true;
        bunk.add(blanket);
        // fold band overlapping the blanket head edge (slightly wider = lip)
        const fold = new THREE.Mesh(K.roundedBox(bunkW - 0.04, 0.03, 0.18, 0.013), blanketMat);
        fold.position.set(0, 0.146, headEdge + 0.06);
        fold.rotation.y = rotY + rb.range(-0.05, 0.05);
        bunk.add(fold);
        // sheet cuff turned back over the blanket
        const cuff = new THREE.Mesh(K.roundedBox(bunkW - 0.075, 0.018, 0.11, 0.008), M.fabricSheet());
        cuff.position.set(0, 0.164, headEdge + 0.045);
        cuff.rotation.y = fold.rotation.y * 0.8;
        bunk.add(cuff);
        // drape: blanket tucks over the walkway rail and hangs down
        const dLen = bLen * rb.range(0.85, 0.93);
        const dz = 0.22 + rb.range(-0.02, 0.02);
        const flap = new THREE.Mesh(K.roundedBox(0.11, 0.02, dLen, 0.009), blanketMat);
        flap.position.set(0.312, 0.098, dz);
        flap.rotation.set(0, rotY * 0.7, -0.5);
        bunk.add(flap);
        const drape = new THREE.Mesh(K.roundedBox(0.02, 0.15, dLen * 0.97, 0.009), blanketMat);
        drape.position.set(0.354, 0.02, dz);
        drape.rotation.set(rb.range(-0.01, 0.01), rotY * 0.7, -0.09);
        drape.castShadow = true;
        bunk.add(drape);
        // dented pillow: two rounded boxes intersecting at an angle
        const pillow = new THREE.Mesh(K.roundedBox(0.34, 0.062, 0.26, 0.03), M.fabricSheet());
        pillow.position.set(-0.01, 0.108, -bunkL / 2 + 0.2);
        pillow.rotation.set(-0.05, 0.05 + rb.range(-0.06, 0.06), 0);
        pillow.castShadow = true;
        bunk.add(pillow);
        const dent = new THREE.Mesh(K.roundedBox(0.27, 0.05, 0.19, 0.024), M.fabricSheet());
        dent.position.set(0.02, 0.126, -bunkL / 2 + 0.185);
        dent.rotation.set(0, 0.34 + rb.range(-0.1, 0.1), 0.05);
        bunk.add(dent);
        if (zc < 9 && baseY < 1) { restBunkRoot = bunk; restHighlight = blanket; }
      } else {
        // ---- slept-in rack: blanket thrown back diagonally, flat askew pillow
        const rumple = new THREE.Mesh(K.roundedBox(0.34, 0.02, 0.5, 0.009), M.fabricSheet());
        rumple.position.set(-0.06, 0.124, -0.18);
        rumple.rotation.y = 0.38;
        bunk.add(rumple);
        const blanket = new THREE.Mesh(K.roundedBox(bunkW - 0.03, 0.05, 0.92, 0.02), blanketMat);
        blanket.position.set(0.05, 0.112, 0.44);
        blanket.rotation.set(0.015, -0.24, 0.03);
        blanket.castShadow = true;
        bunk.add(blanket);
        const wedge = new THREE.Mesh(K.roundedBox(0.5, 0.055, 0.56, 0.022), blanketMat);
        wedge.position.set(-0.05, 0.152, 0.3);
        wedge.rotation.set(0.02, 0.6, 0.04);
        wedge.castShadow = true;
        bunk.add(wedge);
        const flap = new THREE.Mesh(K.roundedBox(0.12, 0.02, 0.6, 0.009), blanketMat);
        flap.position.set(0.312, 0.093, 0.5);
        flap.rotation.z = -0.55;
        bunk.add(flap);
        const drape = new THREE.Mesh(K.roundedBox(0.02, 0.18, 0.56, 0.009), blanketMat);
        drape.position.set(0.356, 0.0, 0.52);
        drape.rotation.z = -0.13;
        drape.castShadow = true;
        bunk.add(drape);
        // flat pillow, no fluff, askew
        const pillow = new THREE.Mesh(K.roundedBox(0.34, 0.028, 0.26, 0.012), M.fabricSheet());
        pillow.position.set(-0.025, 0.1, -0.7);
        pillow.rotation.y = -0.32;
        bunk.add(pillow);
        // paperback left face-down on the mattress
        const pback = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.02, 0.16), M.panelPaint('book1', '#3a4a5a'));
        pback.position.set(0.13, 0.118, -0.34);
        pback.rotation.y = -0.55;
        pback.userData.static = true;
        bunk.add(pback);
      }
      // lee strap (keeps sleeper in): canvas strap diagonal
      const strap = new THREE.Mesh(new THREE.PlaneGeometry(0.05, 0.5), M.fabricSheet());
      strap.position.set(0.315, 0.12, 0.32);
      strap.rotation.y = Math.PI / 2;
      strap.rotation.x = 0.25;
      strap.userData.static = true;
      bunk.add(strap);
      // reading light
      const rl = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.036, 0.05, 10, 1, true), M.darkSteel());
      rl.position.set(-0.24, 0.52, -bunkL / 2 + 0.16);
      rl.rotation.z = 1.0;
      rl.material.side = THREE.DoubleSide;
      bunk.add(rl);
      const rlGlow = new THREE.Mesh(new THREE.CircleGeometry(0.024, 10), M.instrumentLampMaterial('#ffd9a3', 2.1));
      rlGlow.position.set(-0.215, 0.505, -bunkL / 2 + 0.16);
      rlGlow.rotation.z = 1.0;
      rlGlow.rotation.y = 1.2;
      bunk.add(rlGlow);
      const rLight = new THREE.PointLight(0xffd9a3, 4.2, 1.3, 2);
      rLight.position.set(-0.15, 0.38, -bunkL / 2 + 0.28);
      bunk.add(rLight);
      ctx.lights.register({ light: rLight, lampMats: [rlGlow.material], role: 'reading' });
      // name plate on the rail face
      const name = new THREE.Mesh(new THREE.PlaneGeometry(0.17, 0.045),
        M.labelMaterial(crewNames[nameIdx++ % 4], { w: 160, h: 44, size: 20 }));
      name.position.set(0.325, 0, -bunkL / 2 + 0.3);
      name.rotation.y = Math.PI / 2;
      bunk.add(name);
      col.add(bunk);
    }
    // curtain rail + partially drawn curtain on upper bunk
    const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, bunkL, 8), M.bareSteel());
    rail.rotation.x = Math.PI / 2;
    rail.position.set(-0.7, 1.78, 0);
    rail.userData.static = true;
    col.add(rail);
    const curtain = clothPlane(0.5, 0.62, curtainMat, 'curtain' + zc, 0.045);
    curtain.rotation.y = Math.PI / 2;
    curtain.position.set(-0.7, 1.46, -bunkL / 2 + 0.28);
    col.add(curtain);
    // lower bunk curtain, mostly open
    const curtain2 = clothPlane(0.3, 0.6, curtainMat, 'curtain2' + zc, 0.05);
    curtain2.rotation.y = Math.PI / 2;
    curtain2.position.set(-0.7, 0.62, bunkL / 2 - 0.18);
    col.add(curtain2);
    // hanging jacket on a hook at the aft bunk end (aft column only),
    // hung low on the post so it clears the walkway grab rail above
    if (zc > 9) {
      const hookBase = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.013, 0.012, 8), M.gunmetal());
      hookBase.rotation.x = Math.PI / 2;
      hookBase.position.set(-0.72, 1.415, bunkL / 2 + 0.015);
      hookBase.userData.static = true;
      col.add(hookBase);
      const hookArm = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.05, 6), M.bareSteel());
      hookArm.rotation.x = Math.PI / 2 - 0.4;
      hookArm.position.set(-0.72, 1.424, bunkL / 2 + 0.04);
      hookArm.userData.static = true;
      col.add(hookArm);
      const hookTip = new THREE.Mesh(new THREE.SphereGeometry(0.0075, 8, 6), M.bareSteel());
      hookTip.position.set(-0.72, 1.434, bunkL / 2 + 0.062);
      hookTip.userData.static = true;
      col.add(hookTip);
      const jacket = hangingJacket(jacketMat, 'jacket:' + zc);
      jacket.position.set(-0.722, 1.222, bunkL / 2 + 0.068);
      jacket.rotation.y = 0.3;
      jacket.rotation.z = 0.03;
      col.add(jacket);
      C.addBox([-0.86, 0.9, zc + bunkL / 2 - 0.02], [-0.6, 1.5, zc + bunkL / 2 + 0.16], { name: 'jacket' + zc });
    }
    g.add(col);
    C.addBox([-1.45, 0, zc - bunkL / 2 - 0.05], [-0.68, 1.9, zc + bunkL / 2 + 0.05], { name: 'bunks' + zc });
  }

  // sea boots tucked under the slept-in lower bunk, toes poking out
  const rBoots = makeRng('boots');
  const b1 = boot();
  b1.position.set(-0.8, 0.001, 9.33);
  b1.rotation.y = 1.62 + rBoots.range(-0.1, 0.1);
  g.add(b1);
  const b2 = boot();
  b2.position.set(-0.92, 0.001, 9.46);
  b2.rotation.y = 1.28 + rBoots.range(-0.1, 0.1);
  g.add(b2);

  // postcard + day-count note taped to the hull inside the slept-in bunk
  const postcard = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.075), new THREE.MeshStandardMaterial({
    map: canvasTexture(postcardCanvas(), { srgb: true, wrap: false }), roughness: 0.85, metalness: 0, envMapIntensity: 0.25,
  }));
  postcard.position.set(-1.612, 0.78, 9.32);
  postcard.rotation.set(0, Math.PI / 2, 0.07);
  postcard.userData.static = true;
  g.add(postcard);
  const tally = new THREE.Mesh(new THREE.PlaneGeometry(0.078, 0.052),
    M.labelMaterial('93 DAYS', { w: 96, h: 64, size: 17, bg: '#c9c2ac', border: false }));
  tally.position.set(-1.604, 0.672, 9.15);
  tally.rotation.set(0, Math.PI / 2, -0.05);
  tally.userData.static = true;
  g.add(tally);

  // cubbies between bunk columns
  const cubby = new THREE.Group();
  cubby.position.set(-1.15, 0, 8.7);
  for (let i = 0; i < 3; i++) {
    const box = new THREE.Mesh(K.roundedBox(0.34, 0.3, 0.5, 0.01), M.cabinetGreen());
    box.position.y = 0.35 + i * 0.52;
    box.rotation.y = Math.PI / 2;
    cubby.add(box);
  }
  // paperback stack + enamel mug on the TOP cubby (visible from the walkway)
  const rngProps = makeRng('cubby-props');
  const bookCols = ['#5a4a3a', '#3a4a5a', '#4a3a3a'];
  for (let i = 0; i < 3; i++) {
    const book = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.02, 0.18), M.panelPaint('book' + i, bookCols[i]));
    book.position.set(0.02 + rngProps.range(-0.018, 0.018), 1.551 + i * 0.021, 0.03 + rngProps.range(-0.02, 0.02));
    book.rotation.y = rngProps.range(-0.28, 0.28);
    book.userData.static = true;
    cubby.add(book);
  }
  const cMug = mug('#b3ada0');
  cMug.position.set(-0.06, 1.541, -0.15);
  cMug.rotation.y = 2.4;
  cubby.add(cMug);
  const cMugRim = new THREE.Mesh(new THREE.TorusGeometry(0.0335, 0.004, 6, 14), M.gunmetal());
  cMugRim.rotation.x = Math.PI / 2;
  cMugRim.position.set(-0.06, 1.621, -0.15);
  cMugRim.userData.static = true;
  cubby.add(cMugRim);
  // one more book on the middle shelf
  const midBook = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.02, 0.18), M.panelPaint('book0', bookCols[0]));
  midBook.position.set(0.03, 1.031, 0);
  midBook.rotation.y = 0.5;
  midBook.userData.static = true;
  cubby.add(midBook);
  g.add(cubby);

  // ============================ lockers (starboard fwd) ======================
  const lockers = new THREE.Group();
  lockers.position.set(1.18, 0, 7.75);
  lockers.rotation.y = -Math.PI / 2;
  for (let i = 0; i < 2; i++) {
    const lk = new THREE.Mesh(K.roundedBox(0.44, 1.68, 0.42, 0.012), M.cabinetGreen());
    lk.position.set(-0.23 + i * 0.47, 0.86, 0);
    lk.castShadow = true; lk.receiveShadow = true;
    lockers.add(lk);
    const vent = K.ventGrille(0.3, 0.09, { mat: M.cabinetGreen() });
    vent.position.set(-0.23 + i * 0.47, 0.3, 0.215);
    lockers.add(vent);
    const vent2 = K.ventGrille(0.3, 0.09, { mat: M.cabinetGreen() });
    vent2.position.set(-0.23 + i * 0.47, 1.5, 0.215);
    lockers.add(vent2);
    const latch = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.09, 0.03), M.bareSteel());
    latch.position.set(-0.06 + i * 0.47, 0.95, 0.22);
    lockers.add(latch);
    const num = new THREE.Mesh(new THREE.PlaneGeometry(0.09, 0.05),
      M.labelMaterial(String(i + 1), { w: 64, h: 40, size: 26 }));
    num.position.set(-0.23 + i * 0.47, 1.62, 0.216);
    lockers.add(num);
  }
  g.add(lockers);
  C.addBox([0.94, 0, 7.28], [1.5, 1.75, 8.24], { name: 'lockers' });

  // ============================ galley (starboard) ===========================
  const galley = new THREE.Group();
  galley.position.set(1.12, 0, 9.65);
  galley.rotation.y = -Math.PI / 2;
  // counter
  const counter = new THREE.Mesh(K.roundedBox(2.2, 0.06, 0.56, 0.012), M.bareSteel());
  counter.position.y = 0.9;
  counter.castShadow = true;
  galley.add(counter);
  // fiddles (sea rails on counter edge)
  for (const dz of [0.27, -0.27]) {
    const fiddle = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.05, 0.012), M.bareSteel());
    fiddle.position.set(0, 0.955, dz);
    galley.add(fiddle);
  }
  // under-counter cabinets
  const under = new THREE.Mesh(K.roundedBox(2.16, 0.82, 0.52, 0.012), M.cabinetGreen());
  under.position.y = 0.44;
  galley.add(under);
  for (let i = 0; i < 3; i++) {
    const door = new THREE.Mesh(K.roundedBox(0.6, 0.66, 0.02, 0.01), M.cabinetGreen());
    door.position.set(-0.7 + i * 0.7, 0.42, 0.265);
    galley.add(door);
    const dh = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.1, 0.028), M.bareSteel());
    dh.position.set(-0.48 + i * 0.7, 0.42, 0.28);
    galley.add(dh);
  }
  // sink
  const sinkCut = new THREE.Mesh(K.roundedBox(0.4, 0.16, 0.32, 0.02), M.whiteEnamel());
  sinkCut.position.set(-0.62, 0.845, 0);
  galley.add(sinkCut);
  const sinkIn = new THREE.Mesh(K.roundedBox(0.34, 0.13, 0.26, 0.02), M.darkSteel());
  sinkIn.position.set(-0.62, 0.87, 0);
  galley.add(sinkIn);
  const tap = K.pipeRun([[-0.82, 0.94, 0], [-0.82, 1.12, 0], [-0.62, 1.12, 0], [-0.62, 1.05, 0]], {
    r: 0.014, material: M.chrome(), flanges: 'none', cornerR: 0.05, capEnds: true,
  });
  galley.add(tap);
  const tapWheelA = K.valveWheel(0.03, M.functionalRedPaint());
  tapWheelA.rotation.x = Math.PI / 2;
  tapWheelA.position.set(-0.82, 1.0, 0.08);
  galley.add(tapWheelA);
  // two-burner cooktop with pot rails
  const stove = new THREE.Mesh(K.roundedBox(0.6, 0.035, 0.42, 0.01), M.gunmetal());
  stove.position.set(0.35, 0.93, 0);
  galley.add(stove);
  for (const dx of [0.18, 0.52]) {
    const burner = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.1, 0.018, 16), M.oilySteel());
    burner.position.set(dx, 0.952, 0);
    galley.add(burner);
    const potRail = new THREE.Mesh(new THREE.TorusGeometry(0.115, 0.008, 6, 16), M.bareSteel());
    potRail.rotation.x = Math.PI / 2;
    potRail.position.set(dx, 0.975, 0);
    galley.add(potRail);
  }
  // kettle on burner 1
  const kettle = new THREE.Group();
  const kBody = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.09, 0.12, 14), M.bareSteel());
  kBody.position.y = 0.06;
  kettle.add(kBody);
  const kSpout = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.02, 0.1, 8), M.bareSteel());
  kSpout.position.set(0.09, 0.09, 0);
  kSpout.rotation.z = -0.7;
  kettle.add(kSpout);
  const kHandle = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.008, 6, 12, Math.PI), M.bakelite());
  kHandle.position.y = 0.13;
  kettle.add(kHandle);
  kettle.position.set(0.18, 0.955, 0);
  kettle.userData.static = true;
  galley.add(kettle);
  // stock pot with lid on burner 2
  const pot = new THREE.Group();
  pot.userData.static = true;
  const pBody = new THREE.Mesh(new THREE.CylinderGeometry(0.082, 0.086, 0.105, 14), M.bareSteel());
  pBody.position.y = 0.0525;
  pot.add(pBody);
  const pLid = new THREE.Mesh(new THREE.CylinderGeometry(0.088, 0.088, 0.012, 14), M.bareSteel());
  pLid.position.y = 0.111;
  pot.add(pLid);
  const pBail = new THREE.Mesh(new THREE.TorusGeometry(0.026, 0.005, 6, 12, Math.PI), M.bakelite());
  pBail.position.y = 0.118;
  pot.add(pBail);
  for (const s of [-1, 1]) {
    const ph = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.011, 0.02), M.bakelite());
    ph.position.set(s * 0.097, 0.085, 0);
    pot.add(ph);
  }
  pot.position.set(0.52, 0.961, 0);
  pot.rotation.y = 0.6;
  galley.add(pot);
  // dish rack with two plates on a drip tray
  const tray = new THREE.Mesh(K.roundedBox(0.28, 0.014, 0.18, 0.006), M.bareSteel());
  tray.position.set(-0.15, 0.94, 0.03);
  galley.add(tray);
  for (const hx of [-0.25, -0.16, -0.07]) {
    const hoop = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.0035, 5, 12, Math.PI), M.bareSteel());
    hoop.rotation.y = Math.PI / 2;
    hoop.position.set(hx, 0.948, 0.03);
    hoop.userData.static = true;
    galley.add(hoop);
  }
  for (const px of [-0.205, -0.115]) {
    const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.007, 18), M.whiteEnamel());
    plate.rotation.z = Math.PI / 2 - 0.12;
    plate.position.set(px, 1.026, 0.03);
    plate.userData.static = true;
    galley.add(plate);
  }
  // hand towel draped over the walkway fiddle rail
  const tFold = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.01, 0.08), M.towel());
  tFold.position.set(-0.95, 0.985, 0.268);
  tFold.userData.static = true;
  galley.add(tFold);
  const tOut = clothPlane(0.16, 0.16, M.towel(), 'galley-towel', 0.018);
  tOut.position.set(-0.95, 0.9, 0.297);
  galley.add(tOut);
  const tIn = clothPlane(0.16, 0.09, M.towel(), 'galley-towel-b', 0.012);
  tIn.position.set(-0.945, 0.935, 0.24);
  galley.add(tIn);
  // overhead cabinets with sliding doors
  const ohc = new THREE.Mesh(K.roundedBox(2.0, 0.5, 0.34, 0.012), M.cabinetGreen());
  ohc.position.set(0, 1.72, -0.1);
  galley.add(ohc);
  for (let i = 0; i < 2; i++) {
    const slide = new THREE.Mesh(K.roundedBox(0.46, 0.4, 0.015, 0.008), M.cabinetCream());
    slide.position.set(-0.5 + i * 1.0, 1.72, 0.078 + i * 0.012);
    galley.add(slide);
  }
  const retBar = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 1.9, 8), M.bareSteel());
  retBar.rotation.z = Math.PI / 2;
  retBar.position.set(0, 1.52, 0.1);
  galley.add(retBar);
  // GALLEY label between the sliding doors
  const gLabel = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.065),
    M.labelMaterial('GALLEY', { w: 208, h: 52, size: 28 }));
  gLabel.position.set(0, 1.885, 0.078);
  galley.add(gLabel);
  // labeled storage bins on shelf
  const binLabels = ['RICE', 'TEA', 'COFFEE'];
  for (let i = 0; i < 3; i++) {
    const bin = new THREE.Mesh(K.roundedBox(0.16, 0.2, 0.16, 0.01), M.plasticBeige());
    bin.position.set(0.62 + 0 - i * 0.19, 1.42, 0.02);
    galley.add(bin);
    const bl = new THREE.Mesh(new THREE.PlaneGeometry(0.11, 0.045),
      M.labelMaterial(binLabels[i], { w: 96, h: 40, size: 18 }));
    bl.position.set(0.62 - i * 0.19, 1.42, 0.105);
    galley.add(bl);
  }
  // mugs on hooks under cabinet
  for (let i = 0; i < 3; i++) {
    const m = mug(['#7a4a3a', '#4a5a6a', '#5a6a4a'][i]);
    m.position.set(-0.3 + i * 0.14, 1.38, 0.12);
    m.rotation.y = i;
    galley.add(m);
  }
  // paper towel roll on a bar under the cabinet, by the sink
  for (const ax of [-0.97, -0.73]) {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.16, 0.014), M.bareSteel());
    arm.position.set(ax, 1.39, 0.09);
    arm.userData.static = true;
    galley.add(arm);
  }
  const ptBar = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.26, 8), M.bareSteel());
  ptBar.rotation.z = Math.PI / 2;
  ptBar.position.set(-0.85, 1.315, 0.09);
  galley.add(ptBar);
  const ptRoll = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.052, 0.2, 12), M.fabricSheet());
  ptRoll.rotation.z = Math.PI / 2;
  ptRoll.position.set(-0.85, 1.315, 0.09);
  ptRoll.userData.static = true;
  galley.add(ptRoll);
  const ptSheet = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.12), M.fabricSheet());
  ptSheet.position.set(-0.85, 1.258, 0.143);
  ptSheet.rotation.x = -0.06;
  ptSheet.userData.static = true;
  galley.add(ptSheet);
  // galley extract hood + duct
  const hood = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.16, 0.2, 4), M.galvanized());
  hood.rotation.y = Math.PI / 4;
  hood.position.set(0.35, 2.0, -0.12);
  galley.add(hood);
  g.add(galley);
  C.addBox([0.82, 0, 8.55], [1.5, 1.05, 10.78], { name: 'galley' });

  // ============================ mess corner (port aft) =======================
  const mess = new THREE.Group();
  mess.position.set(-1.34, 0, 11.6); // against port hull
  mess.rotation.y = Math.PI / 2;
  // bench along the hull
  const bench = new THREE.Mesh(K.roundedBox(0.9, 0.06, 0.34, 0.02), M.vinylSeat());
  bench.position.set(0, 0.46, 0.2);
  bench.castShadow = true;
  mess.add(bench);
  const benchBase = new THREE.Mesh(K.roundedBox(0.84, 0.4, 0.3, 0.01), M.cabinetGreen());
  benchBase.position.set(0, 0.22, 0.2);
  mess.add(benchBase);
  // fold-down table between bench and walkway, on hinge brackets from the bunk post
  const table = new THREE.Mesh(K.roundedBox(0.86, 0.035, 0.42, 0.012), M.cabinetCream());
  table.position.set(0, 0.76, 0.58);
  table.castShadow = true;
  mess.add(table);
  for (const dx of [-0.33, 0.33]) {
    const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.02, 0.38), M.bareSteel());
    bracket.position.set(dx, 0.72, 0.52);
    bracket.rotation.x = 0.3;
    mess.add(bracket);
  }
  // single support leg to deck
  const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.024, 0.75, 10), M.bareSteel());
  leg.position.set(0, 0.38, 0.74);
  mess.add(leg);
  // open condiment caddy on the table: base tray, end plates, bottles, shakers
  const caddy = new THREE.Group();
  caddy.userData.static = true;
  const cBase = new THREE.Mesh(K.roundedBox(0.17, 0.012, 0.1, 0.004), M.bareSteel());
  cBase.position.y = 0.006;
  caddy.add(cBase);
  for (const ex of [-0.079, 0.079]) {
    const end = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.06, 0.1), M.bareSteel());
    end.position.set(ex, 0.036, 0);
    end.userData.static = true;
    caddy.add(end);
  }
  const cRailTop = new THREE.Mesh(new THREE.CylinderGeometry(0.0035, 0.0035, 0.158, 6), M.bareSteel());
  cRailTop.rotation.z = Math.PI / 2;
  cRailTop.position.set(0, 0.062, -0.044);
  cRailTop.userData.static = true;
  caddy.add(cRailTop);
  const sauce = new THREE.Mesh(new THREE.CylinderGeometry(0.0155, 0.017, 0.085, 10), M.panelPaint('sauceBottle', '#7a2a1e'));
  sauce.position.set(-0.045, 0.055, 0.014);
  sauce.userData.static = true;
  caddy.add(sauce);
  const sauceCap = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.018, 8), M.gunmetal());
  sauceCap.position.set(-0.045, 0.106, 0.014);
  sauceCap.userData.static = true;
  caddy.add(sauceCap);
  const vinegar = new THREE.Mesh(new THREE.CylinderGeometry(0.0145, 0.016, 0.078, 10), M.panelPaint('vinegarBottle', '#8a6a2a'));
  vinegar.position.set(-0.005, 0.051, -0.02);
  vinegar.userData.static = true;
  caddy.add(vinegar);
  const vinCap = new THREE.Mesh(new THREE.CylinderGeometry(0.0085, 0.0085, 0.016, 8), M.plasticBlack());
  vinCap.position.set(-0.005, 0.098, -0.02);
  vinCap.userData.static = true;
  caddy.add(vinCap);
  for (const [sx, sz] of [[0.042, 0.016], [0.062, -0.022]]) {
    const shaker = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.012, 0.04, 8), M.whiteEnamel());
    shaker.position.set(sx, 0.032, sz);
    shaker.userData.static = true;
    caddy.add(shaker);
    const sCap = new THREE.Mesh(new THREE.CylinderGeometry(0.0105, 0.0105, 0.008, 8), M.gunmetal());
    sCap.position.set(sx, 0.056, sz);
    sCap.userData.static = true;
    caddy.add(sCap);
  }
  caddy.position.set(-0.26, 0.7825, 0.52);
  caddy.rotation.y = 0.12;
  mess.add(caddy);
  const tMug = mug('#6a4a3a');
  tMug.position.set(0.2, 0.78, 0.62);
  tMug.rotation.y = 2.2;
  mess.add(tMug);
  // dog-eared paperback left on the bench
  const benchBook = new THREE.Group();
  benchBook.userData.static = true;
  const bbCover = new THREE.Mesh(new THREE.BoxGeometry(0.105, 0.021, 0.155), M.panelPaint('bookMustard', '#8a6a30'));
  bbCover.userData.static = true;
  benchBook.add(bbCover);
  const bbPages = new THREE.Mesh(new THREE.BoxGeometry(0.098, 0.014, 0.148), M.plasticBeige());
  bbPages.position.set(0.005, 0.0, 0.004);
  bbPages.userData.static = true;
  benchBook.add(bbPages);
  benchBook.position.set(0.27, 0.512, 0.16);
  benchBook.rotation.y = -0.4;
  mess.add(benchBook);
  // dominoes mid-game: scatter + one stacked pair
  const rngDom = makeRng('dominoes');
  const domGeo = K.roundedBox(0.042, 0.009, 0.021, 0.003);
  let lastDom = null;
  for (let i = 0; i < 6; i++) {
    const d = new THREE.Mesh(domGeo, M.plasticBeige());
    d.position.set(0.02 + rngDom.range(-0.11, 0.13), 0.7825, 0.5 + rngDom.range(-0.07, 0.09));
    d.rotation.y = rngDom.range(0, 3.1);
    d.userData.static = true;
    mess.add(d);
    lastDom = d;
  }
  const domTop = new THREE.Mesh(domGeo, M.plasticBeige());
  domTop.position.set(lastDom.position.x, 0.7915, lastDom.position.z);
  domTop.rotation.y = lastDom.rotation.y + 0.4;
  domTop.userData.static = true;
  mess.add(domTop);
  // enamel jug
  const jug = new THREE.Group();
  jug.userData.static = true;
  const jBody = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.057, 0.15, 14), M.whiteEnamel());
  jBody.position.y = 0.075;
  jug.add(jBody);
  const jRim = new THREE.Mesh(new THREE.TorusGeometry(0.0485, 0.0042, 6, 14), M.gunmetal());
  jRim.rotation.x = Math.PI / 2;
  jRim.position.y = 0.148;
  jug.add(jRim);
  const jBand = new THREE.Mesh(new THREE.CylinderGeometry(0.0577, 0.0578, 0.012, 14), M.gunmetal());
  jBand.position.y = 0.008;
  jug.add(jBand);
  const jHandle = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.0055, 6, 12, Math.PI * 1.4), M.whiteEnamel());
  jHandle.position.set(0.055, 0.085, 0);
  jHandle.rotation.z = -0.6;
  jug.add(jHandle);
  jug.position.set(-0.27, 0.7775, 0.67);
  jug.rotation.y = -2.28; // handle silhouettes toward the aft walkway
  mess.add(jug);
  g.add(mess);
  // porthole curtain, drawn aft clear of the deadlight keep-out
  const cRail = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.86, 8), M.bareSteel());
  cRail.rotation.x = Math.PI / 2;
  cRail.position.set(-1.27, 1.84, 11.7);
  cRail.userData.static = true;
  g.add(cRail);
  for (const bz of [11.29, 12.11]) {
    const brk = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.014, 0.014), M.bareSteel());
    brk.position.set(-1.295, 1.84, bz);
    brk.userData.static = true;
    g.add(brk);
  }
  for (const rz of [11.34, 11.52, 11.88, 11.98, 12.08]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.016, 0.003, 5, 10), M.bareSteel());
    ring.position.set(-1.27, 1.835, rz);
    ring.userData.static = true;
    g.add(ring);
  }
  const pCurtain = clothPlane(0.34, 0.62, curtainMat, 'porthole-curtain', 0.05);
  pCurtain.rotation.y = Math.PI / 2;
  pCurtain.position.set(-1.28, 1.51, 12.0);
  g.add(pCurtain);
  // pin board on the hull above the fold-table end (clear of the porthole)
  const boardMat = new THREE.MeshStandardMaterial({
    map: canvasTexture(pinBoardCanvas(), { srgb: true, wrap: false }), roughness: 0.85, metalness: 0, envMapIntensity: 0.3,
  });
  const board = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.42), boardMat);
  board.position.set(-1.447, 1.3, 10.96);
  board.rotation.y = Math.PI / 2;
  board.rotation.x = -0.18; // slight lean with hull curvature
  board.userData.static = true;
  g.add(board);
  const boardFrame = new THREE.Mesh(K.roundedBox(0.56, 0.48, 0.02, 0.008), M.panelPaint('boardFrame', '#5a5148'));
  boardFrame.position.set(-1.462, 1.3, 10.96);
  boardFrame.rotation.y = Math.PI / 2;
  boardFrame.rotation.x = -0.18;
  boardFrame.userData.static = true;
  g.add(boardFrame);
  C.addBox([-1.5, 0, 11.14], [-0.58, 0.95, 12.06], { name: 'mess' });

  // ============================ washroom alcove (stbd aft) ===================
  const wash = new THREE.Group();
  wash.position.set(1.05, 0, 11.8);
  wash.rotation.y = -Math.PI / 2;
  // partition walls: paneled, kick plates, cap + edge trim (no more bare slab)
  const partMat = M.panelPaint('washPart', '#7b8377');
  const trimMat = M.panelPaint('boardFrame', '#5a5148');
  for (const dx of [-0.78, 0.78]) {
    const part = new THREE.Mesh(new THREE.BoxGeometry(0.044, 2.05, 0.6), partMat);
    part.position.set(dx, 1.02, 0.12);
    part.castShadow = true; part.receiveShadow = true;
    part.userData.static = true;
    wash.add(part);
    for (const fs of [-1, 1]) {
      const fx = dx + fs * 0.026;
      for (const sz of [-0.06, 0.12, 0.3]) {
        const seam = new THREE.Mesh(new THREE.BoxGeometry(0.007, 1.6, 0.013), M.gunmetal());
        seam.position.set(fx, 1.08, sz);
        seam.userData.static = true;
        wash.add(seam);
      }
      const kick = new THREE.Mesh(new THREE.BoxGeometry(0.009, 0.2, 0.56), M.gunmetal());
      kick.position.set(fx, 0.11, 0.12);
      kick.userData.static = true;
      wash.add(kick);
      const cap = new THREE.Mesh(new THREE.BoxGeometry(0.009, 0.06, 0.56), trimMat);
      cap.position.set(fx, 1.95, 0.12);
      cap.userData.static = true;
      wash.add(cap);
    }
    const edge = new THREE.Mesh(new THREE.BoxGeometry(0.056, 2.05, 0.016), trimMat);
    edge.position.set(dx, 1.02, 0.425);
    edge.userData.static = true;
    wash.add(edge);
  }
  // coat hooks + towel on the forward partition face (seen from the walkway)
  for (const hz of [0.0, 0.14, 0.28]) {
    const hPlate = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.05, 0.03), M.gunmetal());
    hPlate.position.set(-0.812, 1.6, hz);
    hPlate.userData.static = true;
    wash.add(hPlate);
    const hArm = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.05, 6), M.bareSteel());
    hArm.rotation.z = Math.PI / 2;
    hArm.position.set(-0.84, 1.598, hz);
    hArm.userData.static = true;
    wash.add(hArm);
    const hTip = new THREE.Mesh(new THREE.SphereGeometry(0.008, 8, 6), M.bareSteel());
    hTip.position.set(-0.862, 1.612, hz);
    hTip.userData.static = true;
    wash.add(hTip);
  }
  const hookTowel = clothPlane(0.13, 0.22, M.towel(), 'wash-hook-towel', 0.02);
  hookTowel.rotation.y = -Math.PI / 2;
  hookTowel.position.set(-0.85, 1.49, 0.14);
  wash.add(hookTowel);
  // sliding door on an overhead track, slid well open (VACANT)
  const doorMat = M.cabinetGreen();
  const doorTrack = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.045, 0.07), M.bareSteel());
  doorTrack.position.set(-0.1, 2.03, 0.44);
  doorTrack.userData.static = true;
  wash.add(doorTrack);
  const doorG = new THREE.Group();
  doorG.position.set(-0.58, 1.02, 0.44);
  const slab = new THREE.Mesh(K.roundedBox(0.7, 1.9, 0.028, 0.01), doorMat);
  slab.castShadow = true;
  slab.userData.static = true;
  doorG.add(slab);
  // vertical seam lines (recessed strips)
  for (const sx of [-0.115, 0.115]) {
    const seam = new THREE.Mesh(new THREE.BoxGeometry(0.012, 1.42, 0.005), M.gunmetal());
    seam.position.set(sx, 0.06, 0.016);
    seam.userData.static = true;
    doorG.add(seam);
  }
  // stiles + rails framing the panel
  for (const sx of [-0.325, 0.325]) {
    const stile = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.9, 0.007), trimMat);
    stile.position.set(sx, 0, 0.015);
    stile.userData.static = true;
    doorG.add(stile);
  }
  for (const [ry, rh] of [[0.905, 0.09], [-0.62, 0.05]]) {
    const railP = new THREE.Mesh(new THREE.BoxGeometry(0.6, rh, 0.007), trimMat);
    railP.position.set(0, ry, 0.015);
    railP.userData.static = true;
    doorG.add(railP);
  }
  // kick plate + louver vent
  const dKick = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.2, 0.009), M.gunmetal());
  dKick.position.set(0, -0.83, 0.019);
  dKick.userData.static = true;
  doorG.add(dKick);
  const dVent = K.ventGrille(0.26, 0.12, { mat: doorMat });
  dVent.position.set(0, -0.52, 0.026);
  doorG.add(dVent);
  // pull, labels, OCCUPIED/VACANT slider
  const doorPull = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.15, 0.032), M.bareSteel());
  doorPull.position.set(0.3, -0.02, 0.028);
  doorPull.userData.static = true;
  doorG.add(doorPull);
  const wcLabel = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 0.052),
    M.labelMaterial('WASHRM', { w: 128, h: 44, size: 20 }));
  wcLabel.position.set(0, 0.74, 0.021);
  doorG.add(wcLabel);
  const occBase = new THREE.Mesh(K.roundedBox(0.115, 0.055, 0.012, 0.004), M.bareSteel());
  occBase.position.set(0.19, 0.36, 0.022);
  occBase.userData.static = true;
  doorG.add(occBase);
  const occLabel = new THREE.Mesh(new THREE.PlaneGeometry(0.062, 0.026),
    M.labelMaterial('VACANT', { w: 96, h: 40, size: 19, bg: '#6f7d6d', fg: '#e8e4d8' }));
  occLabel.position.set(0.175, 0.36, 0.0295);
  doorG.add(occLabel);
  const occKnob = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.03, 0.008), M.gunmetal());
  occKnob.position.set(0.225, 0.36, 0.03);
  occKnob.userData.static = true;
  doorG.add(occKnob);
  // hanger rollers up to the track
  for (const sx of [-0.26, 0.26]) {
    const hanger = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.06, 0.01), M.bareSteel());
    hanger.position.set(sx, 0.952, 0.002);
    hanger.userData.static = true;
    doorG.add(hanger);
    const roller = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.016, 10), M.darkSteel());
    roller.rotation.x = Math.PI / 2;
    roller.position.set(sx, 0.985, 0.002);
    roller.userData.static = true;
    doorG.add(roller);
  }
  wash.add(doorG);
  // basin + mirror + towel inside; kept in the middle of the alcove so they
  // read through the open doorway and clear the flood-valve station aft
  const basin = new THREE.Mesh(K.roundedBox(0.4, 0.14, 0.3, 0.03), M.whiteEnamel());
  basin.position.set(-0.05, 0.82, 0.02);
  wash.add(basin);
  const basinIn = new THREE.Mesh(K.roundedBox(0.32, 0.1, 0.22, 0.03), M.whiteEnamel());
  basinIn.position.set(-0.05, 0.85, 0.02);
  wash.add(basinIn);
  const pedestal = new THREE.Mesh(K.roundedBox(0.3, 0.75, 0.24, 0.01), M.cabinetCream());
  pedestal.position.set(-0.05, 0.4, 0.0);
  wash.add(pedestal);
  const wTap = K.pipeRun([[-0.05, 0.9, -0.12], [-0.05, 1.02, -0.12], [-0.05, 1.02, -0.02]], {
    r: 0.011, material: M.chrome(), flanges: 'none', cornerR: 0.03,
  });
  wash.add(wTap);
  const mirror = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.4), new THREE.MeshStandardMaterial({
    color: 0xcfd8d4, roughness: 0.03, metalness: 1.0, envMapIntensity: 2.0,
  }));
  mirror.position.set(-0.05, 1.42, -0.14);
  mirror.userData.static = true;
  wash.add(mirror);
  const mirrorFrame = new THREE.Mesh(K.roundedBox(0.35, 0.45, 0.02, 0.008), M.bareSteel());
  mirrorFrame.position.set(-0.05, 1.42, -0.15);
  wash.add(mirrorFrame);
  // small lamp over the mirror
  const lampBar = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.24, 8), M.bareSteel());
  lampBar.rotation.z = Math.PI / 2;
  lampBar.position.set(-0.05, 1.7, -0.125);
  lampBar.userData.static = true;
  wash.add(lampBar);
  const lampTube = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.2, 8), M.instrumentLampMaterial('#ffe6c0', 1.7));
  lampTube.rotation.z = Math.PI / 2;
  lampTube.position.set(-0.05, 1.688, -0.106);
  lampTube.userData.static = true;
  wash.add(lampTube);
  // towel ring + towel on the aft partition inner face
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.008, 6, 16), M.chrome());
  ring.position.set(0.71, 1.15, 0.1);
  ring.rotation.y = Math.PI / 2;
  wash.add(ring);
  const towel = clothPlane(0.2, 0.3, M.towel(), 'towel', 0.03);
  towel.rotation.y = Math.PI / 2;
  towel.position.set(0.725, 0.98, 0.1);
  wash.add(towel);
  // shelf with bottles + hand-pump soap
  const shelf = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.02, 0.13), M.bareSteel());
  shelf.position.set(-0.05, 1.08, -0.1);
  wash.add(shelf);
  for (let i = 0; i < 2; i++) {
    const bottle = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.022, 0.09, 10), M.plasticBeige());
    bottle.position.set(-0.13 + i * 0.14, 1.14, -0.1);
    wash.add(bottle);
  }
  const pumpBody = new THREE.Mesh(new THREE.CylinderGeometry(0.017, 0.018, 0.075, 10), M.plasticBeige());
  pumpBody.position.set(-0.05, 1.128, -0.1);
  wash.add(pumpBody);
  const pumpNeck = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.028, 8), M.chrome());
  pumpNeck.position.set(-0.05, 1.178, -0.1);
  wash.add(pumpNeck);
  const pumpNozzle = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.007, 0.026), M.chrome());
  pumpNozzle.position.set(-0.05, 1.19, -0.087);
  wash.add(pumpNozzle);
  // duckboard grate on the wet floor
  const duck = K.floorGrate(0.36, 0.4);
  duck.position.set(-0.05, 0.022, 0.12);
  wash.add(duck);
  g.add(wash);
  C.addBox([0.75, 0, 11.15], [1.5, 2.0, 12.5], { name: 'washroom' });
  C.addBox([0.56, 0, 10.85], [0.66, 2.0, 11.6], { name: 'washDoor' });
  C.addBox([0.6, 0, 10.9], [1.24, 2.05, 11.07], { name: 'washPartFwd' });
  C.addBox([0.6, 0, 12.52], [1.24, 2.05, 12.65], { name: 'washPartAft' });

  // ============================ ventilation ==================================
  for (const [x, z] of [[-0.8, 7.0], [-0.8, 10.2], [0.8, 9.6]]) {
    const vent = K.ventGrille(0.34, 0.16, { mat: M.cabinetGray() });
    vent.position.set(x, 2.14, z);
    vent.rotation.x = Math.PI / 2 + (x < 0 ? -0.5 : 0.5);
    g.add(vent);
  }

  // ============================ lighting =====================================
  const mkWarm = (x, z, intensity = 3.2, shadow = false) => {
    const fixture = K.lampCage({ r: 0.06, color: 0xffd9a3, intensity: 2.0 });
    fixture.position.set(x, 2.16, z);
    fixture.rotation.x = Math.PI;
    g.add(fixture);
    const light = new THREE.PointLight(0xffd9a3, intensity, 4.5, 2);
    light.position.set(x, 1.96, z);
    g.add(light);
    ctx.lights.register({ light, lampMats: [fixture.userData.lampMat], role: 'warm' });
    if (shadow) {
      const spot = new THREE.SpotLight(0xffd9a3, intensity * 0.7, 5.5, 1.05, 0.65, 2);
      spot.position.set(x, 2.02, z);
      spot.target.position.set(x * 0.5, 0, z);
      spot.castShadow = true;
      spot.shadow.mapSize.set(512, 512);
      spot.shadow.bias = -0.004;
      g.add(spot, spot.target);
      ctx.lights.register({ light: spot, role: 'warm' });
    }
  };
  mkWarm(-0.55, 8.7, 3.0, true); // over bunks walkway
  mkWarm(0.6, 10.1, 2.8, false); // galley
  mkWarm(-0.6, 11.7, 2.6, false); // mess
  // washroom lamp over the basin (reads through the open door)
  const wLight = new THREE.PointLight(0xffe6c0, 2.6, 2.6, 2);
  wLight.position.set(1.06, 1.72, 11.85);
  g.add(wLight);
  ctx.lights.register({ light: wLight, lampMats: [lampTube.material], role: 'warm' });

  // ============================ rest interaction =============================
  let restBusy = false;
  ctx.interact.register({
    id: 'rest',
    prompt: 'E: Rest',
    root: restBunkRoot,
    highlight: [restHighlight],
    onUse: () => {
      if (restBusy) return;
      restBusy = true;
      ctx.player.setEnabled(false);
      ctx.hud.fadeTo(1, 950).then(() => {
        ctx.env.setState('restCycle', { duration: 0.6 });
        ctx.hud.setStatus('6 hours pass.', 2400);
        ctx.sched.after(1.9, () => {
          ctx.hud.fadeTo(0, 1100).then(() => {
            ctx.player.setEnabled(true);
            ctx.sched.after(1.3, () => {
              ctx.env.setState('cruising', { duration: 5.5 });
              ctx.hud.setStatus('Rested.', 3200);
              restBusy = false;
            });
          });
        });
      });
    },
  });

  return g;
}
