// Procedural weapon model builders — owner: Fable 4.
// buildWeaponModel(id, {firstPerson}) -> THREE.Group with userData:
//   { muzzle: Object3D (barrel tip marker), magazine: Mesh|null,
//     boltOrPump: Mesh|Group|null, shellEject: Object3D|null,
//     gripL: Object3D (left-hand anchor), gripR: Object3D (right-hand anchor) }
// Conventions: origin at the firing grip, forward = -Z, up = +Y, meters.
// All silhouettes are original fiction (match src/ui/weaponIcons.js shapes).
// Geometries are cached module-wide; materials shared per (world|fp) set.

import * as THREE from 'three';

// ---------------------------------------------------------------- geometry
const geoCache = new Map();
function G(key, make) {
  if (!geoCache.has(key)) geoCache.set(key, make());
  return geoCache.get(key);
}
const box = (w, h, d) => G(`b${w},${h},${d}`, () => new THREE.BoxGeometry(w, h, d));
const cyl = (rt, rb, h, s = 12) => G(`c${rt},${rb},${h},${s}`, () => new THREE.CylinderGeometry(rt, rb, h, s));
const sph = (r, w = 10, h = 8) => G(`s${r},${w},${h}`, () => new THREE.SphereGeometry(r, w, h));
const tor = (r, t, s = 8, ts = 12) => G(`t${r},${t}`, () => new THREE.TorusGeometry(r, t, s, ts));

// Tapered box (blade / stock wedges): scales the +Z end of a box.
function taperBox(w, h, d, taperW, taperH) {
  return G(`tb${w},${h},${d},${taperW},${taperH}`, () => {
    const g = new THREE.BoxGeometry(w, h, d);
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const z = pos.getZ(i);
      if (z < 0) { // -Z end tapers (points forward)
        pos.setX(i, pos.getX(i) * taperW);
        pos.setY(i, pos.getY(i) * taperH);
      }
    }
    g.computeVertexNormals();
    return g;
  });
}

// ---------------------------------------------------------------- materials
function makeMatSet(fp) {
  const std = (c, r, m) => {
    const mat = new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m });
    if (fp) {
      // fp models render close to camera with no env light: lift the albedo,
      // add a soft self-fill and drop metalness so shapes read instead of
      // silhouetting against bright exteriors. transparent:true (opacity 1)
      // moves them to the transparent pass so world glass (depthWrite off)
      // cannot wash over the high-renderOrder viewmodel.
      mat.depthTest = false;
      mat.depthWrite = false;
      mat.transparent = true;
      // modest lift only: 1.6x + strong emissive washed the whole viewmodel
      // to light gray under the office fluorescents (lead audit finding #1)
      mat.color.multiplyScalar(1.18);
      mat.emissive = mat.color.clone().multiplyScalar(0.13);
      mat.metalness = Math.min(m, 0.5);
    }
    return mat;
  };
  const lens = std(0x0a2027, 0.25, 0.2);
  lens.emissive = new THREE.Color(fp ? 0x113844 : 0x38a7c4);
  lens.emissiveIntensity = fp ? 0.85 : 0.55;
  if (fp) lens.color.setHex(0x0d232b);
  const sightDot = std(0x0a0f08, 0.4, 0);      // aim-point emitter (bright)
  sightDot.emissive = new THREE.Color(0x8cff5a);
  sightDot.emissiveIntensity = 1.6;
  const reticle = std(0x050607, 0.6, 0);       // scope reticle etch (stays black)
  reticle.emissive = new THREE.Color(0x000000);
  return {
    metal: std(0x30363c, 0.42, 0.78),      // receiver / barrel gunmetal
    metalDark: std(0x1f2327, 0.5, 0.68),   // barrels, dark hardware
    steel: std(0x5d656d, 0.3, 0.85),       // bolt / slide bright wear
    polymer: std(0x363c41, 0.78, 0.05),    // furniture
    polymerDark: std(0x24282b, 0.85, 0),   // grips, pads
    grip: std(0x2a2d30, 0.92, 0),          // rubberized grip
    brass: std(0xa8823f, 0.35, 0.8),
    blade: std(0x9fa8b0, 0.22, 0.9),
    lens,
    sightDot,
    reticle,
    bandFlash: std(0xcab453, 0.6, 0.1),
    bandSmoke: std(0x8ba0ac, 0.6, 0.1),
    shell: std(0x8e3b2c, 0.55, 0.05),      // shotgun hull red
    gren: std(0x39443d, 0.6, 0.15),
    pin: std(0x9aa0a5, 0.4, 0.7),
  };
}
const MATSETS = {};
function mats(fp) {
  const k = fp ? 'fp' : 'world';
  if (!MATSETS[k]) MATSETS[k] = makeMatSet(fp);
  return MATSETS[k];
}

