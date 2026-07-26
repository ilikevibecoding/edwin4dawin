import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { getMaterialLib, canvas, tex } from './textures.js';
import { makeRNG } from '../core/math.js';

/**
 * Prop builders. Each returns a THREE.Group positioned at origin; the map
 * places it and registers colliders. Shadows enabled on everything.
 */

const rng = makeRNG(4451);

export function shadow(obj) {
  obj.traverse((o) => {
    if (o.isMesh && !o.userData.noShadow) { o.castShadow = true; o.receiveShadow = true; }
  });
  return obj;
}

let _contactTex = null;
/** Soft dark blob under vehicles/props — subtle contact AO. */
export function addContactShadow(group, w, d, opacity = 0.22, y = 0.024) {
  if (!_contactTex) {
    const c = canvas(128, 128);
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(64, 64, 6, 64, 64, 64);
    g.addColorStop(0, 'rgba(0,0,0,0.9)');
    g.addColorStop(0.6, 'rgba(0,0,0,0.55)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
    _contactTex = tex(c);
    _contactTex.wrapS = _contactTex.wrapT = THREE.ClampToEdgeWrapping;
  }
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(w, d),
    new THREE.MeshBasicMaterial({ map: _contactTex, transparent: true, opacity, depthWrite: false })
  );
  m.rotation.x = -Math.PI / 2;
  m.position.y = y;
  m.renderOrder = 3;
  m.userData.noShadow = true;
  m.castShadow = false;
  group.add(m);
  return m;
}

