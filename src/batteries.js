// batteries.js — three fictionalized interceptor batteries: RAMPART (Patriot-
// inspired), HALBERD (THAAD-inspired), SENTINEL (fictional long-range).
// All numbers are gameplay values, not real system characteristics.
import * as THREE from 'three';
import { clamp, damp, stepAngle, wrapAngle, TAU } from './util.js';
import { makeColliderBox, makeColliderCyl } from './physics.js';

export const BATTERY_DEFS = {
  patriot: {
    id: 'patriot',
    name: 'RAMPART PX-4',
    kind: 'Terminal-phase battery',
    desc: 'Fast response · agile near base',
    ammo: 8,
    launchDelay: 1.0,
    reloadTime: 3.5,
    slewRate: 1.5,
    interceptor: {
      accel: 300, boostTime: 2.4, maxSpeed: 950, turnRate: 0.62,
      killRadius: 10, avgSpeed: 560, trailWidth: 0.8,
      color: 0xd8d4c8, flame: 0xffc26e, length: 5.2, girth: 0.21,
    },
    envelope: { minAlt: 120, maxAlt: 2800, maxRange: 4200, sweetLow: 300, sweetHigh: 2200 },
  },
  thaad: {
    id: 'thaad',
    name: 'HALBERD HA-9',
    kind: 'High-altitude battery',
    desc: 'Slow spin-up · wide window',
    ammo: 6,
    launchDelay: 2.4,
    reloadTime: 6.5,
    slewRate: 0.85,
    interceptor: {
      accel: 210, boostTime: 4.4, maxSpeed: 1400, turnRate: 0.34,
      killRadius: 14, avgSpeed: 800, trailWidth: 1.05,
      color: 0xcfd4d9, flame: 0xa9d4ff, length: 6.2, girth: 0.28,
    },
    envelope: { minAlt: 1200, maxAlt: 5200, maxRange: 8000, sweetLow: 1800, sweetHigh: 4600 },
  },
  sentinel: {
    id: 'sentinel',
    name: 'SENTINEL LR-1',
    kind: 'Long-range test battery',
    desc: 'Three rounds · maximum reach',
    ammo: 3,
    launchDelay: 3.4,
    reloadTime: 12,
    slewRate: 0.5,
    interceptor: {
      accel: 165, boostTime: 6.2, maxSpeed: 1800, turnRate: 0.22,
      killRadius: 20, avgSpeed: 980, trailWidth: 1.5,
      color: 0xe3e0d5, flame: 0xffa24d, length: 9.5, girth: 0.42,
    },
    envelope: { minAlt: 1900, maxAlt: 8000, maxRange: 14000, sweetLow: 2400, sweetHigh: 6500 },
  },
};