// ---------------------------------------------------------------- helpers
function P(parent, geometry, material, x, y, z, o = {}) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  if (o.rx) mesh.rotation.x = o.rx;
  if (o.ry) mesh.rotation.y = o.ry;
  if (o.rz) mesh.rotation.z = o.rz;
  if (o.sx || o.sy || o.sz) mesh.scale.set(o.sx || 1, o.sy || 1, o.sz || 1);
  parent.add(mesh);
  return mesh;
}
function marker(parent, x, y, z) {
  const m = new THREE.Object3D();
  m.position.set(x, y, z);
  parent.add(m);
  return m;
}

// ---------------------------------------------------------------- builders
// Each builder: (g: Group, fp: bool, m: matset) -> void, fills g + g.userData.

function buildVireo(g, fp, m) {
  const ud = g.userData;
  // frame + dust cover
  P(g, box(0.03, 0.034, 0.15), m.metal, 0, 0.022, -0.045);
  // slide (recoils)
  ud.boltOrPump = P(g, box(0.033, 0.03, 0.185), m.metalDark, 0, 0.055, -0.052);
  // grip (raked back)
  P(g, box(0.03, 0.105, 0.048), m.grip, 0, -0.045, 0.022, { rx: 0.3 });
  // trigger guard
  P(g, box(0.026, 0.008, 0.05), m.metal, 0, -0.008, -0.045);
  ud.magazine = P(g, box(0.026, 0.018, 0.04), m.polymerDark, 0, -0.102, 0.038, { rx: 0.3 });
  ud.muzzle = marker(g, 0, 0.055, -0.152);
  ud.gripR = marker(g, 0, -0.04, 0.02);
  ud.gripL = marker(g, -0.02, -0.055, 0.01);
  ud.shellEject = marker(g, 0.022, 0.062, -0.02);
  if (fp) {
    P(g, box(0.006, 0.012, 0.008), m.metalDark, 0, 0.076, -0.135);          // front sight post
    P(g, box(0.0035, 0.0035, 0.002), m.sightDot, 0, 0.079, -0.1306);        // front dot (ADS pickup)
    // rear sight: two ears with an open notch so the front post reads at ADS
    P(g, box(0.007, 0.011, 0.01), m.metalDark, -0.0085, 0.0755, 0.028);
    P(g, box(0.007, 0.011, 0.01), m.metalDark, 0.0085, 0.0755, 0.028);
    P(g, box(0.002, 0.014, 0.032), m.steel, 0.018, 0.055, -0.02);           // ejection port
    P(g, box(0.028, 0.012, 0.028), m.metal, 0, 0.005, -0.108);              // rail block
    P(g, box(0.006, 0.02, 0.006), m.steel, 0, -0.012, -0.052, { rx: 0.25 }); // trigger
    P(g, cyl(0.0105, 0.0105, 0.014, 10), m.metalDark, 0, 0.055, -0.145, { rx: Math.PI / 2 }); // muzzle ring
    P(g, box(0.032, 0.02, 0.02), m.polymerDark, 0, -0.09, 0.005, { rx: 0.3 }); // grip flare
  }
}