let _burnTexSet = null;
function burnedMetalMat() {
  if (!_burnTexSet) {
    const size = 512;
    const c = canvas(size, size);
    const ctx = c.getContext('2d');
    const r = makeRNG(6021);
    // Lifted warm-grey base — wrecks should read as rusted metal in
    // daylight, not a featureless black silhouette
    ctx.fillStyle = '#55504a';
    ctx.fillRect(0, 0, size, size);
    // Large soot zones first — the burn core dominates the cabin/top areas
    for (let i = 0; i < 6; i++) {
      const x = r() * size, y = r() * size * 0.6, rad = 110 + r() * 160;
      const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
      g.addColorStop(0, `rgba(30, 26, 22, ${0.4 + r() * 0.25})`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
    // A few large connected rust fields, elongated vertically so they read
    // as heat-run oxidation, not leopard spots. Desaturated, low contrast.
    for (let i = 0; i < 8; i++) {
      const x = r() * size, y = r() * size, rad = 80 + r() * 130;
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(1, 1.7 + r() * 0.6);
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rad);
      g.addColorStop(0, `rgba(112, 66, 40, ${0.22 + r() * 0.2})`);
      g.addColorStop(0.6, `rgba(96, 58, 38, ${0.12 + r() * 0.12})`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(-rad, -rad, rad * 2, rad * 2);
      ctx.restore();
    }
    // Small ash / scorch breakup (rust only occasionally)
    for (let i = 0; i < 220; i++) {
      const x = r() * size, y = r() * size, rad = 4 + r() * 34;
      const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
      const kind = r();
      const col = kind < 0.25 ? '112, 66, 40' : kind < 0.66 ? '138, 132, 122' : '44, 38, 33';
      g.addColorStop(0, `rgba(${col}, ${0.14 + r() * 0.26})`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
    // Vertical scorch streaks running down the panels
    for (let i = 0; i < 90; i++) {
      ctx.fillStyle = `rgba(22, 19, 16, ${0.08 + r() * 0.3})`;
      ctx.fillRect(r() * size, r() * size, 2 + r() * 6, 30 + r() * 130);
    }
    _burnTexSet = tex(c, { srgb: true, repeat: [2, 1] });
  }
  const m = new THREE.MeshStandardMaterial({ map: _burnTexSet, roughness: 0.88, metalness: 0.1 });
  // Ash-grey dusting settled on upward faces
  m.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vBurnN;')
      .replace('#include <defaultnormal_vertex>', '#include <defaultnormal_vertex>\nvBurnN = normalize(mat3(modelMatrix) * objectNormal);');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vBurnN;')
      .replace('#include <map_fragment>', `#include <map_fragment>
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.32, 0.30, 0.27), smoothstep(0.35, 0.9, vBurnN.y) * 0.45);`);
  };
  return m;
}

/* ---------------------------------- cars ---------------------------------- */

const CAR_COLORS = [0xb8b2a4, 0x7a3f34, 0x44586a, 0xc7c9c4, 0x8c8452, 0x3c4438, 0xa88f4a];

let _windshieldMat = null;
/** Hot low-roughness windscreen glass — pings the sky like COD, not a dead hole. */
function windshieldGlass() {
  if (!_windshieldMat) {
    _windshieldMat = new THREE.MeshStandardMaterial({
      color: 0x2e3f4c, roughness: 0.06, metalness: 0.92, envMapIntensity: 4.0,
    });
  }
  return _windshieldMat;
}

export function buildCar({ burned = false, color = null, pickup = false } = {}) {
  const lib = getMaterialLib();
  const g = new THREE.Group();
  const col = color ?? CAR_COLORS[Math.floor(rng() * CAR_COLORS.length)];
  const bodyMat = burned
    ? burnedMetalMat()
    : new THREE.MeshStandardMaterial({ color: col, roughness: 0.58, metalness: 0.18, envMapIntensity: 1.0 });
  if (!burned) {
    // heavy dust desaturation — nothing in this town is freshly washed
    bodyMat.color.lerp(new THREE.Color(0xb0a890), 0.42);
    // World-Y grime: lower third lerps toward blown dust, roof reads
    // slightly brighter than the rockers
    const dust = new THREE.Color(0xb5a586);
    bodyMat.onBeforeCompile = (shader) => {
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nvarying float vCarY;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvCarY = (modelMatrix * vec4(position, 1.0)).y;');
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying float vCarY;')
        .replace('#include <map_fragment>', `#include <map_fragment>
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(${dust.r.toFixed(4)}, ${dust.g.toFixed(4)}, ${dust.b.toFixed(4)}), (1.0 - smoothstep(0.2, 0.8, vCarY)) * 0.6);
  diffuseColor.rgb *= mix(0.9, 1.07, smoothstep(0.4, 1.35, vCarY));`);
    };
  }
  const glassMat = burned ? lib.darkInterior : lib.glassDark;
  const wsMat = burned ? lib.darkInterior : windshieldGlass();

  const L = 4.15, W = 1.85;
  const bottomY = 0.28, archR = 0.46;
  const axFront = -L * 0.32, axRear = L * 0.32;

  // Body: one extruded 2D side profile (hood/cabin/trunk steps) with real
  // wheel-arch cutouts carved into the outline, extruded across the width.
  const profile = new THREE.Shape();
  profile.moveTo(-L / 2, bottomY);
  profile.lineTo(axFront - archR, bottomY);
  profile.absarc(axFront, bottomY, archR, Math.PI, 0, true);
  profile.lineTo(axRear - archR, bottomY);
  profile.absarc(axRear, bottomY, archR, Math.PI, 0, true);
  profile.lineTo(L / 2, bottomY);
  if (pickup) {
    profile.lineTo(L / 2, 0.98);        // tailgate
    profile.lineTo(0.55, 0.98);         // bed rail
    profile.lineTo(0.52, 1.54);         // cab rear (raised greenhouse)
    profile.lineTo(-0.45, 1.56);        // roof
    profile.lineTo(-1.05, 0.94);        // windshield base
    profile.lineTo(-1.95, 0.87);        // hood
    profile.lineTo(-L / 2, 0.8);        // grille top
  } else {
    profile.lineTo(L / 2, 0.62);        // rear face
    profile.lineTo(L / 2 - 0.03, 0.92); // tail top
    profile.lineTo(1.45, 0.98);         // trunk lid
    profile.lineTo(0.82, 1.48);         // C-pillar (raised greenhouse)
    profile.lineTo(-0.28, 1.52);        // roof
    profile.lineTo(-0.95, 0.94);        // windshield base
    profile.lineTo(-1.9, 0.86);         // hood
    profile.lineTo(-L / 2, 0.78);       // grille top
  }
  profile.closePath();
  // Punched side-window openings (real pillars, glass recessed inside)
  const winHole = (pts) => {
    const p = new THREE.Path();
    p.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) p.lineTo(pts[i][0], pts[i][1]);
    p.closePath();
    profile.holes.push(p);
  };
  if (pickup) {
    winHole([[-0.78, 1.04], [0.36, 1.04], [0.36, 1.42], [-0.48, 1.42]]);
  } else {
    winHole([[-0.66, 1.02], [0.05, 1.02], [0.05, 1.38], [-0.34, 1.38]]);
    winHole([[0.2, 1.02], [1.15, 1.02], [0.78, 1.38], [0.2, 1.38]]);
  }
  const bodyGeo = new THREE.ExtrudeGeometry(profile, {
    depth: W - 0.08, bevelEnabled: true, bevelThickness: 0.04,
    bevelSize: 0.04, bevelSegments: 2, curveSegments: 12,
  });
  bodyGeo.translate(0, 0, -(W - 0.08) / 2);
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  g.add(body);

  // Dark underbody / wheel-well fill visible through the arch openings
  const chassis = new THREE.Mesh(new THREE.BoxGeometry(L * 0.76, 0.56, W - 0.42), lib.darkInterior);
  chassis.position.set(0, 0.44, 0);
  g.add(chassis);

  // Recessed side glass behind the punched window openings
  const sideGlass = new THREE.Mesh(
    pickup ? new THREE.BoxGeometry(1.3, 0.46, W - 0.22) : new THREE.BoxGeometry(2.0, 0.46, W - 0.22),
    glassMat
  );
  sideGlass.position.set(pickup ? -0.18 : 0.24, pickup ? 1.23 : 1.2, 0);
  g.add(sideGlass);

  // Windshield / rear glass laid flush on the profile slopes — hot
  // low-roughness glass so it catches a bright sky ping
  const glassOnSlope = (x0, y0, x1, y1, wFrac) => {
    const dx = x1 - x0, dy = y1 - y0;
    const len = Math.hypot(dx, dy);
    const m = new THREE.Mesh(new THREE.BoxGeometry(len * 0.86, 0.03, W * wFrac), wsMat);
    m.rotation.z = Math.atan2(dy, dx);
    m.position.set((x0 + x1) / 2 - (dy / len) * 0.025, (y0 + y1) / 2 + (dx / len) * 0.025, 0);
    g.add(m);
  };
  if (pickup) {
    glassOnSlope(-1.05, 0.94, -0.45, 1.56, 0.78);
  } else {
    glassOnSlope(-0.95, 0.94, -0.28, 1.52, 0.78);
    glassOnSlope(0.82, 1.48, 1.45, 0.98, 0.76);
  }

  if (pickup) {
    // Open bed read: dark floor recessed below the rails
    const bedIn = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.05, W - 0.36), lib.darkInterior);
    bedIn.position.set(1.37, 0.9, 0);
    g.add(bedIn);
  }
  addContactShadow(g, L * 1.2, W * 1.85, 0.42);

  // Wheels tucked flush with the fender plane (inside the arch cutouts),
  // widened, with dark arch interiors directly behind them
  const wheelGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.3, 18);
  wheelGeo.rotateX(Math.PI / 2);
  const hubGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.31, 12);
  hubGeo.rotateX(Math.PI / 2);
  const hubMat = new THREE.MeshStandardMaterial({ color: burned ? 0x1a1a1a : 0x777777, roughness: 0.4, metalness: 0.9 });
  const archInGeo = new THREE.CylinderGeometry(archR - 0.015, archR - 0.015, 0.1, 14);
  archInGeo.rotateX(Math.PI / 2);
  for (const [x, zs] of [[axFront, 1], [axFront, -1], [axRear, 1], [axRear, -1]]) {
    const z = zs * (W / 2 - 0.155);
    const w = new THREE.Mesh(wheelGeo, lib.tire);
    w.position.set(x, 0.36, z);
    g.add(w);
    const h = new THREE.Mesh(hubGeo, hubMat);
    h.position.copy(w.position);
    g.add(h);
    const liner = new THREE.Mesh(archInGeo, lib.darkInterior);
    liner.position.set(x, bottomY, zs * (W / 2 - 0.36));
    g.add(liner);
  }
  // Bumpers
  const bumpMat = new THREE.MeshStandardMaterial({ color: burned ? 0x151515 : 0x2c2c2c, roughness: 0.7 });
  for (const s of [-1, 1]) {
    const b = new THREE.Mesh(new RoundedBoxGeometry(0.18, 0.22, W * 0.98, 2, 0.06), bumpMat);
    b.position.set(s * (L / 2 - 0.02), 0.5, 0);
    g.add(b);
  }
  // Lights
  const lightMat = new THREE.MeshStandardMaterial({ color: burned ? 0x222222 : 0xd8d2b8, roughness: 0.25, metalness: 0.4 });
  for (const s of [-1, 1]) {
    const li = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.12, 0.32), lightMat);
    li.position.set(-(L / 2 - 0.01), 0.62, s * (W / 2 - 0.34));
    g.add(li);
  }
  if (burned) {
    // Ash dusting + open hood feel
    const hood = new THREE.Mesh(new THREE.BoxGeometry(L * 0.3, 0.04, W * 0.8), lib.charred);
    hood.position.set(-1.45, 1.0, 0);
    hood.rotation.z = 0.5;
    g.add(hood);
  }
  return shadow(g);
}

