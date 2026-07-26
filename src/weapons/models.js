import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { getMaterialLib } from '../world/textures.js';

/**
 * Procedural weapon models. The first-person rifle is high-detail (rails,
 * optic, foregrip, mag, stock); enemies carry a simplified AK. Gloved hands
 * and camo sleeves complete the viewmodel. Forward = -Z.
 */

export function buildRifleViewmodel() {
  const lib = getMaterialLib();
  const g = new THREE.Group();
  const metal = lib.gunMetal;
  const polymer = lib.gunPolymer;
  const tan = lib.gunTan;

  const add = (geo, mat, x, y, z, rx = 0, ry = 0, rz = 0) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.rotation.set(rx, ry, rz);
    m.castShadow = true;
    g.add(m);
    return m;
  };

  /* --- lower/upper receiver --- */
  add(new RoundedBoxGeometry(0.037, 0.05, 0.24, 2, 0.006), metal, 0, 0.012, 0);      // upper
  add(new RoundedBoxGeometry(0.034, 0.045, 0.17, 2, 0.006), polymer, 0, -0.03, 0.02); // lower
  // Ejection port
  add(new THREE.BoxGeometry(0.004, 0.02, 0.06), new THREE.MeshStandardMaterial({ color: 0x484a4c, roughness: 0.3, metalness: 0.9 }), 0.02, 0.012, -0.02);
  // Forward assist + case deflector
  add(new THREE.CylinderGeometry(0.008, 0.008, 0.012, 8), metal, 0.02, 0.016, 0.045, 0, 0, Math.PI / 2);
  // Charging handle
  const chGroup = new THREE.Group();
  const ch = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.008, 0.03), polymer);
  chGroup.add(ch);
  chGroup.position.set(0, 0.032, 0.115);
  g.add(chGroup);

  /* --- top rail with picatinny teeth --- */
  add(new THREE.BoxGeometry(0.026, 0.008, 0.42), metal, 0, 0.042, -0.1);
  const toothGeo = new THREE.BoxGeometry(0.028, 0.005, 0.006);
  for (let i = 0; i < 20; i++) {
    add(toothGeo, metal, 0, 0.048, -0.285 + i * 0.019);
  }

  /* --- handguard (octagonal, with side rails + vent holes) --- */
  const hgGeo = new THREE.CylinderGeometry(0.026, 0.026, 0.235, 8);
  hgGeo.rotateX(Math.PI / 2);
  add(hgGeo, polymer, 0, 0.012, -0.235);
  // M-LOK style side slots
  const slotMat = new THREE.MeshStandardMaterial({ color: 0x121314, roughness: 0.8 });
  for (const s of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      add(new THREE.BoxGeometry(0.004, 0.011, 0.032), slotMat, s * 0.0255, 0.012, -0.15 - i * 0.052);
    }
  }

  /* --- barrel + muzzle device --- */
  const barrelGeo = new THREE.CylinderGeometry(0.0115, 0.0115, 0.17, 12);
  barrelGeo.rotateX(Math.PI / 2);
  add(barrelGeo, metal, 0, 0.012, -0.43);
  // Flash hider with slots
  const mdGeo = new THREE.CylinderGeometry(0.016, 0.0175, 0.06, 12);
  mdGeo.rotateX(Math.PI / 2);
  const md = add(mdGeo, metal, 0, 0.012, -0.535);
  for (let i = 0; i < 3; i++) {
    add(new THREE.BoxGeometry(0.036, 0.004, 0.012), new THREE.MeshStandardMaterial({ color: 0x0c0c0c, roughness: 0.5 }),
      0, 0.012, -0.522 - i * 0.016, 0, 0, (i * Math.PI) / 3.5);
  }
  void md;
  // Gas block + tube
  add(new THREE.BoxGeometry(0.02, 0.024, 0.024), metal, 0, 0.02, -0.36);

  /* --- stock --- */
  add(new THREE.BoxGeometry(0.03, 0.026, 0.17), metal, 0, 0.012, 0.2);          // buffer tube
  const stock = new THREE.Group();
  const stockBody = new THREE.Mesh(new RoundedBoxGeometry(0.042, 0.075, 0.11, 2, 0.008), polymer);
  stock.add(stockBody);
  const buttpad = new THREE.Mesh(new RoundedBoxGeometry(0.045, 0.11, 0.02, 2, 0.006), polymer);
  buttpad.position.set(0, -0.012, 0.062);
  stock.add(buttpad);
  stock.position.set(0, -0.005, 0.27);
  stock.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  g.add(stock);

  /* --- grip + trigger --- */
  const grip = add(new RoundedBoxGeometry(0.032, 0.095, 0.045, 2, 0.008), polymer, 0, -0.085, 0.085, 0.32);
  void grip;
  add(new THREE.BoxGeometry(0.006, 0.028, 0.008), metal, 0, -0.055, 0.045);      // trigger
  // Trigger guard
  const tgGeo = new THREE.TorusGeometry(0.024, 0.0035, 6, 14, Math.PI);
  add(tgGeo, polymer, 0, -0.062, 0.048, 0, Math.PI / 2, 0);

  /* --- magazine (curved, animatable) --- */
  const magGroup = new THREE.Group();
  const mag1 = new THREE.Mesh(new RoundedBoxGeometry(0.03, 0.085, 0.062, 2, 0.006), tan);
  mag1.position.set(0, -0.04, 0);
  magGroup.add(mag1);
  const mag2 = new THREE.Mesh(new RoundedBoxGeometry(0.03, 0.075, 0.06, 2, 0.006), tan);
  mag2.position.set(0, -0.105, -0.012);
  mag2.rotation.x = 0.22;
  magGroup.add(mag2);
  const magBase = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.012, 0.066), polymer);
  magBase.position.set(0, -0.145, -0.02);
  magBase.rotation.x = 0.22;
  magGroup.add(magBase);
  magGroup.position.set(0, -0.05, -0.015);
  magGroup.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  g.add(magGroup);

  /* --- red dot optic --- */
  const optic = new THREE.Group();
  const tubeGeo = new THREE.CylinderGeometry(0.019, 0.019, 0.055, 16, 1, true);
  tubeGeo.rotateX(Math.PI / 2);
  const tube = new THREE.Mesh(tubeGeo, new THREE.MeshStandardMaterial({ color: 0x1b1c1e, roughness: 0.4, metalness: 0.7, side: THREE.DoubleSide }));
  optic.add(tube);
  // Front & rear glass rims
  for (const z of [-0.028, 0.028]) {
    const rimGeo = new THREE.TorusGeometry(0.019, 0.0035, 8, 20);
    const rim = new THREE.Mesh(rimGeo, new THREE.MeshStandardMaterial({ color: 0x232426, roughness: 0.35, metalness: 0.8 }));
    rim.position.z = z;
    optic.add(rim);
  }
  // Lens with faint blue tint
  const lens = new THREE.Mesh(new THREE.CircleGeometry(0.0165, 20),
    new THREE.MeshPhysicalMaterial({ color: 0x2a4a5a, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.32 }));
  lens.position.z = 0.024;
  optic.add(lens);
  // Reticle dot (emissive, visible through tube)
  const dot = new THREE.Mesh(new THREE.CircleGeometry(0.0022, 8),
    new THREE.MeshBasicMaterial({ color: 0xff2211, toneMapped: false }));
  dot.position.z = -0.01;
  optic.add(dot);
  // Mount + adjustment turret
  const mount = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.018, 0.045), new THREE.MeshStandardMaterial({ color: 0x2c2d2f, roughness: 0.5, metalness: 0.7 }));
  mount.position.y = -0.026;
  optic.add(mount);
  const turret = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.01, 10), new THREE.MeshStandardMaterial({ color: 0x2c2d2f, roughness: 0.5 }));
  turret.position.set(0.02, 0, 0);
  turret.rotation.z = Math.PI / 2;
  optic.add(turret);
  optic.position.set(0, 0.085, -0.01);
  optic.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  g.add(optic);

  /* --- low-profile folded front sight --- */
  add(new THREE.BoxGeometry(0.012, 0.01, 0.02), metal, 0, 0.052, -0.335);

  /* --- angled foregrip --- */
  const fg = add(new RoundedBoxGeometry(0.028, 0.07, 0.035, 2, 0.007), tan, 0, -0.035, -0.27, 0.5);
  void fg;

  /* --- PEQ laser box on side rail --- */
  add(new RoundedBoxGeometry(0.022, 0.028, 0.06, 2, 0.004), tan, -0.03, 0.026, -0.2);
  add(new THREE.CircleGeometry(0.004, 8), new THREE.MeshBasicMaterial({ color: 0x330000 }), -0.036, 0.03, -0.231, 0, -Math.PI / 2, 0);

  // Anchors
  const muzzle = new THREE.Object3D();
  muzzle.position.set(0, 0.012, -0.575);
  g.add(muzzle);
  const ejectPort = new THREE.Object3D();
  ejectPort.position.set(0.03, 0.012, -0.02);
  g.add(ejectPort);

  return { group: g, muzzle, ejectPort, magGroup, chGroup, opticDot: dot, adsAnchor: optic };
}