function buildKestrel(g, fp, m) {
  const ud = g.userData;
  // receiver
  P(g, box(0.05, 0.066, 0.32), m.metal, 0, 0.045, -0.1);
  // barrel shroud + barrel
  P(g, cyl(0.02, 0.02, 0.13, 10), m.polymerDark, 0, 0.05, -0.325, { rx: Math.PI / 2 });
  P(g, cyl(0.009, 0.009, 0.06, 8), m.metalDark, 0, 0.05, -0.415, { rx: Math.PI / 2 });
  // grip + trigger guard
  P(g, box(0.03, 0.1, 0.05), m.grip, 0, -0.04, 0.012, { rx: 0.26 });
  P(g, box(0.026, 0.008, 0.055), m.metal, 0, -0.006, -0.045);
  // magazine (long stick, slightly raked)
  ud.magazine = P(g, box(0.028, 0.19, 0.055), m.polymerDark, 0, -0.085, -0.17, { rx: -0.12 });
  // wire stock
  P(g, cyl(0.008, 0.008, 0.2, 8), m.metalDark, 0, 0.045, 0.11, { rx: Math.PI / 2 });
  P(g, box(0.04, 0.085, 0.022), m.polymerDark, 0, 0.03, 0.21);
  ud.boltOrPump = P(g, box(0.014, 0.018, 0.05), m.steel, 0.032, 0.062, -0.06);
  ud.muzzle = marker(g, 0, 0.05, -0.45);
  ud.gripR = marker(g, 0, -0.035, 0.012);
  ud.gripL = marker(g, 0, -0.015, -0.22);
  ud.shellEject = marker(g, 0.03, 0.05, -0.05);
  if (fp) {
    P(g, box(0.026, 0.012, 0.26), m.metalDark, 0, 0.085, -0.1);             // top rail
    // compact dot sight: hollow housing (open through-view) + emissive dot
    P(g, box(0.026, 0.006, 0.045), m.polymerDark, 0, 0.094, -0.05);         // base
    P(g, box(0.004, 0.026, 0.045), m.polymerDark, -0.013, 0.11, -0.05);     // left wall
    P(g, box(0.004, 0.026, 0.045), m.polymerDark, 0.013, 0.11, -0.05);      // right wall
    P(g, box(0.026, 0.004, 0.045), m.polymerDark, 0, 0.125, -0.05);         // top wall
    P(g, box(0.02, 0.024, 0.003), m.lens, 0, 0.11, -0.071);                 // front lens (tinted)
    P(g, box(0.0045, 0.0045, 0.002), m.sightDot, 0, 0.11, -0.066);          // glowing dot
    P(g, box(0.006, 0.014, 0.008), m.metalDark, 0, 0.098, -0.36);           // front post
    P(g, box(0.006, 0.02, 0.006), m.steel, 0, -0.012, -0.048, { rx: 0.22 }); // trigger
    P(g, box(0.05, 0.02, 0.09), m.polymer, 0, 0.002, -0.24);                // mag well flare
    P(g, cyl(0.013, 0.013, 0.02, 8), m.metal, 0, 0.05, -0.44, { rx: Math.PI / 2 }); // muzzle collar
    P(g, box(0.012, 0.05, 0.02), m.polymerDark, 0, -0.055, 0.035, { rx: 0.26 }); // grip base
  }
}