export function buildBus({ burned = true } = {}) {
  const lib = getMaterialLib();
  const g = new THREE.Group();
  const hull = burned ? burnedMetalMat() : lib.metalWhite;
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x24211e, roughness: 0.7, metalness: 0.5 });
  const L = 10.5, W = 2.5, H = 2.85;
  const bodyY = 0.55;

  // Lower hull + roof
  const body = new THREE.Mesh(new RoundedBoxGeometry(L, H * 0.62, W, 3, 0.1), hull);
  body.position.y = bodyY + H * 0.31;
  g.add(body);
  const roofBand = new THREE.Mesh(new RoundedBoxGeometry(L * 0.985, H * 0.16, W * 0.985, 2, 0.06), hull);
  roofBand.position.y = bodyY + H * 0.92;
  g.add(roofBand);

  // Window band: pillars + recessed glass, some blown out
  const winY = bodyY + H * 0.72;
  const winH = H * 0.3;
  const r = makeRNG(88);
  const nWin = 7;
  const span = L * 0.9;
  const winW = span / nWin;
  for (const side of [1, -1]) {
    for (let i = 0; i < nWin; i++) {
      const x = -span / 2 + winW * (i + 0.5);
      const broken = r.chance(burned ? 0.45 : 0.1);
      const glassMat = broken ? lib.darkInterior : (burned ? frameMat : lib.glassDark);
      const glass = new THREE.Mesh(new THREE.BoxGeometry(winW * 0.84, winH * 0.86, 0.03), glassMat);
      glass.position.set(x, winY, side * (W / 2 - 0.045));
      g.add(glass);
      // Pillar between windows
      const pillar = new THREE.Mesh(new THREE.BoxGeometry(winW * 0.16, winH, 0.06), hull);
      pillar.position.set(x + winW / 2, winY, side * (W / 2 - 0.03));
      g.add(pillar);
    }
    // Sills
    const sill = new THREE.Mesh(new THREE.BoxGeometry(span, 0.07, 0.07), hull);
    sill.position.set(0, winY - winH / 2 - 0.03, side * (W / 2 - 0.03));
    g.add(sill);
    const header = new THREE.Mesh(new THREE.BoxGeometry(span, 0.07, 0.07), hull);
    header.position.set(0, winY + winH / 2 + 0.03, side * (W / 2 - 0.03));
    g.add(header);
  }
  // Windshield + rear glass
  for (const s of [-1, 1]) {
    const ws = new THREE.Mesh(new THREE.BoxGeometry(0.04, winH * 1.05, W * 0.82), burned ? lib.darkInterior : lib.glassDark);
    ws.position.set(s * (L / 2 - 0.05), winY - 0.05, 0);
    g.add(ws);
  }
  // Door opening (dark)
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.7, 0.05), lib.darkInterior);
  door.position.set(L * 0.38, bodyY + 0.88, W / 2 - 0.02);
  g.add(door);
  // Bumpers
  for (const s of [-1, 1]) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.3, W * 0.98), frameMat);
    b.position.set(s * (L / 2 + 0.02), bodyY + 0.18, 0);
    g.add(b);
  }
  // Wheels with dark arches
  const wg = new THREE.CylinderGeometry(0.48, 0.48, 0.32, 18); wg.rotateX(Math.PI / 2);
  const archGeo = new THREE.BoxGeometry(1.25, 0.62, 0.1);
  for (const [x, zs] of [[-L * 0.33, 1], [-L * 0.33, -1], [L * 0.3, 1], [L * 0.3, -1]]) {
    const w = new THREE.Mesh(wg, lib.tire);
    w.position.set(x, 0.48, zs * (W / 2 - 0.18));
    g.add(w);
    const arch = new THREE.Mesh(archGeo, lib.darkInterior);
    arch.position.set(x, 0.75, zs * (W / 2 - 0.04));
    g.add(arch);
  }
  // Roof hatch + vents
  for (const x of [-2.4, 0.8]) {
    const hatch = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.07, 0.7), frameMat);
    hatch.position.set(x, bodyY + H + 0.03, 0);
    hatch.rotation.z = burned && x < 0 ? 0.5 : 0;
    g.add(hatch);
  }
  if (burned) {
    // Ash ring + charred debris around the hulk
    const ashes = new THREE.Mesh(
      new THREE.CircleGeometry(L * 0.62, 22),
      new THREE.MeshStandardMaterial({ color: 0x17150f, roughness: 1, transparent: true, opacity: 0.72 })
    );
    ashes.rotation.x = -Math.PI / 2;
    ashes.position.y = 0.03;
    ashes.scale.y = 0.42;
    ashes.userData.noShadow = true;
    ashes.castShadow = false;
    g.add(ashes);
  }
  addContactShadow(g, L * 1.18, W * 1.9, 0.5);
  g.rotation.y = 0.35;
  return shadow(g);
}