export function createBatteries(ctx) {
  const { scene, textures, baseMaterials: M } = ctx;
  const pads = ctx.base.batteryPads;
  const list = [];
  const byId = new Map();

  const heatMat = new THREE.MeshStandardMaterial({ map: textures.heatBurn(), roughness: 0.6, metalness: 0.4 });
  const oliveTex = textures.oliveDrab().clone();
  oliveTex.repeat.set(2.6, 1.3);
  const tanTex = textures.desertTan().clone();
  tanTex.repeat.set(2.2, 1.1);
  const canisterMat = new THREE.MeshStandardMaterial({ map: oliveTex, roughness: 0.75 });
  const canisterMatTan = new THREE.MeshStandardMaterial({ map: tanTex, roughness: 0.75 });

  function statusLightMesh() {
    const m = new THREE.Mesh(
      new THREE.SphereGeometry(0.09, 10, 8),
      new THREE.MeshStandardMaterial({ color: 0x113311, emissive: 0x22ff44, emissiveIntensity: 2.2 })
    );
    return m;
  }

  function hydraulics(parent, from, to, r1 = 0.07, r2 = 0.05) {
    // two nested cylinders from->to; returns updater to keep them connected
    const grpTmp = new THREE.Group();
    parent.add(grpTmp);
    const cylA = new THREE.Mesh(new THREE.CylinderGeometry(r1, r1, 1, 8), M.steel);
    const cylB = new THREE.Mesh(new THREE.CylinderGeometry(r2, r2, 1, 8), M.darkMetal);
    grpTmp.add(cylA); grpTmp.add(cylB);
    const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _m = new THREE.Vector3(), _d = new THREE.Vector3();
    const _q = new THREE.Quaternion(), _up = new THREE.Vector3(0, 1, 0);
    function update() {
      _a.copy(from.pos); from.node?.localToWorld?.(_a);
      _b.copy(to.pos); to.node?.localToWorld?.(_b);
      parent.worldToLocal(_a); parent.worldToLocal(_b);
      _d.subVectors(_b, _a);
      const len = _d.length();
      _q.setFromUnitVectors(_up, _d.clone().normalize());
      _m.addVectors(_a, _b).multiplyScalar(0.5);
      cylA.position.copy(_a).addScaledVector(_d, 0.28);
      cylA.quaternion.copy(_q);
      cylA.scale.set(1, len * 0.5, 1);
      cylB.position.copy(_m).addScaledVector(_d, 0.12);
      cylB.quaternion.copy(_q);
      cylB.scale.set(1, len * 0.62, 1);
    }
    update();
    return update;
  }

  function wheelsFor(parent, positions, radius = 0.55, width = 0.42) {
    const geo = new THREE.CylinderGeometry(radius, radius, width, 16);
    const hub = new THREE.CylinderGeometry(radius * 0.45, radius * 0.45, width + 0.04, 10);
    for (const [x, z] of positions) {
      const w = new THREE.Mesh(geo, M.rubber);
      w.rotation.z = Math.PI / 2;
      w.position.set(x, radius, z);
      w.castShadow = true;
      parent.add(w);
      const h = new THREE.Mesh(hub, M.darkMetal);
      h.rotation.z = Math.PI / 2;
      h.position.copy(w.position);
      parent.add(h);
    }
  }

  function labelPlate(parent, text, w, h, x, y, z, ry = 0, opts = {}) {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ map: textures.label(text, { fg: opts.fg ?? '#dcd8ca', bg: opts.bg ?? null, w: 256, h: 64, font: opts.font ?? 'bold 30px Arial' }), transparent: true })
    );
    m.position.set(x, y, z);
    m.rotation.y = ry;
    parent.add(m);
    return m;
  }

  function cableRun(parent, points, r = 0.03) {
    const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
    const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 16, r, 6), M.cable);
    parent.add(tube);
    return tube;
  }

  // =================================================== RAMPART (Patriot-like)
  function buildRampart(pad) {
    const g = new THREE.Group();
    g.position.copy(pad.position);
    g.rotation.y = pad.heading;
    scene.add(g);

    // trailer chassis
    const chassis = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.5, 8.6), canisterMatTan);
    chassis.position.y = 0.95;
    chassis.castShadow = true;
    g.add(chassis);
    wheelsFor(g, [[-1.38, -2.4], [1.38, -2.4], [-1.38, -3.6], [1.38, -3.6]], 0.55, 0.45);
    // outrigger jacks
    for (const [x, z] of [[-1.5, 2.8], [1.5, 2.8], [-1.5, -0.6], [1.5, -0.6]]) {
      const jack = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 1.0, 8), M.steel);
      jack.position.set(x, 0.5, z);
      g.add(jack);
      const foot = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.08, 0.42), M.darkMetal);
      foot.position.set(x, 0.05, z);
      g.add(foot);
    }
    // towing cab hint (detached tractor absent — A-frame)
    const aframe = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 2.2), M.darkMetal);
    aframe.position.set(0, 0.8, 5.2);
    aframe.rotation.x = 0.22;
    g.add(aframe);

    // turntable + erector
    const turntable = new THREE.Group();
    turntable.position.set(0, 1.28, -1.2);
    g.add(turntable);
    const ttBase = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.3, 0.36, 18), M.metal);
    ttBase.castShadow = true;
    turntable.add(ttBase);

    const erector = new THREE.Group();
    erector.position.y = 0.3;
    turntable.add(erector);

    // 4 rectangular canisters (2x2), each "holds 2 rounds"
    const canGrp = new THREE.Group();
    erector.add(canGrp);
    canGrp.position.set(0, 0.55, 0);
    const tubes = [];
    const canGeo = new THREE.BoxGeometry(1.05, 1.05, 5.4);
    for (let cx = 0; cx < 2; cx++) {
      for (let cy = 0; cy < 2; cy++) {
        const can = new THREE.Mesh(canGeo, canisterMat);
        can.position.set((cx - 0.5) * 1.18, cy * 1.18, 0);
        can.castShadow = true;
        canGrp.add(can);
        // front face with 2 round covers + heat rim
        const face = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 1.0), heatMat);
        face.position.set(can.position.x, can.position.y, 2.72);
        canGrp.add(face);
        for (const s of [-0.26, 0.26]) {
          const cover = new THREE.Mesh(new THREE.CircleGeometry(0.21, 18), new THREE.MeshStandardMaterial({ color: 0x8f2f24, roughness: 0.8 }));
          cover.position.set(can.position.x + s, can.position.y, 2.75);
          canGrp.add(cover);
          tubes.push({ cover, offset: new THREE.Vector3(can.position.x + s, can.position.y, 2.6), used: false });
        }
        // stencils
        labelPlate(canGrp, `RMP-${cx}${cy}`, 0.8, 0.22, can.position.x, can.position.y + 0.31, 2.751, 0, { font: 'bold 26px Arial' });
      }
    }
    canGrp.rotation.x = 0; // erector handles elevation

    // hydraulic erector pistons
    const hyd1 = hydraulics(g, { pos: new THREE.Vector3(0.8, 1.1, 0.9), node: g }, { pos: new THREE.Vector3(0.62, 0.4, -1.5), node: canGrp });
    const hyd2 = hydraulics(g, { pos: new THREE.Vector3(-0.8, 1.1, 0.9), node: g }, { pos: new THREE.Vector3(-0.62, 0.4, -1.5), node: canGrp });

    // cabling + junction box
    cableRun(g, [[1.2, 1.15, -3.9], [1.7, 0.4, -4.4], [2.4, 0.15, -5.2]]);
    const jbox = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.6, 0.3), M.darkMetal);
    jbox.position.set(1.25, 1.5, -3.9);
    g.add(jbox);
    // status light + plate
    const light = statusLightMesh();
    light.position.set(-1.2, 1.75, -3.9);
    g.add(light);
    labelPlate(g, 'RAMPART PX-4', 1.7, 0.34, 0, 0.78, 4.32, 0, { bg: '#42452f' });

    ctx.world.colliders.push(makeColliderBox(pad.position.x, pad.position.z, 1.7, 4.5, pad.heading, 0, 3));

    return {
      group: g, turntable, elevGroup: canGrp, tubes, statusLight: light,
      restElevation: 0.66, fireElevation: 0.66, elevAxis: 'x', elevSign: -1,
      hydUpdaters: [hyd1, hyd2],
      muzzleForward: new THREE.Vector3(0, 0, 1),
    };
  }

  // =================================================== HALBERD (THAAD-like)
  function buildHalberd(pad) {
    const g = new THREE.Group();
    g.position.copy(pad.position);
    g.rotation.y = pad.heading;
    scene.add(g);

    // heavy truck: long chassis + big cab
    const chassis = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.7, 10.4), canisterMatTan);
    chassis.position.y = 1.05;
    chassis.castShadow = true;
    g.add(chassis);
    const cab = new THREE.Mesh(new THREE.BoxGeometry(2.7, 1.9, 2.2), canisterMatTan);
    cab.position.set(0, 2.1, 4.6);
    cab.castShadow = true;
    g.add(cab);
    const winShield = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 0.7), M.glassDark);
    winShield.position.set(0, 2.45, 5.72);
    winShield.rotation.x = -0.15;
    g.add(winShield);
    const bumper = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.35, 0.3), M.darkMetal);
    bumper.position.set(0, 0.95, 5.85);
    g.add(bumper);
    wheelsFor(g, [
      [-1.42, 4.2], [1.42, 4.2], [-1.42, 1.6], [1.42, 1.6],
      [-1.42, -0.6], [1.42, -0.6], [-1.42, -2.6], [1.42, -2.6], [-1.42, -4.4], [1.42, -4.4],
    ], 0.62, 0.5);
    // stabilizer legs (rear)
    for (const [x, z] of [[-1.6, -4.9], [1.6, -4.9]]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 1.2, 8), M.steel);
      leg.position.set(x, 0.6, z);
      g.add(leg);
      const foot = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.1, 0.55), M.darkMetal);
      foot.position.set(x, 0.06, z);
      g.add(foot);
    }

    // elevating tube pack: 6 large round tubes (2 cols x 3 rows)
    const pivot = new THREE.Group();
    pivot.position.set(0, 1.55, -3.4);
    g.add(pivot);
    const pack = new THREE.Group();
    pivot.add(pack);
    const tubes = [];
    const tubeGeo = new THREE.CylinderGeometry(0.42, 0.42, 6.8, 18);
    tubeGeo.rotateX(Math.PI / 2);
    const frame = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.9, 0.5), M.metal);
    frame.position.set(0, 1.15, -2.6);
    pack.add(frame);
    for (let col = 0; col < 2; col++) {
      for (let row = 0; row < 3; row++) {
        const tube = new THREE.Mesh(tubeGeo, canisterMat);
        tube.position.set((col - 0.5) * 1.05, 0.35 + row * 0.95, 0.4);
        tube.castShadow = true;
        pack.add(tube);
        const mouth = new THREE.Mesh(new THREE.CylinderGeometry(0.43, 0.43, 0.14, 18), heatMat);
        mouth.rotation.x = Math.PI / 2;
        mouth.position.set(tube.position.x, tube.position.y, tube.position.z + 3.42);
        pack.add(mouth);
        const cover = new THREE.Mesh(new THREE.CircleGeometry(0.38, 18), new THREE.MeshStandardMaterial({ color: 0x3c4436, roughness: 0.85 }));
        cover.position.set(tube.position.x, tube.position.y, tube.position.z + 3.52);
        pack.add(cover);
        tubes.push({ cover, offset: new THREE.Vector3(tube.position.x, tube.position.y, tube.position.z + 3.3), used: false });
        labelPlate(pack, `H-${col}${row}`, 0.5, 0.16, tube.position.x, tube.position.y + 0.46, tube.position.z + 3.45, 0, { font: 'bold 30px Arial' });
      }
    }
    pack.position.set(0, 0.3, 1.2);

    const hyd = hydraulics(g, { pos: new THREE.Vector3(0.9, 1.35, -1.0), node: g }, { pos: new THREE.Vector3(0.9, 0.2, 1.9), node: pack });
    const hyd2 = hydraulics(g, { pos: new THREE.Vector3(-0.9, 1.35, -1.0), node: g }, { pos: new THREE.Vector3(-0.9, 0.2, 1.9), node: pack });

    cableRun(g, [[1.3, 1.3, -4.6], [1.9, 0.5, -5.0], [2.6, 0.12, -5.6]]);
    const light = statusLightMesh();
    light.position.set(-1.35, 2.0, -5.1);
    g.add(light);
    labelPlate(g, 'HALBERD HA-9', 1.9, 0.36, 0, 1.28, 5.9, 0, { bg: '#42452f' });
    labelPlate(cab, 'IV-DEF 09', 1.0, 0.3, 0, -0.5, 1.12, 0, {});

    ctx.world.colliders.push(makeColliderBox(pad.position.x, pad.position.z, 1.8, 5.4, pad.heading, 0, 3.4));

    return {
      group: g, turntable: null, elevGroup: pivot, tubes, statusLight: light,
      restElevation: 0.5, fireElevation: 1.18, elevAxis: 'x', elevSign: -1,
      hydUpdaters: [hyd, hyd2],
      muzzleForward: new THREE.Vector3(0, 0, 1),
    };
  }

  // =================================================== SENTINEL (fictional)
  function buildSentinel(pad) {
    const g = new THREE.Group();
    g.position.copy(pad.position);
    g.rotation.y = pad.heading;
    scene.add(g);

    // massive ring base + blast deflector
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(4.4, 4.8, 0.7, 24), M.concrete);
    ring.position.y = 0.35;
    ring.receiveShadow = true;
    g.add(ring);
    const deflector = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 2.6, 0.9, 16), heatMat);
    deflector.position.y = 0.8;
    g.add(deflector);

    // gantry tower (lattice-ish: 4 legs + cross bars)
    const tower = new THREE.Group();
    tower.position.set(-3.0, 0, 0);
    g.add(tower);
    for (const [x, z] of [[-0.6, -0.6], [0.6, -0.6], [-0.6, 0.6], [0.6, 0.6]]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.13, 13, 8), M.steel);
      leg.position.set(x, 6.5, z);
      leg.castShadow = true;
      tower.add(leg);
    }
    for (let i = 1; i <= 6; i++) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.08, 1.5), M.steel);
      bar.position.y = i * 2;
      tower.add(bar);
    }
    const platform = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.12, 2.0), M.metal);
    platform.position.set(0, 12.4, 0);
    tower.add(platform);
    const beaconT = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), M.redLight.clone());
    beaconT.position.set(0, 13.2, 0);
    tower.add(beaconT);

    // erecting rail + huge missile canister rail (single round on rail, 2 spares)
    const pivot = new THREE.Group();
    pivot.position.set(0.4, 1.15, 0);
    g.add(pivot);
    const rail = new THREE.Group();
    pivot.add(rail);
    const railBeam = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.55, 12.5), M.metal);
    railBeam.position.set(0, 0, 1.8);
    railBeam.castShadow = true;
    rail.add(railBeam);
    // support cradle arms
    for (const zz of [-2.2, 1.4, 4.6]) {
      const arm = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.16, 0.3), M.steel);
      arm.position.set(0, 0.42, zz);
      rail.add(arm);
    }
    const tubes = [{ cover: null, offset: new THREE.Vector3(0, 0.75, 4.0), used: false },
                   { cover: null, offset: new THREE.Vector3(0, 0.75, 4.0), used: false },
                   { cover: null, offset: new THREE.Vector3(0, 0.75, 4.0), used: false }];

    const hyd = hydraulics(g, { pos: new THREE.Vector3(1.4, 0.7, -1.6), node: g }, { pos: new THREE.Vector3(0.42, -0.1, 3.4), node: rail });
    const hyd2 = hydraulics(g, { pos: new THREE.Vector3(-1.0, 0.7, -1.6), node: g }, { pos: new THREE.Vector3(-0.42, -0.1, 3.4), node: rail });

    // spare canisters on cradles
    for (const [x, z, a] of [[4.4, -3.6, 0.5], [5.2, -1.2, 0.35]]) {
      const spare = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 10, 16), canisterMatTan);
      spare.rotation.z = Math.PI / 2;
      spare.rotation.y = a;
      spare.position.set(x, 0.8, z);
      spare.castShadow = true;
      g.add(spare);
      for (const s of [-3, 3]) {
        const cradle = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.55, 1.2), M.darkMetal);
        cradle.position.set(x + Math.cos(a) * s, 0.28, z - Math.sin(a) * s);
        cradle.rotation.y = a;
        g.add(cradle);
      }
      labelPlate(g, 'SNTL TEST ARTICLE', 2.4, 0.4, x, 1.0, z + 0.57, a, { font: 'bold 24px Arial' });
    }

    cableRun(g, [[-1.4, 0.9, 1.4], [-2.4, 0.4, 1.0], [-3.0, 0.15, 0.6]]);
    cableRun(g, [[0.8, 1.0, -1.2], [2.0, 0.35, -2.2], [3.4, 0.12, -3.0]]);

    const light = statusLightMesh();
    light.position.set(-2.6, 2.2, 1.4);
    g.add(light);
    labelPlate(g, 'SENTINEL LR-1', 2.4, 0.44, 0, 1.5, -4.4, Math.PI, { bg: '#5a4632' });
    labelPlate(g, 'DANGER — EXHAUST', 1.8, 0.3, 2.4, 0.62, 0.2, Math.PI / 2, { fg: '#ffd9b0', bg: '#7a2018' });

    ctx.world.colliders.push(makeColliderCyl(pad.position.x, pad.position.z, 5.0, 0, 2.2));
    ctx.world.colliders.push(makeColliderBox(
      pad.position.x + Math.cos(pad.heading) * -3.0, pad.position.z - Math.sin(pad.heading) * -3.0, 1.1, 1.1, pad.heading, 0, 13
    ));

    return {
      group: g, turntable: pivot, elevGroup: rail, tubes, statusLight: light,
      restElevation: 1.05, fireElevation: 1.45, elevAxis: 'x', elevSign: -1,
      hydUpdaters: [hyd, hyd2],
      muzzleForward: new THREE.Vector3(0, 0, 1),
      isSentinel: true,
    };
  }

  // =================================================== battery runtime
  const _q = new THREE.Quaternion();
  const _v = new THREE.Vector3();
  const _dir = new THREE.Vector3();

  class Battery {
    constructor(def, rig) {
      this.def = def;
      this.id = def.id;
      this.rig = rig;
      this.ammo = def.ammo;
      this.state = 'ready'; // ready | slewing | launching | reload | empty
      this.readyIn = 0;
      this.targetAz = null; // world azimuth to face
      this.currentElev = rig.restElevation;
      this.targetElev = rig.restElevation;
      this.launchTimer = -1;
      this.pendingTrack = null;
      this.tubeIndex = 0;
      this.applyElevation();
    }
    get displayState() {
      if (this.ammo <= 0 && this.state !== 'launching') return 'EMPTY';
      switch (this.state) {
        case 'ready': return 'READY';
        case 'slewing': return 'SLEWING';
        case 'launching': return 'LAUNCHING';
        case 'reload': return 'RELOADING';
        default: return this.state.toUpperCase();
      }
    }
    canAccept() { return this.ammo > 0 && (this.state === 'ready' || this.state === 'slewing'); }
    applyElevation() {
      const r = this.rig;
      r.elevGroup.rotation.x = -this.currentElev * (r.elevSign ?? 1) * (r.isSentinel || this.id === 'thaad' ? 1 : 0) - (this.id === 'patriot' ? this.currentElev : 0);
      // unified: rotate around x by -elev so +z tips upward
      r.elevGroup.rotation.x = -this.currentElev;
    }
    /** Point launcher toward a world position (azimuth only + set fire elevation). */
    pointAt(worldPos) {
      const gp = this.rig.group.position;
      this.targetAz = Math.atan2(worldPos.x - gp.x, worldPos.z - gp.z);
      this.targetElev = this.rig.fireElevation;
      if (this.state === 'ready') this.state = 'slewing';
    }
    relax() {
      this.targetAz = null;
      this.targetElev = this.rig.restElevation;
    }
    /** world-space muzzle position + direction */
    muzzle(outPos, outDir) {
      const r = this.rig;
      const tube = r.tubes[Math.min(this.tubeIndex, r.tubes.length - 1)];
      outPos.copy(tube.offset);
      r.elevGroup.localToWorld(outPos);
      outDir.set(0, 0, 1).applyQuaternion(r.elevGroup.getWorldQuaternion(_q));
      return outPos;
    }
    /** begin launch sequence; interceptor spawns after launchDelay */
    launch(track) {
      if (!this.canAccept()) return false;
      this.state = 'launching';
      this.launchTimer = this.def.launchDelay;
      this.pendingTrack = track;
      ctx.events.emit('battery-launching', { battery: this, track });
      return true;
    }
    update(dt) {
      const r = this.rig;
      // slew
      if (this.targetAz !== null) {
        const cur = r.group.rotation.y + (r.turntable ? r.turntable.rotation.y : 0);
        const desiredLocal = wrapAngle(this.targetAz - r.group.rotation.y);
        if (r.turntable) {
          r.turntable.rotation.y = stepAngle(r.turntable.rotation.y, desiredLocal, this.def.slewRate * dt);
        } else {
          r.group.rotation.y = stepAngle(r.group.rotation.y, this.targetAz, this.def.slewRate * dt * 0.55);
        }
        const err = Math.abs(wrapAngle(this.targetAz - (r.group.rotation.y + (r.turntable ? r.turntable.rotation.y : 0))));
        if (this.state === 'slewing' && err < 0.02 && Math.abs(this.currentElev - this.targetElev) < 0.02) {
          this.state = 'ready';
          ctx.events.emit('battery-laid', { battery: this });
        }
        void cur;
      }
      // elevation
      this.currentElev = damp(this.currentElev, this.targetElev, 2.2, dt);
      this.applyElevation();
      for (const u of r.hydUpdaters) u();

      // launch countdown
      if (this.state === 'launching') {
        this.launchTimer -= dt;
        if (this.launchTimer <= 0) {
          this.fire();
        }
      }
      // reload
      if (this.state === 'reload') {
        this.readyIn -= dt;
        if (this.readyIn <= 0) {
          this.state = this.ammo > 0 ? 'ready' : 'empty';
          if (this.ammo > 0) ctx.events.emit('battery-ready', { battery: this });
        }
      }
      // status light
      const mat = r.statusLight.material;
      if (this.ammo <= 0) { mat.emissive.setHex(0xff2222); mat.emissiveIntensity = 1.2; }
      else if (this.state === 'ready') { mat.emissive.setHex(0x22ff44); mat.emissiveIntensity = 2.4; }
      else if (this.state === 'launching') { mat.emissive.setHex(0xff8822); mat.emissiveIntensity = 2 + Math.sin(ctx.time.now * 20) * 1.6; }
      else { mat.emissive.setHex(0xffaa22); mat.emissiveIntensity = 1.8; }
    }
    fire() {
      const track = this.pendingTrack;
      this.pendingTrack = null;
      this.ammo -= 1;
      this.state = 'reload';
      this.readyIn = this.def.reloadTime;
      const tube = this.rig.tubes[Math.min(this.tubeIndex, this.rig.tubes.length - 1)];
      this.muzzle(_v, _dir);
      // pop the cover
      if (tube.cover) {
        tube.cover.visible = false;
        ctx.effects.coverPop(_v, _dir);
      }
      this.tubeIndex = (this.tubeIndex + 1) % this.rig.tubes.length;
      ctx.interceptors.launch(this, track, _v.clone(), _dir.clone());
      ctx.events.emit('interceptor-launched', { battery: this, track });
    }
    resetAmmo() {
      this.ammo = this.def.ammo;
      this.state = 'ready';
      this.readyIn = 0;
      this.tubeIndex = 0;
      this.pendingTrack = null;
      this.launchTimer = -1;
      for (const t of this.rig.tubes) { if (t.cover) t.cover.visible = true; t.used = false; }
    }
  }

  const rigs = {
    patriot: buildRampart(pads.patriot),
    thaad: buildHalberd(pads.thaad),
    sentinel: buildSentinel(pads.sentinel),
  };
  for (const id of ['patriot', 'thaad', 'sentinel']) {
    const b = new Battery(BATTERY_DEFS[id], rigs[id]);
    list.push(b);
    byId.set(id, b);
  }

  return {
    list,
    get(id) { return byId.get(id); },
    update(dt) { for (const b of list) b.update(dt); },
    resetAll() { for (const b of list) { b.resetAmmo(); b.relax(); } },
  };
}