function buildRidgeline(g, fp, m) {
  const ud = g.userData;
  // receiver
  P(g, box(0.054, 0.072, 0.26), m.metal, 0, 0.05, -0.07);
  // handguard
  P(g, box(0.048, 0.058, 0.24), m.polymer, 0, 0.05, -0.32);
  // barrel + muzzle device
  P(g, cyl(0.01, 0.011, 0.16, 10), m.metalDark, 0, 0.05, -0.52, { rx: Math.PI / 2 });
  P(g, cyl(0.014, 0.014, 0.045, 8), m.metalDark, 0, 0.05, -0.6, { rx: Math.PI / 2 });
  // stock: buffer tube + shoulder pad
  P(g, cyl(0.017, 0.017, 0.14, 10), m.polymerDark, 0, 0.052, 0.1, { rx: Math.PI / 2 });
  P(g, taperBox(0.042, 0.11, 0.12, 0.7, 0.55), m.polymer, 0, 0.02, 0.21);
  // grip + guard
  P(g, box(0.032, 0.1, 0.052), m.grip, 0, -0.042, 0.018, { rx: 0.3 });
  P(g, box(0.026, 0.008, 0.06), m.metal, 0, -0.006, -0.045);
  // magazine (angled box)
  ud.magazine = P(g, box(0.032, 0.17, 0.07), m.polymerDark, 0, -0.075, -0.135, { rx: -0.24 });
  ud.boltOrPump = P(g, box(0.016, 0.02, 0.055), m.steel, 0.034, 0.066, -0.02);
  ud.muzzle = marker(g, 0, 0.05, -0.625);
  ud.gripR = marker(g, 0, -0.035, 0.018);
  ud.gripL = marker(g, 0, 0.005, -0.33);
  ud.shellEject = marker(g, 0.032, 0.055, -0.03);
  if (fp) {
    P(g, box(0.028, 0.012, 0.24), m.metalDark, 0, 0.092, -0.07);            // upper rail
    P(g, box(0.028, 0.012, 0.2), m.metalDark, 0, 0.09, -0.33);              // handguard rail
    P(g, box(0.008, 0.02, 0.012), m.metalDark, 0, 0.108, -0.41);            // front sight post
    P(g, box(0.004, 0.004, 0.002), m.sightDot, 0, 0.114, -0.4035);          // front dot (ADS pickup)
    // rear sight: aperture ears (open center keeps the front post visible)
    P(g, box(0.007, 0.018, 0.014), m.metalDark, -0.0095, 0.108, 0.02);
    P(g, box(0.007, 0.018, 0.014), m.metalDark, 0.0095, 0.108, 0.02);
    P(g, box(0.026, 0.005, 0.014), m.metalDark, 0, 0.0955, 0.02);           // aperture base
    P(g, box(0.018, 0.022, 0.05), m.polymerDark, 0.036, 0.045, -0.38);      // weapon lamp
    P(g, cyl(0.008, 0.008, 0.004, 10), m.lens, 0.036, 0.045, -0.407, { rx: Math.PI / 2 }); // lamp lens
    P(g, box(0.006, 0.02, 0.006), m.steel, 0, -0.012, -0.05, { rx: 0.24 }); // trigger
    P(g, box(0.05, 0.026, 0.05), m.metal, 0, 0.008, -0.14);                 // mag well
    P(g, box(0.014, 0.03, 0.02), m.steel, 0, 0.075, 0.055);                 // charging handle
    P(g, box(0.044, 0.02, 0.022), m.polymerDark, 0, -0.155, -0.16, { rx: -0.24 }); // mag base pad
  }
}

function buildBoreas(g, fp, m) {
  const ud = g.userData;
  // receiver
  P(g, box(0.052, 0.08, 0.24), m.metal, 0, 0.045, -0.03);
  // barrel
  P(g, cyl(0.013, 0.013, 0.5, 10), m.metalDark, 0, 0.075, -0.4, { rx: Math.PI / 2 });
  // magazine tube
  P(g, cyl(0.011, 0.011, 0.42, 10), m.metal, 0, 0.028, -0.37, { rx: Math.PI / 2 });
  // pump forend (slides on tube)
  ud.boltOrPump = P(g, cyl(0.024, 0.026, 0.14, 10), m.polymerDark, 0, 0.03, -0.36, { rx: Math.PI / 2 });
  // stock
  P(g, taperBox(0.042, 0.12, 0.24, 0.6, 0.55), m.polymer, 0, 0.015, 0.19);
  // pistol-grip neck into stock
  P(g, box(0.034, 0.06, 0.09), m.polymer, 0, -0.02, 0.06, { rx: 0.5 });
  ud.muzzle = marker(g, 0, 0.075, -0.66);
  ud.gripR = marker(g, 0, -0.01, 0.05);
  ud.gripL = marker(g, 0, -0.005, -0.36);
  ud.shellEject = marker(g, 0.01, 0.008, -0.06);  // loading port under receiver
  if (fp) {
    P(g, sph(0.006, 8, 6), m.brass, 0, 0.093, -0.63);                        // bead sight
    P(g, box(0.026, 0.01, 0.05), m.metalDark, 0, 0.09, 0.03);                // rear reference
    P(g, box(0.006, 0.02, 0.006), m.steel, 0, -0.01, -0.02, { rx: 0.22 });   // trigger
    P(g, box(0.03, 0.008, 0.06), m.metal, 0, -0.002, -0.05);                 // trigger guard
    P(g, box(0.05, 0.018, 0.05), m.metalDark, 0, 0.008, -0.11);              // shell lifter housing
    P(g, box(0.014, 0.06, 0.14), m.polymerDark, 0, 0.03, -0.36);             // pump grip ribs (attached look)
    P(g, box(0.038, 0.1, 0.03), m.polymerDark, 0, 0.01, 0.3);                // recoil pad
  }
}