/* ------------------------------- barriers etc ------------------------------ */

export function buildJerseyBarrier(len = 3) {
  const lib = getMaterialLib();
  const shape = new THREE.Shape();
  shape.moveTo(-0.34, 0); shape.lineTo(0.34, 0);
  shape.lineTo(0.22, 0.28); shape.lineTo(0.12, 0.82);
  shape.lineTo(-0.12, 0.82); shape.lineTo(-0.22, 0.28);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth: len, bevelEnabled: false });
  geo.rotateY(Math.PI / 2);
  geo.translate(len / 2, 0, 0);
  const m = new THREE.Mesh(geo, lib.concreteDark);
  const g = new THREE.Group();
  g.add(m);
  return shadow(g);
}

export function buildSandbagWall(rows = 4, cols = 5) {
  const lib = getMaterialLib();
  const g = new THREE.Group();
  const bagGeo = new THREE.CapsuleGeometry(0.14, 0.3, 4, 8);
  bagGeo.rotateZ(Math.PI / 2);
  bagGeo.scale(1, 0.72, 1.15);
  const r = makeRNG(rows * 100 + cols);
  // Tint variants so the stack isn't a uniform beige brick
  const mats = [lib.sandbag, lib.sandbag.clone(), lib.sandbag.clone()];
  mats[1].color = new THREE.Color(0xcabfa0);
  mats[2].color = new THREE.Color(0x9f9276);
  for (let y = 0; y < rows; y++) {
    const n = cols - (y % 2 ? 1 : 0);
    for (let i = 0; i < n; i++) {
      const bag = new THREE.Mesh(bagGeo, mats[r.int(0, 2)]);
      const sag = y === rows - 1 ? r.spread(0.03) - 0.02 : 0;
      bag.position.set(
        (i - n / 2 + 0.5) * 0.56 + r.spread(0.04),
        0.11 + y * 0.185 + sag,
        r.spread(0.05)
      );
      bag.rotation.y = r.spread(0.22);
      bag.rotation.x = r.spread(0.07);
      g.add(bag);
    }
  }
  addContactShadow(g, cols * 0.56 + 0.6, 1.1, 0.4);
  return shadow(g);
}

