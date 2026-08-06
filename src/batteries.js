// batteries.js — three fictionalized interceptor batteries with distinct silhouettes,
// moving launcher components, status lighting, decals and launch hooks.
// All performance numbers are invented for gameplay; see README safety note.
import * as THREE from 'three';
import { Kit } from './base.js';
import { stencilTexture, hazardTexture, scorchTexture, clamp, damp, lerp, tintGeometry } from './utils.js';
import { makeBoxCollider } from './physics.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const E = (x, y, z) => new THREE.Euler(x, y, z);

export const BATTERY_DEFS = {
  patriot: {
    key: 'patriot', name: 'MIM-9 RAMPART', kind: 'Terminal defense', ammo: 4,
    prepTime: 1.1, cycleTime: 1.4, reloadTime: 14,
    blurb: 'Fast response · short window · hard maneuvering',
    interceptor: {
      maxSpeed: 680, boostAccel: 330, boostTime: 2.8, motorTime: 5.2,
      turnBoost: 1.7, turnMid: 2.9, turnTerm: 4.2, fuse: 24, effSpeed: 520,
      envelope: { minAlt: 60, maxAlt: 3600, maxRange: 5200 },
      trail: 1.0, plume: 1.0, canisterKick: 0.09,
    },
  },
  thaad: {
    key: 'thaad', name: 'TX-11 HIGHGUARD', kind: 'High-altitude area defense', ammo: 6,
    prepTime: 2.6, cycleTime: 2.2, reloadTime: 22,
    blurb: 'Slow prep · broad window · high-altitude kill',
    interceptor: {
      maxSpeed: 1020, boostAccel: 360, boostTime: 4.0, motorTime: 7.5,
      turnBoost: 1.05, turnMid: 1.9, turnTerm: 2.8, fuse: 34, effSpeed: 800,
      envelope: { minAlt: 1500, maxAlt: 9500, maxRange: 11000 },
      trail: 1.3, plume: 1.4, canisterKick: 0.05,
    },
  },
  sentinel: {
    key: 'sentinel', name: 'SENTINEL-X LONGBOW', kind: 'Long-range test article', ammo: 2,
    prepTime: 4.2, cycleTime: 3.0, reloadTime: 0, // no reload in-scenario
    blurb: 'Two rounds · longest reach · maximum spectacle',
    interceptor: {
      maxSpeed: 1350, boostAccel: 400, boostTime: 5.4, motorTime: 9.5,
      turnBoost: 0.8, turnMid: 1.5, turnTerm: 2.3, fuse: 46, effSpeed: 1050,
      envelope: { minAlt: 2400, maxAlt: 16000, maxRange: 18000 },
      trail: 1.6, plume: 2.0, canisterKick: 0.03,
    },
  },
};

// ------------------------------------------------------------------ battery
export class Battery {
  constructor(scene, base, key) {
    this.key = key;
    this.def = BATTERY_DEFS[key];
    this.base = base;
    this.scene = scene;
    this.state = 'ready';          // ready | prep | cycle | reloading | empty
    this.ammo = this.def.ammo;
    this.shotsFired = 0;
    this.timer = 0;
    this.pendingTrack = null;
    this.onReadyToFire = null;     // callback(battery, track)
    this.time = 0;
    this.aimYaw = 0;               // desired azimuth (world)
    this._slewedYaw = 0;

    const pad = base.padPositions[key];
    this.group = new THREE.Group();
    this.group.position.copy(pad.pos);
    this.group.rotation.y = pad.heading;
    this.heading = pad.heading;
    scene.add(this.group);

    this.azGroup = new THREE.Group();
    this.elevGroup = new THREE.Group();
    this.muzzles = [];        // {local: Vector3, spent: bool, capMesh}
    this.kick = 0;

    if (key === 'patriot') this._buildPatriot();
    else if (key === 'thaad') this._buildThaad();
    else this._buildSentinel();

    this._buildLamps();
    this._buildHeatDecal();

    // collider around the whole launcher
    const wp = pad.pos;
    base.colliders.push(makeBoxCollider(V(wp.x, 2, wp.z), V(9.5, 4, 9.5), pad.heading));
  }