function buildLongwatch(g, fp, m) {
  const ud = g.userData;
  // full-length stock body (chassis)
  P(g, box(0.046, 0.075, 0.5), m.polymer, 0, 0.02, 0.02);
  // receiver
  P(g, box(0.05, 0.055, 0.24), m.metal, 0, 0.075, -0.14);
  // barrel (tapered) + brake
  P(g, cyl(0.011, 0.015, 0.56, 10), m.metalDark, 0, 0.075, -0.52, { rx: Math.PI / 2 });
  P(g, cyl(0.016, 0.016, 0.055, 8), m.metalDark, 0, 0.075, -0.79, { rx: Math.PI / 2 });
  // scope: tube + rings + bells
  P(g, cyl(0.017, 0.017, 0.16, 12), m.metalDark, 0, 0.135, -0.13, { rx: Math.PI / 2 });
  P(g, cyl(0.023, 0.023, 0.05, 12), m.metalDark, 0, 0.135, -0.225, { rx: Math.PI / 2 });
  P(g, cyl(0.021, 0.021, 0.045, 12), m.metalDark, 0, 0.135, -0.04, { rx: Math.PI / 2 });
  // bolt handle (cycles)
  const bolt = new THREE.Group();
  bolt.position.set(0.024, 0.08, -0.05);
  P(bolt, cyl(0.006, 0.006, 0.05, 8), m.steel, 0.02, -0.012, 0, { rz: 0.9 });
  P(bolt, sph(0.011, 8, 6), m.steel, 0.038, -0.026, 0);
  g.add(bolt);
  ud.boltOrPump = bolt;
  // magazine
  ud.magazine = P(g, box(0.032, 0.05, 0.09), m.polymerDark, 0, -0.04, -0.13);
  // cheek riser + shoulder pad
  P(g, box(0.04, 0.035, 0.16), m.polymerDark, 0, 0.075, 0.18);
  P(g, box(0.04, 0.11, 0.03), m.polymerDark, 0, 0.005, 0.29);
  ud.muzzle = marker(g, 0, 0.075, -0.82);
  ud.gripR = marker(g, 0, -0.02, 0.05);
  ud.gripL = marker(g, 0, -0.02, -0.32);
  ud.shellEject = marker(g, 0.03, 0.09, -0.1);
  if (fp) {
    P(g, cyl(0.02, 0.02, 0.008, 12), m.lens, 0, 0.135, -0.252, { rx: Math.PI / 2 }); // objective lens
    P(g, cyl(0.018, 0.018, 0.006, 12), m.lens, 0, 0.135, -0.014, { rx: Math.PI / 2 }); // ocular lens
    // etched reticle on the ocular (reads through the scope at ADS)
    P(g, box(0.033, 0.0014, 0.001), m.reticle, 0, 0.135, -0.0105);
    P(g, box(0.0014, 0.033, 0.001), m.reticle, 0, 0.135, -0.0105);
    P(g, box(0.012, 0.024, 0.02), m.metalDark, 0, 0.163, -0.13);             // elevation turret
    P(g, box(0.024, 0.012, 0.02), m.metalDark, 0.02, 0.135, -0.13);          // windage turret
    P(g, box(0.006, 0.02, 0.006), m.steel, 0, -0.008, -0.03, { rx: 0.22 });  // trigger
    P(g, box(0.03, 0.008, 0.07), m.metal, 0, -0.002, -0.055);                // trigger guard
    // folded bipod stubs under forend
    P(g, cyl(0.005, 0.005, 0.12, 6), m.metalDark, -0.017, -0.02, -0.42, { rx: Math.PI / 2 });
    P(g, cyl(0.005, 0.005, 0.12, 6), m.metalDark, 0.017, -0.02, -0.42, { rx: Math.PI / 2 });
    P(g, box(0.04, 0.02, 0.03), m.grip, 0, -0.048, 0.05, { rx: 0.3 });       // grip swell
  }
}