/** Compact sidearm. */
export function buildPistolViewmodel() {
  const lib = getMaterialLib();
  const g = new THREE.Group();
  const metal = lib.gunMetal;
  const polymer = lib.gunPolymer;
  const add = (geo, mat, x, y, z, rx = 0) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.rotation.x = rx;
    m.castShadow = true;
    g.add(m);
    return m;
  };
  // Slide
  add(new RoundedBoxGeometry(0.03, 0.032, 0.19, 2, 0.005), metal, 0, 0.018, -0.01);
  // Slide serrations
  for (let i = 0; i < 5; i++) add(new THREE.BoxGeometry(0.032, 0.02, 0.003), polymer, 0, 0.02, 0.06 + i * 0.007);
  // Frame
  add(new RoundedBoxGeometry(0.028, 0.03, 0.14, 2, 0.005), polymer, 0, -0.008, 0.0);
  // Grip
  add(new RoundedBoxGeometry(0.03, 0.1, 0.05, 2, 0.007), polymer, 0, -0.062, 0.055, 0.28);
  // Barrel tip
  const bGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.02, 10);
  bGeo.rotateX(Math.PI / 2);
  add(bGeo, metal, 0, 0.018, -0.11);
  // Trigger + guard
  add(new THREE.BoxGeometry(0.006, 0.022, 0.006), metal, 0, -0.03, 0.02);
  const tgGeo = new THREE.TorusGeometry(0.02, 0.003, 6, 12, Math.PI);
  const tg = new THREE.Mesh(tgGeo, polymer);
  tg.position.set(0, -0.035, 0.022);
  tg.rotation.y = Math.PI / 2;
  g.add(tg);
  // Sights
  add(new THREE.BoxGeometry(0.004, 0.008, 0.006), metal, 0, 0.04, -0.095);
  add(new THREE.BoxGeometry(0.016, 0.008, 0.006), metal, 0, 0.04, 0.075);

  const muzzle = new THREE.Object3D();
  muzzle.position.set(0, 0.018, -0.125);
  g.add(muzzle);
  const ejectPort = new THREE.Object3D();
  ejectPort.position.set(0.02, 0.02, 0);
  g.add(ejectPort);
  const magGroup = new THREE.Group();
  g.add(magGroup);
  return { group: g, muzzle, ejectPort, magGroup, chGroup: new THREE.Group(), adsAnchor: null };
}