export function buildBarrel({ color = 0x5a6a52, rusty = true } = {}) {
  const g = new THREE.Group();
  const r = makeRNG(color);
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.6 });
  if (rusty) mat.color.lerp(new THREE.Color(0x7a4a2c), 0.25 + r() * 0.3);
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.9, 16), mat);
  body.position.y = 0.45;
  g.add(body);
  for (const y of [0.18, 0.45, 0.72]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.305, 0.012, 6, 20), mat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = y;
    g.add(ring);
  }
  addContactShadow(g, 1.1, 1.1, 0.5);
  return shadow(g);
}

export function buildTireStack(n = 3) {
  const lib = getMaterialLib();
  const g = new THREE.Group();
  const geo = new THREE.TorusGeometry(0.33, 0.13, 10, 20);
  geo.rotateX(Math.PI / 2);
  const r = makeRNG(n * 17);
  for (let i = 0; i < n; i++) {
    const t = new THREE.Mesh(geo, lib.tire);
    t.position.set(r.spread(0.05), 0.13 + i * 0.25, r.spread(0.05));
    t.rotation.y = r() * Math.PI;
    g.add(t);
  }
  addContactShadow(g, 1.35, 1.35, 0.44);
  return shadow(g);
}

export function buildCrate(size = 0.8) {
  const lib = getMaterialLib();
  const g = new THREE.Group();
  const box = new THREE.Mesh(new THREE.BoxGeometry(size, size, size), lib.wood);
  box.position.y = size / 2;
  g.add(box);
  // Edge frames
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x6a4c30, roughness: 0.9 });
  const t = size * 0.07;
  for (const [x, y, z, sx, sy, sz] of [
    [0, size - t / 2, size / 2 - t / 2, size, t, t], [0, size - t / 2, -size / 2 + t / 2, size, t, t],
    [0, t / 2, size / 2 - t / 2, size, t, t], [0, t / 2, -size / 2 + t / 2, size, t, t],
    [size / 2 - t / 2, size / 2, size / 2 - t / 2, t, size, t], [-size / 2 + t / 2, size / 2, size / 2 - t / 2, t, size, t],
    [size / 2 - t / 2, size / 2, -size / 2 + t / 2, t, size, t], [-size / 2 + t / 2, size / 2, -size / 2 + t / 2, t, size, t],
  ]) {
    const f = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), frameMat);
    f.position.set(x, y, z);
    g.add(f);
  }
  addContactShadow(g, size * 1.7, size * 1.7, 0.4);
  return shadow(g);
}