  // ---------- shared bits
  _lamp(x, y, z, parent) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.09, 0.05), new THREE.MeshBasicMaterial({ color: 0x22ff44, toneMapped: false }));
    m.position.set(x, y, z);
    parent.add(m);
    return m;
  }

  _buildLamps() {
    // status stack on a small post near the launcher
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 1.5), this.base.materials.steel);
    post.position.set(3.4, 0.75, 3.4);
    this.group.add(post);
    this.lampReady = this._lamp(3.4, 1.52, 3.4, this.group);
    this.lampPrep = this._lamp(3.4, 1.4, 3.4, this.group);
    this.lampPrep.material = new THREE.MeshBasicMaterial({ color: 0xffaa22, toneMapped: false });
    this.lampEmpty = this._lamp(3.4, 1.28, 3.4, this.group);
    this.lampEmpty.material = new THREE.MeshBasicMaterial({ color: 0xff3322, toneMapped: false });
    // strobe on launcher
    this.strobeMat = new THREE.MeshBasicMaterial({ color: 0xff5533, toneMapped: false, transparent: true, opacity: 0.15 });
    const strobe = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), this.strobeMat);
    strobe.position.set(0, this.key === 'sentinel' ? 3.1 : 2.8, 0);
    this.group.add(strobe);
  }

  _buildHeatDecal() {
    const tex = scorchTexture(128);
    this.heatMat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0, depthWrite: false, color: 0x201510 });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(7, 7), this.heatMat);
    m.rotation.x = -Math.PI / 2;
    m.position.y = 0.2;
    // behind the muzzles (exhaust splash zone)
    m.position.z = this.key === 'sentinel' ? 0 : -3.4;
    m.renderOrder = 1;
    this.group.add(m);
  }

  _decal(text, w, h, pos, rot, parent, sub = null) {
    const tex = stencilTexture(text, { w: 256, h: 64, size: 26, sub });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({
      map: tex, transparent: true, toneMapped: false, opacity: 0.85, polygonOffset: true, polygonOffsetFactor: -1,
    }));
    m.position.copy(pos);
    if (rot) m.rotation.copy(rot);
    parent.add(m);
  }

  _hazardStrip(w, h, pos, rot, parent) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({
      map: hazardTexture(), transparent: false, toneMapped: true, polygonOffset: true, polygonOffsetFactor: -1,
    }));
    m.position.copy(pos);
    if (rot) m.rotation.copy(rot);
    parent.add(m);
  }

  // two-part telescoping cylinder between two anchors; each anchor is either a static
  // Vector3 in `parent` space or {obj, local} — a point on another (moving) object.
  _hydraulic(parent, from, to, r1 = 0.09, r2 = 0.055) {
    const outer = new THREE.Mesh(new THREE.CylinderGeometry(r1, r1, 1, 8), this.base.materials.steel);
    const inner = new THREE.Mesh(new THREE.CylinderGeometry(r2, r2, 1, 8),
      new THREE.MeshStandardMaterial({ color: 0xc8ccc4, roughness: 0.25, metalness: 0.9 }));
    parent.add(outer, inner);
    const a = new THREE.Vector3(), b = new THREE.Vector3(), tmp = new THREE.Vector3();
    const q = new THREE.Quaternion();
    const resolve = (anchor, out) => {
      if (anchor.isVector3) return out.copy(anchor);
      out.copy(anchor.local);
      anchor.obj.localToWorld(out);
      return parent.worldToLocal(out);
    };
    const update = () => {
      resolve(from, a);
      resolve(to, b);
      const len = a.distanceTo(b);
      outer.position.copy(tmp.copy(a).lerp(b, 0.28));
      outer.scale.set(1, len * 0.56, 1);
      inner.position.copy(tmp.copy(a).lerp(b, 0.5));
      inner.scale.set(1, len, 1);
      const dir = tmp.copy(b).sub(a).normalize();
      q.setFromUnitVectors(V(0, 1, 0), dir);
      outer.quaternion.copy(q);
      inner.quaternion.copy(q);
    };
    update();
    return update;
  }

  // ---------- PATRIOT-inspired: canted quad-canister trailer
  _buildPatriot() {
    const kit = new Kit();
    const mats = this.base.materials;
    // trailer platform
    kit.box('paint', 5.6, 0.5, 2.6, V(0, 0.88, -0.4), 0x49523e);
    kit.box('paint', 1.1, 0.5, 2.4, V(-3.1, 0.84, -0.4), 0x3d4534); // tongue
    // wheels
    for (const wx of [0.8, 2.0]) for (const s of [-1, 1]) {
      const g = new THREE.CylinderGeometry(0.56, 0.56, 0.4, 12);
      g.rotateX(Math.PI / 2);
      kit.custom('paint', g, V(wx, 0.56, -0.4 + s * 1.3), 0x161616);
      const hub = new THREE.CylinderGeometry(0.22, 0.22, 0.42, 8);
      hub.rotateX(Math.PI / 2);
      kit.custom('steel', hub, V(wx, 0.56, -0.4 + s * 1.3), 0x5d6157);
    }
    // outrigger legs
    for (const [lx, lz] of [[-2.6, 0.9], [-2.6, -1.7], [2.6, 0.9], [2.6, -1.7]]) {
      kit.cyl('steel', 0.07, 0.07, 0.9, V(lx, 0.45, lz), 0x5c6156);
      kit.box('steel', 0.4, 0.08, 0.4, V(lx, 0.05, lz), 0x51564c);
    }
    // ECS box on front (vents, door seam, cooling unit)
    kit.box('paint', 1.3, 1.0, 1.6, V(-2.2, 1.7, -0.4), 0x424a38);
    for (let i = 0; i < 3; i++) {
      kit.box('paint', 0.06, 0.09, 1.2, V(-2.87, 1.5 + i * 0.18, -0.4), 0x2c3126);
    }
    kit.box('paint', 0.5, 0.72, 0.05, V(-2.05, 1.62, 0.42), 0x39412f);
    kit.box('steel', 0.34, 0.34, 0.1, V(-2.5, 1.75, 0.42), 0x565c50);
    this.staticMeshes = kit.build(mats, this.group);

    // azimuth turntable
    this.azGroup.position.set(0.8, 1.25, -0.4);
    this.group.add(this.azGroup);
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.25, 0.28, 16), mats.steel);
    tintMesh(ring, 0x3a3e35);
    this.azGroup.add(ring);

    // elevation assembly: 2x2 rectangular canisters
    this.elevGroup.position.set(0, 0.25, 0);
    this.elevGroup.rotation.x = -38 * Math.PI / 180; // canted skyward (rotates -x so +z end rises)
    this.azGroup.add(this.elevGroup);

    const ck = new Kit();
    const W = 1.06, L = 5.0;
    let mi = 0;
    for (const sx of [-1, 1]) for (const sy of [0, 1]) {
      const x = sx * (W / 2 + 0.04), y = 0.7 + sy * (W + 0.1);
      ck.box('paint', W, W, L, V(x, y, 0.4), 0x4c5442);
      // rear ring
      ck.cyl('steel', 0.46, 0.46, 0.12, V(x, y, -2.2), 0x333833, E(Math.PI / 2, 0, 0), 12);
      this.muzzles.push({ local: V(x, y, 0.4 + L / 2), dirLocal: V(0, 0, 1), spent: false, idx: mi++ });
    }
    // cradle frame
    ck.box('steel', 2.5, 0.2, 4.6, V(0, 0.28, 0.2), 0x3a3e35);
    ck.box('steel', 2.5, 1.9, 0.18, V(0, 1.2, -2.35), 0x40453c);
    this.elevMeshes = ck.build(mats, this.elevGroup);

    // canister front caps (blow off on launch) + hazard stripes
    this._makeCaps(1.06, 'box');
    this._decal('RAMPART-1', 2.0, 0.5, V(0, 1.15, -2.45), E(0, Math.PI, 0), this.elevGroup, 'MIM-9 · BTRY A');
    this._hazardStrip(2.2, 0.22, V(0, 0.16, 2.75), E(0, 0, 0), this.elevGroup);

    // elevation pistons
    this._pistonUpdaters = [
      this._hydraulic(this.azGroup, V(0.9, 0.1, -1.4), V(0.75, 1.15, -0.9)),
      this._hydraulic(this.azGroup, V(-0.9, 0.1, -1.4), V(-0.75, 1.15, -0.9)),
    ];
  }

  // ---------- THAAD-inspired: 8 round tubes on heavy truck
  _buildThaad() {
    const kit = new Kit();
    const mats = this.base.materials;
    // truck chassis
    kit.box('paint', 8.6, 0.55, 2.5, V(0.4, 1.0, 0), 0x2e332b);
    kit.box('paint', 2.2, 1.7, 2.5, V(-3.4, 2.05, 0), 0x49523e);       // cab
    kit.box('glass', 2.0, 0.6, 2.3, V(-3.35, 2.5, 0), 0x0e1512);
    kit.box('paint', 0.4, 0.8, 2.4, V(-4.6, 1.1, 0), 0x49523e);
    // wheels ×5 axles
    for (const wx of [-3.6, -2.2, 0.6, 1.9, 3.2]) for (const s of [-1, 1]) {
      const g = new THREE.CylinderGeometry(0.56, 0.56, 0.42, 12);
      g.rotateX(Math.PI / 2);
      kit.custom('paint', g, V(wx, 0.56, s * 1.12), 0x141414);
      const hub = new THREE.CylinderGeometry(0.22, 0.22, 0.44, 8);
      hub.rotateX(Math.PI / 2);
      kit.custom('steel', hub, V(wx, 0.56, s * 1.12), 0x5d6157);
    }
    // stabilizers
    for (const [lx, lz] of [[4.4, 1.5], [4.4, -1.5], [-0.6, 1.5], [-0.6, -1.5]]) {
      kit.cyl('steel', 0.09, 0.09, 1.1, V(lx, 0.55, lz), 0x5c6156);
      kit.box('steel', 0.55, 0.1, 0.55, V(lx, 0.06, lz), 0x51564c);
    }
    // generator pack behind cab
    kit.box('paint', 1.4, 1.2, 2.3, V(-1.6, 1.9, 0), 0x424a38);
    this.staticMeshes = kit.build(mats, this.group);

    // azimuth pivot at bed rear
    this.azGroup.position.set(1.6, 1.35, 0);
    this.group.add(this.azGroup);

    // elevation rack: 2 rows x 4 round tubes, elevated steeply
    this.elevGroup.position.set(0, 0.3, 0);
    this.elevGroup.rotation.x = -62 * Math.PI / 180;
    this.azGroup.add(this.elevGroup);

    const ck = new Kit();
    const R = 0.34, L = 6.4;
    let mi = 0;
    for (let col = 0; col < 4; col++) {
      for (let row = 0; row < 2; row++) {
        const x = -1.2 + col * 0.8, y = 0.62 + row * 0.82;
        ck.cyl('paint', R, R, L, V(x, y, 0.6), 0x515948, E(Math.PI / 2, 0, 0), 14);
        ck.cyl('steel', R + 0.05, R + 0.05, 0.3, V(x, y, -2.5), 0x3a3e35, E(Math.PI / 2, 0, 0), 14);
        ck.cyl('steel', R + 0.05, R + 0.05, 0.3, V(x, y, 3.0), 0x3a3e35, E(Math.PI / 2, 0, 0), 14);
        this.muzzles.push({ local: V(x, y, 0.6 + L / 2), dirLocal: V(0, 0, 1), spent: false, idx: mi++ });
      }
    }
    // rack frame
    ck.box('steel', 3.6, 0.24, 5.8, V(-0.0 - 0, 0.1, 0.3), 0x3a3e35);
    // lengthwise stiffeners under the base plate (visible when elevated)
    for (const sx of [-1.15, 0, 1.15]) {
      ck.box('steel', 0.16, 0.12, 5.5, V(sx, -0.07, 0.3), 0x2e332a);
    }
    ck.box('steel', 3.4, 0.12, 0.2, V(0, -0.07, 1.9), 0x2e332a);
    ck.box('steel', 3.4, 0.12, 0.2, V(0, -0.07, -1.3), 0x2e332a);
    ck.box('steel', 3.6, 1.8, 0.2, V(0, 1.0, -2.7), 0x444a40);
    ck.box('steel', 0.2, 1.6, 5.6, V(-1.85, 0.9, 0.3), 0x49503f);
    ck.box('steel', 0.2, 1.6, 5.6, V(1.85, 0.9, 0.3), 0x49503f);
    // side panel detail: stiffener ribs + access hatches so the slab reads mechanical
    for (const sx of [-1, 1]) {
      for (const rz of [-2.1, -0.9, 0.4, 1.7, 2.9]) {
        ck.box('steel', 0.27, 1.52, 0.12, V(sx * 1.86, 0.9, rz), 0x30352b);
      }
      ck.box('paint', 0.05, 0.62, 0.92, V(sx * 1.97, 0.72, 1.05), 0x555c49);
      ck.box('paint', 0.05, 0.4, 0.6, V(sx * 1.97, 1.05, -1.5), 0x3a4133);
    }
    this.elevMeshes = ck.build(mats, this.elevGroup);

    this._makeCaps(0.68, 'circle');
    this._decal('HIGHGUARD', 2.4, 0.55, V(0, 0.2, -2.85), E(0, Math.PI, 0), this.elevGroup, 'TX-11 · BTRY B');
    this._hazardStrip(3.4, 0.26, V(0, -0.04, 3.2), E(0, 0, 0), this.elevGroup);

    this._pistonUpdaters = [
      this._hydraulic(this.azGroup, V(1.4, 0.0, -1.2), V(1.2, 1.6, -1.15), 0.11, 0.07),
      this._hydraulic(this.azGroup, V(-1.4, 0.0, -1.2), V(-1.2, 1.6, -1.15), 0.11, 0.07),
    ];
  }

  // ---------- SENTINEL-X: fixed twin heavy canisters with erector animation
  _buildSentinel() {
    const kit = new Kit();
    const mats = this.base.materials;
    // heavy emplacement: concrete plinth + steel deck with kick rails
    kit.box('concrete', 10, 0.9, 8, V(0, 0.45, 0), 0x87857a);
    kit.box('paint', 9.2, 0.3, 7.2, V(0, 1.05, 0), 0x353c31);
    kit.box('paint', 9.2, 0.1, 0.16, V(0, 1.32, 3.55), 0x8a8348);
    kit.box('paint', 9.2, 0.1, 0.16, V(0, 1.32, -3.55), 0x8a8348);
    // deck handrails (rear + sides)
    for (const sz of [-1, 1]) {
      for (let i = 0; i < 5; i++) {
        kit.cyl('steel', 0.025, 0.025, 0.9, V(-4.4 + i * 2.2, 1.65, sz * 3.5), 0x6a6f64, null, 6);
      }
      kit.box('steel', 9.0, 0.05, 0.05, V(0, 2.1, sz * 3.5), 0x6a6f64);
    }
    // service tower: 4-leg lattice with platforms and floodlet
    const TX = 3.9, TZ = 1.6, TH = 9.5;
    for (const [dx, dz] of [[-0.7, -0.7], [0.7, -0.7], [-0.7, 0.7], [0.7, 0.7]]) {
      kit.cyl('steel', 0.07, 0.09, TH, V(TX + dx, TH / 2 + 1.2, TZ + dz), 0x5f645a, null, 8);
    }
    for (let y = 2.6; y < TH + 1; y += 1.8) {
      kit.box('steel', 1.55, 0.07, 0.07, V(TX, y, TZ - 0.7), 0x5f645a);
      kit.box('steel', 1.55, 0.07, 0.07, V(TX, y, TZ + 0.7), 0x5f645a);
      kit.box('steel', 0.07, 0.07, 1.55, V(TX - 0.7, y, TZ), 0x5f645a);
      kit.box('steel', 0.07, 0.07, 1.55, V(TX + 0.7, y, TZ), 0x5f645a);
    }
    kit.box('paint', 2.2, 0.12, 2.2, V(TX, 6.2, TZ), 0x3f463a);        // mid platform
    kit.box('paint', 2.4, 0.12, 2.4, V(TX, TH + 1.1, TZ), 0x3f463a);   // top platform
    kit.box('steel', 2.9, 0.1, 0.1, V(TX - 1.5, TH + 1.1, TZ), 0x767b70); // service boom
    kit.plane('lampFace', 0.5, 0.25, V(TX - 2.6, TH + 1.0, TZ), 0xffffff, E(-0.8, 0, 0));
    // control cabin + cooling unit
    kit.box('paint', 2.6, 2.1, 1.9, V(-3.4, 2.2, 2.4), 0x49523e);
    kit.box('glass', 2.4, 0.55, 1.7, V(-3.4, 2.85, 2.4), 0x101a16);
    kit.box('paint', 1.3, 1.1, 1.2, V(-3.6, 1.7, -2.4), 0x565c50);
    for (let i = 0; i < 3; i++) kit.box('paint', 0.04, 0.8, 0.9, V(-4.28, 1.7, -2.4 + 0 * i), 0x2f342b);
    // cable trunks across deck
    kit.box('paint', 6.5, 0.14, 0.5, V(-0.4, 1.28, 3.0), 0x22251f);
    kit.box('paint', 0.5, 0.14, 4.5, V(-3.4, 1.28, 0.4), 0x22251f);
    // trunnion blocks (erector hinge)
    for (const sx of [-1.35, 1.35]) {
      kit.box('steel', 0.5, 1.0, 0.9, V(sx, 1.65, -1.4), 0x454a41);
      kit.cyl('steel', 0.16, 0.16, 0.6, V(sx, 2.05, -1.4), 0x2f332c, E(0, 0, Math.PI / 2), 10);
    }
    this.staticMeshes = kit.build(mats, this.group);

    // erector assembly (rotates from horizontal to near-vertical during prep)
    this.azGroup.position.set(0, 2.05, -1.4);
    this.group.add(this.azGroup);
    this.elevGroup.position.set(0, 0, 0);
    this.elevGroup.rotation.x = -16 * Math.PI / 180;   // stowed-ish; erects on prep
    this.azGroup.add(this.elevGroup);

    const ck = new Kit();
    const R = 0.62, L = 8.6;
    let mi = 0;
    for (const sx of [-1, 1]) {
      const x = sx * 1.05;
      // two-tone canister: olive body + darker sleeve sections
      ck.cyl('paint', R, R, L, V(x, 0.55, 1.4), 0x4e5645, E(Math.PI / 2, 0, 0), 18);
      ck.cyl('paint', R + 0.015, R + 0.015, 1.8, V(x, 0.55, -1.5), 0x39412f, E(Math.PI / 2, 0, 0), 18);
      ck.cyl('paint', R + 0.015, R + 0.015, 1.2, V(x, 0.55, 3.2), 0x39412f, E(Math.PI / 2, 0, 0), 18);
      // ribs
      for (const rz of [-2.6, -0.5, 1.7, 3.9]) {
        ck.cyl('steel', R + 0.06, R + 0.06, 0.2, V(x, 0.55, 1.4 + rz), 0x2c302a, E(Math.PI / 2, 0, 0), 18);
      }
      // umbilical conduit along each canister
      ck.box('paint', 0.12, 0.12, L * 0.85, V(x + (sx > 0 ? 0.62 : -0.62), 0.75, 1.2), 0x23261f);
      // aft closure puck + dark nozzle throat (reads from behind during erection)
      ck.cyl('steel', 0.5, 0.5, 0.14, V(x, 0.55, -2.98), 0x2c302a, E(Math.PI / 2, 0, 0), 18);
      const noz = new THREE.CircleGeometry(0.34, 14);
      noz.rotateY(Math.PI);
      ck.custom('paint', noz, V(x, 0.55, -3.08), 0x0c0d0b);
      this.muzzles.push({ local: V(x, 0.55, 1.4 + L / 2), dirLocal: V(0, 0, 1), spent: false, idx: mi++ });
    }
    // A-frame erector cradle under canisters (low side rails keep the round tubes readable)
    ck.box('steel', 3.3, 0.34, 7.6, V(0, -0.35, 1.0), 0x3a3e35);
    ck.box('steel', 3.3, 1.2, 0.3, V(0, 0.18, -2.9), 0x40453c);
    for (const sx of [-1.35, 1.35]) {
      ck.box('steel', 0.2, 0.5, 0.2, V(sx, 0.6, -2.9), 0x50554b); // rear posts
    }
    ck.box('steel', 0.24, 0.55, 6.2, V(-1.62, -0.22, 0.8), 0x40453c);
    ck.box('steel', 0.24, 0.55, 6.2, V(1.62, -0.22, 0.8), 0x40453c);
    // cross bracing between canisters
    for (const bz of [-1.6, 0.8, 3.0]) {
      ck.box('steel', 2.2, 0.14, 0.14, V(0, 1.05, bz), 0x454a41);
    }
    this.elevMeshes = ck.build(mats, this.elevGroup);

    this._makeCaps(1.24, 'circle');
    this._decal('SENTINEL-X', 2.6, 0.6, V(0, 0.5, -3.08), E(0, Math.PI, 0), this.elevGroup, 'XM-EXP · TEST ARTICLE');
    this._hazardStrip(2.6, 0.3, V(0, -0.55, 4.9), E(0, 0, 0), this.elevGroup);

    this._pistonUpdaters = [
      this._hydraulic(this.azGroup, V(1.6, -1.3, 2.6), { obj: this.elevGroup, local: V(1.45, -0.35, 2.8) }, 0.15, 0.1),
      this._hydraulic(this.azGroup, V(-1.6, -1.3, 2.6), { obj: this.elevGroup, local: V(-1.45, -0.35, 2.8) }, 0.15, 0.1),
    ];
    this.erect = { from: -16 * Math.PI / 180, to: -84 * Math.PI / 180, t: 0 };
  }

  _makeCaps(size, shape) {
    // front covers that pop on launch + dark "empty tube" faces revealed after
    this.caps = [];
    const capMat = new THREE.MeshStandardMaterial({ color: shape === 'circle' ? 0x7a5638 : 0x6a614e, roughness: 0.7, metalness: 0.2 });
    const ribMat = new THREE.MeshStandardMaterial({ color: 0x3c4136, roughness: 0.6, metalness: 0.3 });
    for (const mz of this.muzzles) {
      const cap = new THREE.Group();
      const face = shape === 'circle'
        ? new THREE.Mesh(new THREE.CircleGeometry(size / 2, 16), capMat)
        : new THREE.Mesh(new THREE.PlaneGeometry(size * 0.96, size * 0.96), capMat);
      cap.add(face);
      // X-ribs across the cover
      for (const rz of [Math.PI / 4, -Math.PI / 4]) {
        const rib = new THREE.Mesh(new THREE.BoxGeometry(size * 1.06, size * 0.09, 0.03), ribMat);
        rib.rotation.z = rz;
        rib.position.z = 0.02;
        cap.add(rib);
      }
      cap.position.copy(mz.local).addScaledVector(mz.dirLocal, 0.012);
      this.elevGroup.add(cap);
      const dark = new THREE.Mesh(
        shape === 'circle' ? new THREE.CircleGeometry(size / 2 * 0.92, 16) : new THREE.PlaneGeometry(size * 0.88, size * 0.88),
        new THREE.MeshBasicMaterial({ color: 0x050505 }));
      dark.position.copy(mz.local).addScaledVector(mz.dirLocal, 0.005);
      dark.visible = false;
      this.elevGroup.add(dark);
      mz.capMesh = cap;
      mz.darkMesh = dark;
      this.caps.push(cap);
    }
  }

  // ---------- state machine
  get statusText() {
    switch (this.state) {
      case 'ready': return 'READY';
      case 'prep': return 'PREPPING';
      case 'cycle': return 'CYCLING';
      case 'reloading': return `RELOADING ${Math.ceil(this.timer)}s`;
      case 'empty': return 'EXPENDED';
    }
    return this.state.toUpperCase();
  }

  canEngage() { return this.state === 'ready' && this.ammo > 0; }

  requestLaunch(track) {
    if (!this.canEngage()) return false;
    this.state = 'prep';
    this.timer = this.def.prepTime;
    this.pendingTrack = track;
    return true;
  }

  cancelPending() {
    if (this.state === 'prep') { this.state = 'ready'; this.pendingTrack = null; }
  }

  // called by manager when prep completes; returns muzzle info for the interceptor spawn
  _fire() {
    const mz = this.muzzles.find((m) => !m.spent);
    if (!mz) return null;
    mz.spent = true;
    if (mz.capMesh) { mz.capMesh.visible = false; mz.darkMesh.visible = true; }
    this.ammo -= 1;
    this.shotsFired += 1;
    this.kick = this.def.interceptor.canisterKick;
    this.heatMat.opacity = Math.min(0.75, this.shotsFired * 0.22);
    if (this.ammo <= 0) {
      if (this.def.reloadTime > 0) { this.state = 'reloading'; this.timer = this.def.reloadTime; }
      else this.state = 'empty';
    } else {
      this.state = 'cycle';
      this.timer = this.def.cycleTime;
    }
    const pos = new THREE.Vector3();
    const dir = new THREE.Vector3();
    mz.capMesh.getWorldPosition(pos); // cap position == muzzle
    // world direction of tube
    dir.copy(mz.dirLocal).applyQuaternion(this.elevGroup.getWorldQuaternion(new THREE.Quaternion()));
    pos.copy(mz.darkMesh.getWorldPosition(new THREE.Vector3()));
    return { pos, dir, track: this.pendingTrack };
  }

  aimAt(worldPos) {
    if (!worldPos) return;
    const dx = worldPos.x - this.group.position.x;
    const dz = worldPos.z - this.group.position.z;
    this.aimYaw = Math.atan2(dx, dz);
  }

  resetForScenario() {
    this.state = 'ready';
    this.ammo = this.def.ammo;
    this.shotsFired = 0;
    this.timer = 0;
    this.pendingTrack = null;
    this.heatMat.opacity = 0;
    for (const mz of this.muzzles) {
      mz.spent = false;
      if (mz.capMesh) { mz.capMesh.visible = true; mz.darkMesh.visible = false; }
    }
    if (this.erect) this.elevGroup.rotation.x = this.erect.from;
  }

  update(dt, t) {
    this.time = t;
    // slew toward pending target azimuth (visual nicety)
    if (this.pendingTrack && this.pendingTrack.threat && this.pendingTrack.threat.alive) {
      this.aimAt(this.pendingTrack.threat.pos);
    }
    const targetYaw = this.pendingTrack ? this.aimYaw - this.heading : this._slewedYaw;
    this._slewedYaw = damp(this._slewedYaw, targetYaw, 2.2, dt);
    if (this.key !== 'sentinel') this.azGroup.rotation.y = this._slewedYaw;

    // sentinel erector animation during prep
    if (this.erect) {
      const target = (this.state === 'prep' || this.state === 'cycle' || this.ammo < this.def.ammo || this.pendingTrack)
        ? this.erect.to : this.erect.from;
      this.elevGroup.rotation.x = damp(this.elevGroup.rotation.x, target, 1.4, dt);
    }

    // canister kick decay
    if (this.kick > 0.0001) {
      this.elevGroup.position.z = -this.kick * Math.sin(t * 40);
      this.kick = damp(this.kick, 0, 6, dt);
    } else this.elevGroup.position.z = 0;

    for (const u of this._pistonUpdaters || []) u();

    // timers
    if (this.state === 'prep') {
      this.timer -= dt;
      // abort if the target died during prep (no round expended)
      if (this.pendingTrack && (!this.pendingTrack.threat || !this.pendingTrack.threat.alive)) {
        this.cancelPending();
      } else {
        // sentinel must be erected before firing
        const erectOk = !this.erect || Math.abs(this.elevGroup.rotation.x - this.erect.to) < 0.12;
        if (this.timer <= 0 && erectOk) {
          const info = this._fire();
          if (info && this.onReadyToFire) this.onReadyToFire(this, info);
          this.pendingTrack = null;
        }
      }
    } else if (this.state === 'cycle' || this.state === 'reloading') {
      this.timer -= dt;
      if (this.timer <= 0) {
        if (this.state === 'reloading') {
          this.ammo = this.def.ammo;
          for (const mz of this.muzzles) {
            mz.spent = false;
            if (mz.capMesh) { mz.capMesh.visible = true; mz.darkMesh.visible = false; }
          }
        }
        this.state = 'ready';
      }
    }

    // lamps
    const on = (m, v) => { m.material.opacity = 1; m.material.transparent = false; m.visible = v; };
    on(this.lampReady, this.state === 'ready');
    on(this.lampPrep, this.state === 'prep' || this.state === 'cycle');
    on(this.lampEmpty, this.state === 'reloading' || this.state === 'empty');
    // strobe while prepping / cycling
    const strobing = this.state === 'prep' || this.state === 'cycle';
    this.strobeMat.opacity = strobing ? (Math.sin(t * 14) > 0 ? 0.95 : 0.1) : 0.12;
  }
}

function tintMesh(mesh, color) {
  tintGeometry(mesh.geometry, color);
}

// ------------------------------------------------------------------ manager
export class BatteryManager {
  constructor(scene, base) {
    this.batteries = {
      patriot: new Battery(scene, base, 'patriot'),
      thaad: new Battery(scene, base, 'thaad'),
      sentinel: new Battery(scene, base, 'sentinel'),
    };
    this.list = [this.batteries.patriot, this.batteries.thaad, this.batteries.sentinel];
    this.selectedKey = 'patriot';
  }

  get selected() { return this.batteries[this.selectedKey]; }
  select(key) { if (this.batteries[key]) this.selectedKey = key; }

  resetForScenario() { this.list.forEach((b) => b.resetForScenario()); }

  update(dt, t) { this.list.forEach((b) => b.update(dt, t)); }
}