/** Gloved hand (viewmodel). side: 1 = right, -1 = left.
 *  Local frame matches the gun: -Z forward, hand wraps around a grip at origin. */
export function buildHand(side = 1) {
  const lib = getMaterialLib();
  const g = new THREE.Group();
  const glove = new THREE.MeshStandardMaterial({ color: 0x3d3831, roughness: 0.92 });
  const palm = new THREE.Mesh(new RoundedBoxGeometry(0.048, 0.07, 0.032, 2, 0.012), glove);
  g.add(palm);
  // Fingers wrapped around the grip
  const fingers = new THREE.Mesh(new RoundedBoxGeometry(0.046, 0.034, 0.052, 2, 0.013), glove);
  fingers.position.set(-side * 0.006, -0.038, -0.016);
  fingers.rotation.x = 0.45;
  g.add(fingers);
  const thumb = new THREE.Mesh(new RoundedBoxGeometry(0.017, 0.042, 0.019, 2, 0.008), glove);
  thumb.position.set(-side * 0.026, 0.008, 0.004);
  thumb.rotation.z = side * 0.45;
  g.add(thumb);
  // Knuckle pad detail
  const pad = new THREE.Mesh(new RoundedBoxGeometry(0.04, 0.03, 0.014, 1, 0.005), lib.gunTan);
  pad.position.set(side * 0.004, -0.03, -0.035);
  pad.rotation.x = 0.45;
  g.add(pad);
  // Wrist cuff + camo sleeve, angled down/back toward the camera bottom
  const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.042, 0.05, 10), glove);
  cuff.position.set(side * 0.012, -0.045, 0.045);
  cuff.rotation.x = 2.05;
  cuff.rotation.z = side * -0.3;
  g.add(cuff);
  const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.043, 0.058, 0.26, 10), lib.camo);
  sleeve.position.set(side * 0.035, -0.135, 0.15);
  sleeve.rotation.x = 2.05;
  sleeve.rotation.z = side * -0.3;
  g.add(sleeve);
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}

/** Simplified AK for enemies (world model). Forward = -Z. */
export function buildEnemyRifle() {
  const lib = getMaterialLib();
  const g = new THREE.Group();
  const metal = lib.gunMetal;
  const wood = new THREE.MeshStandardMaterial({ color: 0x6a4526, roughness: 0.7 });
  const add = (geo, mat, x, y, z, rx = 0) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.rotation.x = rx;
    m.castShadow = true;
    g.add(m);
    return m;
  };
  add(new THREE.BoxGeometry(0.045, 0.06, 0.28), metal, 0, 0, 0);
  add(new THREE.BoxGeometry(0.048, 0.055, 0.16), wood, 0, 0, -0.21);        // handguard
  const bGeo = new THREE.CylinderGeometry(0.011, 0.011, 0.26, 8);
  bGeo.rotateX(Math.PI / 2);
  add(bGeo, metal, 0, 0.012, -0.4);
  add(new THREE.BoxGeometry(0.035, 0.05, 0.2), wood, 0, -0.005, 0.23);       // stock
  const magGeo = new THREE.BoxGeometry(0.032, 0.14, 0.055);
  const mag = add(magGeo, metal, 0, -0.09, -0.04, 0.5);
  void mag;
  add(new THREE.BoxGeometry(0.028, 0.07, 0.04), wood, 0, -0.06, 0.1, 0.25); // grip
  return g;
}