/* ------------------------------ street furniture --------------------------- */

export function buildPowerPole(height = 8) {
  const g = new THREE.Group();
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x5c4a36, roughness: 0.95 });
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.15, height, 10), woodMat);
  pole.position.y = height / 2;
  g.add(pole);
  const arm = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.09, 0.09), woodMat);
  arm.position.y = height - 0.5;
  g.add(arm);
  const insMat = new THREE.MeshStandardMaterial({ color: 0x354a42, roughness: 0.3 });
  for (const x of [-0.7, 0, 0.7]) {
    const ins = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.12, 8), insMat);
    ins.position.set(x, height - 0.4, 0);
    g.add(ins);
  }
  return shadow(g);
}

/** Sagging wire between two world points. */
export function buildWire(a, b, sag = 0.8) {
  const mid = a.clone().lerp(b, 0.5);
  mid.y -= sag;
  const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
  const geo = new THREE.TubeGeometry(curve, 14, 0.014, 4);
  const mat = new THREE.MeshStandardMaterial({ color: 0x101010, roughness: 0.8 });
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = true;
  return m;
}

export function buildStreetLight(height = 6.4) {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0x3c4246, roughness: 0.5, metalness: 0.7 });
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.11, height, 10), mat);
  pole.position.y = height / 2;
  g.add(pole);
  const armCurve = new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(0, height, 0),
    new THREE.Vector3(0.7, height + 0.35, 0),
    new THREE.Vector3(1.5, height + 0.2, 0)
  );
  const arm = new THREE.Mesh(new THREE.TubeGeometry(armCurve, 10, 0.05, 8), mat);
  g.add(arm);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.12, 0.24), mat);
  head.position.set(1.55, height + 0.16, 0);
  g.add(head);
  return shadow(g);
}

export function buildDumpster() {
  const lib = getMaterialLib();
  const g = new THREE.Group();
  const body = new THREE.Mesh(new RoundedBoxGeometry(2.0, 1.15, 1.1, 2, 0.05), lib.metalGreen);
  body.position.y = 0.68;
  g.add(body);
  const lid = new THREE.Mesh(new THREE.BoxGeometry(2.02, 0.06, 1.14), lib.metalGreen);
  lid.position.set(0, 1.28, -0.1);
  lid.rotation.x = -0.35;
  g.add(lid);
  for (const s of [-1, 1]) {
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.07, 10), lib.tire);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(s * 0.8, 0.09, 0.4);
    g.add(wheel);
  }
  addContactShadow(g, 2.5, 1.6, 0.42);
  return shadow(g);
}

/* --------------------------------- market ---------------------------------- */

function stripeTexture(c1 = '#a03428', c2 = '#d8cfc0') {
  const c = canvas(128, 128);
  const ctx = c.getContext('2d');
  for (let i = 0; i < 8; i++) {
    ctx.fillStyle = i % 2 ? c1 : c2;
    ctx.fillRect(i * 16, 0, 16, 128);
  }
  return tex(c, { srgb: true, repeat: [2, 1] });
}