function buildTalon(g, fp, m) {
  const ud = g.userData;
  // blade: tapers to the tip (forward -Z), slight drop point
  P(g, taperBox(0.006, 0.03, 0.17, 0.25, 0.3), m.blade, 0, 0.012, -0.155);
  // guard
  P(g, box(0.014, 0.05, 0.012), m.metalDark, 0, 0.008, -0.068);
  // handle
  P(g, cyl(0.014, 0.016, 0.105, 8), m.polymerDark, 0, 0, -0.01, { rx: Math.PI / 2 });
  ud.muzzle = marker(g, 0, 0.012, -0.24);
  ud.gripR = marker(g, 0, 0, -0.01);
  ud.gripL = marker(g, 0, -0.03, 0.02);
  if (fp) {
    P(g, box(0.008, 0.008, 0.03), m.metalDark, 0, 0, 0.05);                 // pommel
    P(g, cyl(0.0165, 0.0165, 0.008, 8), m.grip, 0, 0, -0.03, { rx: Math.PI / 2 }); // grip ring
    P(g, cyl(0.0165, 0.0165, 0.008, 8), m.grip, 0, 0, 0.012, { rx: Math.PI / 2 }); // grip ring
    P(g, box(0.0056, 0.008, 0.1), m.metalDark, 0, 0.026, -0.11);            // spine jimping strip
  }
}

function buildGrenade(g, fp, m, kind) {
  const ud = g.userData;
  const band = kind === 'flash' ? m.bandFlash : m.bandSmoke;
  // body
  P(g, cyl(0.031, 0.033, 0.1, 12), m.gren, 0, 0, 0);
  // band + top cap + fuse head
  P(g, cyl(0.0325, 0.0335, 0.02, 12), band, 0, 0.02, 0);
  P(g, cyl(0.024, 0.03, 0.018, 12), m.metalDark, 0, 0.058, 0);
  P(g, cyl(0.01, 0.012, 0.02, 8), m.metalDark, 0, 0.075, 0);
  // spoon lever
  P(g, box(0.014, 0.075, 0.006), m.pin, 0, 0.03, -0.036, { rx: -0.12 });
  ud.muzzle = marker(g, 0, 0.08, 0);
  ud.gripR = marker(g, 0, -0.01, 0.01);
  ud.gripL = marker(g, 0, -0.04, 0);
  if (fp) {
    P(g, tor(0.013, 0.0022, 6, 12), m.pin, 0, 0.068, 0.024, { ry: Math.PI / 2 }); // pull ring
    P(g, box(0.05, 0.016, 0.002), m.polymerDark, 0, -0.01, -0.0332);         // label plate
    if (kind === 'smoke') {
      P(g, cyl(0.004, 0.004, 0.012, 6), m.metalDark, 0.014, 0.062, 0.012);   // vent nub
      P(g, cyl(0.004, 0.004, 0.012, 6), m.metalDark, -0.014, 0.062, 0.012);  // vent nub
    }
  }
}

const BUILDERS = {
  vireo: buildVireo,
  kestrel: buildKestrel,
  ridgeline: buildRidgeline,
  boreas: buildBoreas,
  longwatch: buildLongwatch,
  talon: buildTalon,
  flash: (g, fp, m) => buildGrenade(g, fp, m, 'flash'),
  smoke: (g, fp, m) => buildGrenade(g, fp, m, 'smoke'),
};

export function buildWeaponModel(id, { firstPerson = false } = {}) {
  const g = new THREE.Group();
  g.name = `weapon_${id}${firstPerson ? '_fp' : ''}`;
  const builder = BUILDERS[id] || BUILDERS.ridgeline;
  builder(g, firstPerson, mats(firstPerson));
  if (!g.userData.muzzle) g.userData.muzzle = marker(g, 0, 0.05, -0.4);
  if (!g.userData.magazine) g.userData.magazine = null;
  if (!g.userData.boltOrPump) g.userData.boltOrPump = null;
  if (!g.userData.shellEject) g.userData.shellEject = null;
  g.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = !firstPerson;
      o.receiveShadow = false;
    }
  });
  return g;
}

// Standalone shotgun shell (viewmodel reload hand prop).
export function buildShell(firstPerson = true) {
  const m = mats(firstPerson);
  const g = new THREE.Group();
  P(g, cyl(0.0092, 0.0092, 0.05, 8), m.shell, 0, 0.008, 0);
  P(g, cyl(0.0098, 0.0098, 0.014, 8), m.brass, 0, -0.024, 0);
  return g;
}