export function buildMarketStall(seed = 1) {
  const lib = getMaterialLib();
  const r = makeRNG(seed * 31 + 7);
  const g = new THREE.Group();
  // Dark scorched lumber — stalls must not read self-lit at dusk
  const postMat = new THREE.MeshStandardMaterial({ color: 0x54402c, roughness: 0.9 });
  const W = 3, D = 2, H = 2.3;
  for (const [x, z] of [[-W / 2, -D / 2], [W / 2, -D / 2], [-W / 2, D / 2], [W / 2, D / 2]]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, H, 8), postMat);
    post.position.set(x, H / 2, z);
    g.add(post);
  }
  // Canopy
  const colors = [['#a03428', '#d8cfc0'], ['#3c5a50', '#d8cfc0'], ['#8a6a28', '#d0c4ae']];
  const [c1, c2] = colors[Math.floor(r() * colors.length)];
  const canopyMat = new THREE.MeshStandardMaterial({ map: stripeTexture(c1, c2), roughness: 0.9, side: THREE.DoubleSide });
  const canopy = new THREE.Mesh(new THREE.PlaneGeometry(W + 0.4, D + 0.5, 6, 2), canopyMat);
  // gentle sag
  const posAttr = canopy.geometry.attributes.position;
  for (let i = 0; i < posAttr.count; i++) {
    const x = posAttr.getX(i);
    posAttr.setZ(i, -Math.cos((x / (W + 0.4)) * Math.PI) * 0.12);
  }
  canopy.geometry.computeVertexNormals();
  canopy.rotation.x = -Math.PI / 2 + 0.12;
  canopy.position.y = H + 0.05;
  g.add(canopy);
  // Table
  const table = new THREE.Mesh(new THREE.BoxGeometry(W * 0.85, 0.08, D * 0.7), lib.woodStall);
  table.position.y = 0.85;
  g.add(table);
  for (const [x, z] of [[-W * 0.36, -D * 0.28], [W * 0.36, -D * 0.28], [-W * 0.36, D * 0.28], [W * 0.36, D * 0.28]]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.85, 0.07), postMat);
    leg.position.set(x, 0.42, z);
    g.add(leg);
  }
  // Clutter: produce boxes
  for (let i = 0; i < 4; i++) {
    const bx = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.16, 0.32), lib.woodStall);
    bx.position.set(r.spread(W * 0.32), 0.97, r.spread(D * 0.24));
    bx.rotation.y = r.spread(0.4);
    g.add(bx);
    const fruitMat = new THREE.MeshStandardMaterial({ color: [0xa84a28, 0xb89838, 0x687840][i % 3], roughness: 0.7 });
    for (let f = 0; f < 5; f++) {
      const fr = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), fruitMat);
      fr.position.set(bx.position.x + r.spread(0.16), 1.06, bx.position.z + r.spread(0.1));
      g.add(fr);
    }
  }
  addContactShadow(g, W * 0.95, D * 0.85, 0.3);
  return shadow(g);
}

/* --------------------------------- rubble ---------------------------------- */

export function buildRubblePile(radius = 2.4, height = 1.1, seed = 5) {
  const lib = getMaterialLib();
  const r = makeRNG(seed * 97);
  const g = new THREE.Group();
  const chunkGeo = new THREE.DodecahedronGeometry(1, 0);
  const n = Math.floor(radius * 10);
  for (let i = 0; i < n; i++) {
    const c = new THREE.Mesh(chunkGeo, lib.rubble);
    const a = r() * Math.PI * 2;
    const rr = Math.sqrt(r()) * radius;
    const s = 0.14 + r() * 0.45 * (1 - rr / radius * 0.5);
    c.scale.set(s * (0.7 + r() * 0.7), s * (0.5 + r() * 0.5), s * (0.7 + r() * 0.7));
    c.position.set(Math.cos(a) * rr, Math.max(0.03, (1 - rr / radius) * height * r()), Math.sin(a) * rr);
    c.rotation.set(r() * Math.PI, r() * Math.PI, r() * Math.PI);
    g.add(c);
  }
  // Rebar
  const rebarMat = new THREE.MeshStandardMaterial({ color: 0x4a3828, roughness: 0.7, metalness: 0.6 });
  for (let i = 0; i < 4; i++) {
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.3 + r(), 6), rebarMat);
    bar.position.set(r.spread(radius * 0.6), 0.5, r.spread(radius * 0.6));
    bar.rotation.set(r.spread(1.2), r() * Math.PI, r.spread(1.2));
    g.add(bar);
  }
  addContactShadow(g, radius * 2.1, radius * 2.1, 0.38, 0.05);
  return shadow(g);
}

/* ------------------------------ roof clutter ------------------------------- */

export function buildWaterTank() {
  const lib = getMaterialLib();
  const g = new THREE.Group();
  const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 1.3, 14), lib.metalWhite);
  tank.position.y = 1.15;
  g.add(tank);
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.8, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), lib.metalWhite);
  cap.position.y = 1.8;
  g.add(cap);
  const legMat = new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.6, metalness: 0.7 });
  for (const [x, z] of [[-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5]]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.6, 6), legMat);
    leg.position.set(x, 0.3, z);
    g.add(leg);
  }
  return shadow(g);
}

export function buildAntenna(h = 3.2) {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.5, metalness: 0.8 });
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.04, h, 6), mat);
  mast.position.y = h / 2;
  g.add(mast);
  for (let i = 0; i < 3; i++) {
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.7 - i * 0.16, 4), mat);
    arm.rotation.z = Math.PI / 2;
    arm.position.y = h - 0.35 - i * 0.4;
    g.add(arm);
  }
  return shadow(g);
}

export function buildACUnit() {
  const lib = getMaterialLib();
  const g = new THREE.Group();
  const box = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.55, 0.42), lib.metalWhite);
  g.add(box);
  const grill = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.4, 0.02), new THREE.MeshStandardMaterial({ color: 0x333638, roughness: 0.8 }));
  grill.position.z = 0.22;
  g.add(grill);
  const fan = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.03, 12), new THREE.MeshStandardMaterial({ color: 0x1c1e20, roughness: 0.6 }));
  fan.rotation.x = Math.PI / 2;
  fan.position.z = 0.23;
  g.add(fan);
  return shadow(g);
}

/* -------------------------------- billboards ------------------------------- */

export function buildShopSign(text, w = 3.2, h = 0.8, bg = '#7a2c20', fg = '#e8dcc0') {
  const c = canvas(512, 128);
  const ctx = c.getContext('2d');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 512, 128);
  // weathering
  const r = makeRNG(text.length * 771);
  for (let i = 0; i < 260; i++) {
    ctx.fillStyle = `rgba(40,28,20,${r() * 0.25})`;
    ctx.fillRect(r() * 512, r() * 128, r() * 30, r() * 6);
  }
  ctx.fillStyle = fg;
  ctx.font = 'bold 64px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 256, 68);
  // Slightly emissive face: reads as a lit shop sign in the dusk menu
  // frame, near-invisible lift in full daylight
  const signTex = tex(c, { srgb: true });
  const mat = new THREE.MeshStandardMaterial({
    map: signTex, roughness: 0.85,
    emissive: 0xffffff, emissiveMap: signTex, emissiveIntensity: 0.32,
  });
  const sign = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.08), mat);
  return shadow(sign);
}

/** Distant skyline silhouette ring + mountain ridges (cheap, fog does the rest). */
export function buildDistantScenery(scene) {
  const r = makeRNG(2222);
  const g = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({ color: 0xb3a288 });
  const matFar = new THREE.MeshBasicMaterial({ color: 0xbfae92 });

  // City blocks ring
  for (let i = 0; i < 60; i++) {
    const a = (i / 60) * Math.PI * 2 + r.spread(0.04);
    const dist = 240 + r() * 120;
    const w = 14 + r() * 26, h = 12 + r() * 34, d = 14 + r() * 22;
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), r() > 0.4 ? mat : matFar);
    b.position.set(Math.cos(a) * dist, h / 2 - 2, Math.sin(a) * dist);
    b.rotation.y = r() * Math.PI;
    g.add(b);
  }
  // Minarets / towers
  for (let i = 0; i < 7; i++) {
    const a = r() * Math.PI * 2;
    const dist = 260 + r() * 90;
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 3.2, 40 + r() * 22, 8), mat);
    tower.position.set(Math.cos(a) * dist, 20, Math.sin(a) * dist);
    g.add(tower);
    const domeG = new THREE.SphereGeometry(4, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2);
    const dome = new THREE.Mesh(domeG, mat);
    dome.position.set(tower.position.x, 40 + r() * 10, tower.position.z);
    g.add(dome);
  }
  // Mountain ridge
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const dist = 520 + r() * 120;
    const m = new THREE.Mesh(new THREE.ConeGeometry(120 + r() * 90, 90 + r() * 80, 5), matFar);
    m.position.set(Math.cos(a) * dist, 8, Math.sin(a) * dist);
    m.rotation.y = r() * Math.PI;
    g.add(m);
  }
  scene.add(g);
  return g;
}
