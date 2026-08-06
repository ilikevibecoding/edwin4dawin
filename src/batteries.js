// batteries.js — three fictionalized interceptor batteries: RAMPART (Patriot-
// inspired trailer), HALBERD (THAAD-inspired 10-wheel truck), SENTINEL
// (fictional fixed long-range launcher). All numbers are gameplay values, not
// real system characteristics. Static detail is merged per-material into few
// meshes to stay inside the draw-call budget.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { clamp, damp, stepAngle, wrapAngle, TAU, Rand } from './util.js';
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
    envelope: { minAlt: 1900, maxAlt: 12500, maxRange: 14000, sweetLow: 2400, sweetHigh: 9000 },
  },
};

export function createBatteries(ctx) {
  const { scene, textures, baseMaterials: M } = ctx;
  const pads = ctx.base.batteryPads;
  const list = [];
  const byId = new Map();
  const vr = new Rand(90210); // local, deterministic, visual-only randomness

  // ============================================ inline canvas textures
  function bCanvas(w, h) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    return [c, c.getContext('2d')];
  }
  function bTex(c) {
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 4;
    return t;
  }

  // cross-scored frangible membrane (tube end caps)
  const membraneTex = (() => {
    const [c, g] = bCanvas(128, 128);
    g.fillStyle = '#3a4034';
    g.fillRect(0, 0, 128, 128);
    const grad = g.createRadialGradient(64, 64, 8, 64, 64, 64);
    grad.addColorStop(0, 'rgba(255,255,255,0.12)');
    grad.addColorStop(0.72, 'rgba(0,0,0,0.06)');
    grad.addColorStop(1, 'rgba(0,0,0,0.42)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 128);
    g.strokeStyle = 'rgba(18,20,16,0.9)';
    g.lineWidth = 3;
    g.beginPath(); g.moveTo(16, 16); g.lineTo(112, 112); g.stroke();
    g.beginPath(); g.moveTo(112, 16); g.lineTo(16, 112); g.stroke();
    g.strokeStyle = 'rgba(150,154,140,0.55)';
    g.lineWidth = 1.2;
    g.beginPath(); g.moveTo(13, 19); g.lineTo(109, 115); g.stroke();
    g.beginPath(); g.moveTo(115, 13); g.lineTo(19, 109); g.stroke();
    g.beginPath(); g.arc(64, 64, 38, 0, 7); g.stroke();
    g.fillStyle = '#1d201b';
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * TAU;
      g.beginPath(); g.arc(64 + Math.cos(a) * 56, 64 + Math.sin(a) * 56, 2.6, 0, 7); g.fill();
    }
    for (let i = 0; i < 90; i++) {
      g.fillStyle = `rgba(16,18,14,${vr.range(0.05, 0.28)})`;
      g.fillRect(vr.next() * 128, vr.next() * 128, vr.range(1, 3), vr.range(1, 2));
    }
    return bTex(c);
  })();

  // truck grille louvers
  const grilleTex = (() => {
    const [c, g] = bCanvas(128, 64);
    g.fillStyle = '#0f1114';
    g.fillRect(0, 0, 128, 64);
    for (let y = 5; y < 60; y += 8) {
      g.fillStyle = '#3d4248';
      g.fillRect(4, y, 120, 3);
      g.fillStyle = '#181b1f';
      g.fillRect(4, y + 3, 120, 2);
    }
    g.strokeStyle = '#2c3036';
    g.lineWidth = 5;
    g.strokeRect(2, 2, 124, 60);
    return bTex(c);
  })();

  // red/white obstruction paint bands (tower legs)
  const bandTex = (() => {
    const [c, g] = bCanvas(32, 256);
    for (let i = 0; i < 8; i++) {
      g.fillStyle = i % 2 ? '#b7b8b2' : '#9c3227';
      g.fillRect(0, i * 32, 32, 32);
    }
    for (let i = 0; i < 120; i++) {
      g.fillStyle = `rgba(42,36,30,${vr.range(0.04, 0.2)})`;
      g.fillRect(vr.next() * 32, vr.next() * 256, vr.range(1, 2.5), vr.range(4, 24));
    }
    return bTex(c);
  })();

  // worn/darkened metal edge banding
  const wornTex = (() => {
    const [c, g] = bCanvas(256, 32);
    g.fillStyle = '#303338';
    g.fillRect(0, 0, 256, 32);
    for (let i = 0; i < 170; i++) {
      g.fillStyle = vr.next() < 0.55
        ? `rgba(126,130,134,${vr.range(0.08, 0.45)})`
        : `rgba(12,13,14,${vr.range(0.1, 0.4)})`;
      g.fillRect(vr.next() * 256, vr.next() * 32, vr.range(3, 26), vr.range(1, 3));
    }
    return bTex(c);
  })();

  // scorched blast-deflector steel
  const scorchSteelTex = (() => {
    const [c, g] = bCanvas(256, 256);
    g.fillStyle = '#71747a';
    g.fillRect(0, 0, 256, 256);
    const grad = g.createRadialGradient(128, 120, 8, 128, 120, 155);
    grad.addColorStop(0, 'rgba(14,11,9,0.95)');
    grad.addColorStop(0.42, 'rgba(36,27,20,0.82)');
    grad.addColorStop(0.72, 'rgba(74,54,36,0.45)');
    grad.addColorStop(1, 'rgba(92,82,72,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 80; i++) {
      const x = vr.next() * 256;
      g.fillStyle = `rgba(16,13,11,${vr.range(0.1, 0.5)})`;
      g.fillRect(x, vr.range(30, 130), vr.range(2, 6), vr.range(30, 120));
    }
    g.strokeStyle = 'rgba(70,92,150,0.16)';
    g.lineWidth = 16;
    g.beginPath(); g.arc(128, 120, 118, 0, 7); g.stroke();
    return bTex(c);
  })();

  // DANGER placard decal
  const dangerTex = (() => {
    const [c, g] = bCanvas(256, 96);
    g.fillStyle = '#d9d4c6';
    g.fillRect(0, 0, 256, 96);
    g.fillStyle = '#8e1d12';
    g.fillRect(6, 6, 244, 42);
    g.fillStyle = '#e6e1d3';
    g.font = 'bold 31px Arial';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('DANGER', 128, 28);
    g.fillStyle = '#24262a';
    g.font = 'bold 16px Arial';
    g.fillText('HOT EXHAUST — STAND CLEAR', 128, 68);
    g.strokeStyle = '#24262a';
    g.lineWidth = 4;
    g.strokeRect(2, 2, 252, 92);
    for (let i = 0; i < 80; i++) {
      g.fillStyle = 'rgba(120,110,90,0.25)';
      g.fillRect(vr.next() * 256, vr.next() * 96, vr.range(1, 4), vr.range(1, 2));
    }
    return bTex(c);
  })();

  // Rampart canister launch covers (oxide red, strapped, bolted)
  const rCoverTex = (() => {
    const [c, g] = bCanvas(96, 96);
    g.fillStyle = '#8f2f24';
    g.fillRect(0, 0, 96, 96);
    const grad = g.createRadialGradient(48, 48, 6, 48, 48, 48);
    grad.addColorStop(0, 'rgba(255,220,200,0.15)');
    grad.addColorStop(1, 'rgba(20,10,8,0.45)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 96, 96);
    g.strokeStyle = 'rgba(46,16,10,0.9)';
    g.lineWidth = 5;
    g.beginPath(); g.moveTo(48, 6); g.lineTo(48, 90); g.stroke();
    g.beginPath(); g.moveTo(6, 48); g.lineTo(90, 48); g.stroke();
    g.fillStyle = '#2b2320';
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TAU;
      g.beginPath(); g.arc(48 + Math.cos(a) * 40, 48 + Math.sin(a) * 40, 2.4, 0, 7); g.fill();
    }
    return bTex(c);
  })();

  // ============================================ shared materials
  const heatMat = new THREE.MeshStandardMaterial({ map: textures.heatBurn(), roughness: 0.6, metalness: 0.4 });
  const oliveTex = textures.oliveDrab().clone();
  oliveTex.repeat.set(2.6, 1.3);
  oliveTex.needsUpdate = true;
  const tanTex = textures.desertTan().clone();
  tanTex.repeat.set(2.2, 1.1);
  tanTex.needsUpdate = true;
  const canisterMat = new THREE.MeshStandardMaterial({ map: oliveTex, roughness: 0.75 });
  const canisterMatTan = new THREE.MeshStandardMaterial({ map: tanTex, roughness: 0.75 });
  const membraneMat = new THREE.MeshStandardMaterial({ map: membraneTex, roughness: 0.9 });
  const grilleMat = new THREE.MeshStandardMaterial({ map: grilleTex, roughness: 0.7, metalness: 0.3 });
  const bandMat = new THREE.MeshStandardMaterial({ map: bandTex, roughness: 0.72, metalness: 0.15 });
  const wornMat = new THREE.MeshStandardMaterial({ map: wornTex, roughness: 0.6, metalness: 0.55 });
  const scorchSteelMat = new THREE.MeshStandardMaterial({ map: scorchSteelTex, roughness: 0.66, metalness: 0.35 });
  const dangerMat = new THREE.MeshStandardMaterial({ map: dangerTex, roughness: 0.85 });
  const rCoverMat = new THREE.MeshStandardMaterial({ map: rCoverTex, roughness: 0.8 });
  const redPaint = new THREE.MeshStandardMaterial({ color: 0x93251b, roughness: 0.6, metalness: 0.2 });
  const lensMat = new THREE.MeshStandardMaterial({ color: 0xd9dee6, roughness: 0.16, metalness: 0.85 });
  const markerMat = new THREE.MeshStandardMaterial({ color: 0xc07a1e, roughness: 0.4 });
  const scorchDecalMat = new THREE.MeshStandardMaterial({
    map: textures.scorch(), transparent: true, depthWrite: false, roughness: 1,
    polygonOffset: true, polygonOffsetFactor: -2,
  });

  // ============================================ merge helpers
  const _pe = new THREE.Euler();
  const _pq2 = new THREE.Quaternion();
  const _pv = new THREE.Vector3();
  const _psc = new THREE.Vector3();
  const _pm = new THREE.Matrix4();

  /** collect geometries per material under `parent`, then flush to one mesh per material */
  function bucketFor(parent, { receive = false } = {}) {
    const byMat = new Map();
    return {
      add(mat, geo, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
        _pe.set(rx, ry, rz);
        _pq2.setFromEuler(_pe);
        _pm.compose(_pv.set(x, y, z), _pq2, _psc.set(1, 1, 1));
        geo.applyMatrix4(_pm);
        let arr = byMat.get(mat);
        if (!arr) { arr = []; byMat.set(mat, arr); }
        arr.push(geo);
        return geo;
      },
      flush({ shadow = true } = {}) {
        for (const [mat, geos] of byMat) {
          const mesh = new THREE.Mesh(mergeGeometries(geos, false), mat);
          for (const g2 of geos) g2.dispose();
          mesh.castShadow = shadow;
          mesh.receiveShadow = receive;
          parent.add(mesh);
        }
        byMat.clear();
      },
    };
  }

  const B = (w, h, d) => new THREE.BoxGeometry(w, h, d);
  const C = (rt, rb, h, seg = 10, open = false) => new THREE.CylinderGeometry(rt, rb, h, seg, 1, open);
  const CZ = (rt, rb, h, seg = 10) => new THREE.CylinderGeometry(rt, rb, h, seg).rotateX(Math.PI / 2);
  const TO = (r, t, arc = TAU, seg = 12) => new THREE.TorusGeometry(r, t, 6, seg, arc);
  const P = (w, h) => new THREE.PlaneGeometry(w, h);
  const SP = (r, ws = 10, hs = 7) => new THREE.SphereGeometry(r, ws, hs);

  function uvShift(geo, du, dv) {
    const uv = geo.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) + du, uv.getY(i) + dv);
    return geo;
  }

  // ============================================ shared small builders
  function statusLightMesh() {
    const m = new THREE.Mesh(
      new THREE.SphereGeometry(0.09, 10, 8),
      new THREE.MeshStandardMaterial({ color: 0x113311, emissive: 0x22ff44, emissiveIntensity: 2.2 })
    );
    return m;
  }

  /** amber launch beacon — emissive pulsed from Battery.update while launching */
  function beaconMesh() {
    return new THREE.Mesh(
      new THREE.CylinderGeometry(0.055, 0.08, 0.16, 10),
      new THREE.MeshStandardMaterial({ color: 0x3a2606, emissive: 0xffaa22, emissiveIntensity: 0, roughness: 0.45 })
    );
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

  function wheelsFor(bucket, positions, radius = 0.55, width = 0.42) {
    for (const [x, z] of positions) {
      bucket.add(M.rubber, C(radius, radius, width, 16), x, radius, z, 0, 0, Math.PI / 2);
      bucket.add(M.darkMetal, C(radius * 0.46, radius * 0.46, width + 0.05, 10), x, radius, z, 0, 0, Math.PI / 2);
      bucket.add(M.steel, C(radius * 0.16, radius * 0.16, width + 0.1, 8), x, radius, z, 0, 0, Math.PI / 2);
    }
  }

  function labelPlate(parent, text, w, h, x, y, z, ry = 0, opts = {}) {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshStandardMaterial({
        map: textures.label(text, { fg: opts.fg ?? '#dcd8ca', bg: opts.bg ?? null, w: 256, h: 64, font: opts.font ?? 'bold 30px Arial' }),
        transparent: true, roughness: 0.9,
      })
    );
    m.position.set(x, y, z);
    m.rotation.y = ry;
    if (opts.rx) m.rotation.x = opts.rx;
    parent.add(m);
    return m;
  }

  /** several labels atlased into ONE canvas + ONE merged mesh (1 draw call).
   *  items: [{ text, w, h, x, y, z, ry }] — same fg/bg/font per strip. */
  function labelStrip(parent, items, opts = {}) {
    const rng = new Rand(4177);
    const CW = 256, CH = 64, n = items.length;
    const [c, q] = bCanvas(CW, CH * n);
    q.clearRect(0, 0, CW, CH * n);
    items.forEach((it, i) => {
      const y0 = i * CH;
      if (opts.bg) { q.fillStyle = opts.bg; q.fillRect(0, y0, CW, CH); }
      q.font = opts.font ?? 'bold 30px Arial';
      q.textAlign = 'center'; q.textBaseline = 'middle';
      q.fillStyle = opts.fg ?? '#dcd8ca';
      q.fillText(it.text, CW / 2, y0 + CH / 2 + 2);
      for (let k = 0; k < 90; k++) q.clearRect(rng.next() * CW, y0 + rng.next() * CH, 2, 1.5);
    });
    const tex = bTex(c);
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
    const geos = items.map((it, i) => {
      const gp = new THREE.PlaneGeometry(it.w, it.h);
      const uv = gp.attributes.uv;
      for (let k = 0; k < uv.count; k++) uv.setY(k, (n - 1 - i + uv.getY(k)) / n);
      if (it.ry) gp.rotateY(it.ry);
      gp.translate(it.x, it.y, it.z);
      return gp;
    });
    const mesh = new THREE.Mesh(
      mergeGeometries(geos, false),
      new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 0.9 })
    );
    parent.add(mesh);
    return mesh;
  }

  /** catmull cable dropped into a bucket (merges into one mesh per rig) */
  function cableRun(bucket, points, r = 0.03) {
    const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
    bucket.add(M.cable, new THREE.TubeGeometry(curve, 16, r, 6));
  }
  /** drooping cable between two anchors */
  function droop(bucket, a, b, sag = 0.5, r = 0.035) {
    cableRun(bucket, [a, [(a[0] + b[0]) / 2, Math.min(a[1], b[1]) - sag, (a[2] + b[2]) / 2], b], r);
  }

  /** pad-local XZ -> world XZ (for colliders) */
  function padWorld(pad, x, z) {
    const c = Math.cos(pad.heading), s = Math.sin(pad.heading);
    return { x: pad.position.x + x * c + z * s, z: pad.position.z - x * s + z * c };
  }

  // =================================================== RAMPART (Patriot-like)
  function buildRampart(pad) {
    const g = new THREE.Group();
    g.position.copy(pad.position);
    g.rotation.y = pad.heading;
    scene.add(g);
    const S = bucketFor(g, { receive: true });   // static trailer, shadow-casting
    const D = bucketFor(g);                      // glass/decals, no shadow

    // ---- trailer frame: C-rails, cross members, deck ----
    for (const x of [-0.88, 0.88]) S.add(M.darkMetal, B(0.16, 0.34, 8.9), x, 0.92, 0);
    for (const z of [-4.2, -2.8, -1.4, 0, 1.4, 2.8, 4.2]) S.add(M.darkMetal, B(1.9, 0.18, 0.14), 0, 0.9, z);
    S.add(M.metal, uvShift(B(2.6, 0.09, 8.8), 0.13, 0.4), 0, 1.14, 0);
    for (const x of [-1.31, 1.31]) S.add(canisterMatTan, uvShift(B(0.07, 0.24, 8.8), x, 0.2), x, 1.05, 0);
    // lifting lugs at deck corners
    for (const [x, z] of [[-1.2, 4.3], [1.2, 4.3], [-1.2, -4.3], [1.2, -4.3]]) {
      S.add(M.darkMetal, B(0.06, 0.16, 0.12), x, 1.26, z);
      S.add(M.darkMetal, TO(0.055, 0.018, TAU, 10), x, 1.36, z, 0, Math.PI / 2, 0);
    }

    // ---- axles, wheels (mid-rear), fenders, mud flaps ----
    const wheelZ = [-0.9, -2.1];
    for (const z of wheelZ) S.add(M.darkMetal, C(0.075, 0.075, 2.4, 8), 0, 0.55, z, 0, 0, Math.PI / 2);
    wheelsFor(S, [[-1.38, -0.9], [1.38, -0.9], [-1.38, -2.1], [1.38, -2.1]], 0.55, 0.45);
    for (const sx of [-1, 1]) {
      S.add(canisterMatTan, uvShift(B(0.52, 0.06, 2.9), 0.4 * sx, 0.7), sx * 1.38, 1.26, -1.5);
      S.add(canisterMatTan, B(0.52, 0.06, 0.5), sx * 1.38, 1.12, 0.15, -0.75, 0, 0);
      S.add(canisterMatTan, B(0.52, 0.06, 0.5), sx * 1.38, 1.12, -3.15, 0.75, 0, 0);
      S.add(M.rubber, B(0.46, 0.4, 0.03), sx * 1.38, 0.58, -3.38);
    }

    // ---- outrigger jacks with X-pattern base plates ----
    for (const [x, z] of [[-1.5, 2.9], [1.5, 2.9], [-1.5, -3.7], [1.5, -3.7]]) {
      const sx = Math.sign(x);
      S.add(M.darkMetal, B(0.26, 0.22, 0.62), sx * 1.06, 0.9, z);           // sleeve on frame
      S.add(M.steel, B(0.15, 0.15, 0.95), sx * 1.55, 0.88, z);              // extended beam
      S.add(M.darkMetal, C(0.1, 0.1, 0.5, 10), sx * 1.95, 0.62, z);         // jack body
      S.add(M.steel, C(0.045, 0.045, 0.55, 8), sx * 1.95, 0.28, z);         // screw
      S.add(M.darkMetal, B(0.78, 0.06, 0.16), sx * 1.95, 0.07, z, 0, Math.PI / 4, 0);
      S.add(M.darkMetal, B(0.78, 0.06, 0.16), sx * 1.95, 0.07, z, 0, -Math.PI / 4, 0);
      S.add(M.darkMetal, B(0.4, 0.05, 0.4), sx * 1.95, 0.03, z);            // pad under the X
      S.add(M.steel, C(0.02, 0.02, 0.34, 6), sx * 1.95, 0.9, z + 0.2, Math.PI / 2, 0, 0); // crank
      S.add(M.steel, SP(0.035, 8, 6), sx * 1.95, 0.9, z + 0.38);
    }

    // ---- A-frame drawbar, hitch ring, parking jack, mirrors ----
    for (const sx of [-1, 1]) {
      S.add(M.darkMetal, B(0.13, 0.13, 2.35), sx * 0.36, 0.79, 5.35, 0.06, -sx * 0.335, 0);
    }
    S.add(M.steel, TO(0.13, 0.045, TAU, 12), 0, 0.7, 6.42, Math.PI / 2, 0, 0);
    S.add(M.steel, C(0.05, 0.05, 0.55, 8), 0, 0.42, 6.1);
    S.add(M.darkMetal, C(0.12, 0.14, 0.05, 10), 0, 0.14, 6.1);
    for (const sx of [-1, 1]) {
      S.add(M.steel, C(0.024, 0.024, 1.05, 8), sx * 0.5, 1.32, 4.6);
      S.add(M.darkMetal, B(0.22, 0.32, 0.03), sx * 0.5, 1.9, 4.63);
      D.add(M.glassDark, P(0.17, 0.27), sx * 0.5, 1.9, 4.655);
    }

    // ---- front-deck equipment: stowage, cable reel, spare tire, fire ext ----
    S.add(canisterMatTan, uvShift(B(0.85, 0.62, 1.45), 0.31, 0.5), -0.82, 1.5, 3.5);
    S.add(canisterMatTan, uvShift(B(0.85, 0.55, 1.05), 0.62, 0.15), -0.82, 1.46, 2.15);
    for (const z of [3.5, 2.15]) {
      S.add(M.darkMetal, B(0.06, 0.2, 0.05), -0.38, 1.45, z);
      S.add(M.darkMetal, B(0.87, 0.05, 0.06), -0.82, 1.76, z + 0.52);
    }
    // cable reel
    for (const x of [0.62, 1.02]) S.add(M.darkMetal, C(0.4, 0.4, 0.05, 14), x, 1.62, 4.0, 0, 0, Math.PI / 2);
    S.add(M.cable, C(0.26, 0.26, 0.36, 12), 0.82, 1.62, 4.0, 0, 0, Math.PI / 2);
    for (const sx of [0.62, 1.02]) S.add(M.darkMetal, B(0.06, 0.5, 0.3), sx, 1.35, 4.0);
    S.add(M.steel, C(0.02, 0.02, 0.22, 6), 1.1, 1.62, 4.14, Math.PI / 2, 0, 0);
    // spare tire flat on deck
    S.add(M.rubber, C(0.55, 0.55, 0.38, 16), 0.7, 1.4, 2.6);
    S.add(M.darkMetal, C(0.25, 0.25, 0.42, 10), 0.7, 1.4, 2.6);
    S.add(M.steel, C(0.05, 0.05, 0.5, 8), 0.7, 1.45, 2.6);
    // fire extinguisher box
    S.add(redPaint, B(0.32, 0.5, 0.4), 1.12, 1.44, 1.75);
    S.add(M.darkMetal, B(0.34, 0.05, 0.06), 1.12, 1.6, 1.96);
    labelPlate(g, 'FIRE', 0.26, 0.1, 1.29, 1.44, 1.75, Math.PI / 2, { fg: '#e8e2d2', font: 'bold 34px Arial' });

    // ---- antenna whip (front-left) ----
    S.add(M.darkMetal, C(0.05, 0.08, 0.16, 8), -1.18, 1.28, 4.25);
    S.add(M.steel, C(0.012, 0.02, 2.7, 6), -1.18, 2.7, 4.25, 0, 0, 0.05);
    S.add(M.steel, SP(0.028, 8, 6), -1.25, 4.04, 4.25);

    // ---- junction box + trailer power cabling ----
    S.add(M.darkMetal, B(0.55, 0.66, 0.26), 1.16, 1.56, 3.0);
    S.add(M.metal, B(0.34, 0.3, 0.03), 1.16, 1.62, 3.15);
    for (const dy of [-0.18, 0, 0.18]) S.add(M.cable, CZ(0.035, 0.035, 0.14, 8), 1.16 + dy, 1.32, 3.15);
    labelPlate(g, 'PWR', 0.3, 0.12, 1.16, 1.86, 3.14, 0, { font: 'bold 30px Arial' });

    // ---- status mast + launch beacon (front-left, clear of rack sweep) ----
    S.add(M.darkMetal, C(0.03, 0.03, 1.0, 8), -1.22, 1.7, 3.6);
    const light = statusLightMesh();
    light.position.set(-1.22, 2.28, 3.6);
    g.add(light);
    const beacon = beaconMesh();
    beacon.position.set(-1.22, 2.5, 3.6);
    g.add(beacon);

    // ---- side stencils ----
    labelStrip(g, [
      { text: 'RAMPART PX-4', w: 1.5, h: 0.3, x: -1.36, y: 1.42, z: 1.2, ry: -Math.PI / 2 },
      { text: 'RAMPART PX-4', w: 1.5, h: 0.3, x: 1.36, y: 1.42, z: 0.6, ry: Math.PI / 2 },
    ], { bg: '#42452f' });
    labelPlate(g, 'IV-DEF 04', 0.8, 0.2, -0.82, 1.5, 4.24, 0, {});

    // ---- turntable at trailer rear + trunnion towers ----
    S.add(M.darkMetal, C(1.0, 1.15, 0.3, 18), 0, 1.3, -2.9); // riser between deck and slew ring
    const turntable = new THREE.Group();
    turntable.position.set(0, 1.55, -2.9);
    g.add(turntable);
    const T = bucketFor(turntable);
    T.add(M.metal, C(1.12, 1.28, 0.34, 20), 0, 0, 0);
    T.add(M.darkMetal, C(1.31, 1.31, 0.1, 20), 0, -0.16, 0);
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * TAU;
      T.add(M.darkMetal, B(0.1, 0.12, 0.16), Math.cos(a) * 1.16, 0.02, Math.sin(a) * 1.16, 0, -a, 0);
    }
    // trunnion towers + bearing bosses (elevation axis of the rack)
    for (const sx of [-1, 1]) {
      T.add(M.darkMetal, B(0.3, 0.78, 0.6), sx * 1.38, 0.48, 0);
      T.add(M.steel, C(0.16, 0.16, 0.16, 12), sx * 1.52, 0.85, 0, 0, 0, Math.PI / 2);
      T.add(M.darkMetal, B(0.32, 0.2, 0.7), sx * 1.38, 0.12, 0);
    }
    // azimuth drive box
    T.add(M.darkMetal, B(0.5, 0.38, 0.55), 0.72, 0.28, 0.75);
    T.add(M.steel, C(0.07, 0.07, 0.2, 8), 0.72, 0.28, 1.08, Math.PI / 2, 0, 0);
    T.flush();

    const erector = new THREE.Group();
    erector.position.y = 0.3;
    turntable.add(erector);

    // ---- 2x2 canister rack ----
    const canGrp = new THREE.Group();
    erector.add(canGrp);
    canGrp.position.set(0, 0.55, 0);
    const R = bucketFor(canGrp);
    const tubes = [];
    const tubeLabels = [];
    for (let cx = 0; cx < 2; cx++) {
      for (let cy = 0; cy < 2; cy++) {
        const px = (cx - 0.5) * 1.18, py = cy * 1.18;
        const i = cx * 2 + cy;
        R.add(canisterMat, uvShift(B(1.02, 1.02, 5.4), i * 0.37 + 0.11, i * 0.29), px, py, 0);
        // rib bands
        for (const zz of [-2.1, -0.7, 0.7, 2.1]) R.add(M.darkMetal, B(1.1, 1.1, 0.09), px, py, zz);
        // heat-stained front face + rear closure
        R.add(heatMat, P(0.98, 0.98), px, py, 2.72);
        R.add(M.darkMetal, P(0.98, 0.98), px, py, -2.72, 0, Math.PI, 0);
        // rear exhaust venturis
        for (const s of [-0.26, 0.26]) R.add(heatMat, CZ(0.14, 0.2, 0.28, 12), px + s, py, -2.86);
        // covers (individual, popped on fire)
        for (const s of [-0.26, 0.26]) {
          const cover = new THREE.Mesh(new THREE.CircleGeometry(0.21, 18), rCoverMat);
          cover.position.set(px + s, py, 2.755);
          canGrp.add(cover);
          R.add(M.darkMetal, TO(0.225, 0.02, TAU, 18), px + s, py, 2.74);
          tubes.push({ cover, offset: new THREE.Vector3(px + s, py, 2.6), used: false });
        }
        tubeLabels.push({ text: `RMP-${cx}${cy}`, w: 0.72, h: 0.2, x: px, y: py + 0.32, z: 2.757 });
      }
    }
    labelStrip(canGrp, tubeLabels, { font: 'bold 26px Arial' });
    // X-brace stiffeners on outer side faces (signature look)
    for (const sx of [-1, 1]) {
      for (const py of [0, 1.18]) {
        for (const zc of [-1.4, 0, 1.4]) {
          R.add(wornMat, B(0.035, 0.06, 1.62), sx * 1.115, py, zc, 0.55, 0, 0);
          R.add(wornMat, B(0.035, 0.06, 1.62), sx * 1.115, py, zc, -0.55, 0, 0);
        }
      }
    }
    // top-face X braces
    for (const px of [-0.59, 0.59]) {
      for (const zc of [-1.4, 0, 1.4]) {
        R.add(wornMat, B(0.06, 0.035, 1.62), px, 1.695, zc, 0, 0.57, 0);
        R.add(wornMat, B(0.06, 0.035, 1.62), px, 1.695, zc, 0, -0.57, 0);
      }
    }
    // worn edge banding along outer long edges
    for (const [ex, ey] of [[-1.11, -0.51], [1.11, -0.51], [-1.11, 1.69], [1.11, 1.69]]) {
      R.add(wornMat, B(0.05, 0.05, 5.42), ex, ey, 0);
    }
    // rack frame
    R.add(M.metal, uvShift(B(2.5, 2.2, 0.16), 0.4, 0.1), 0, 0.7, -2.8);
    R.add(M.darkMetal, B(0.1, 2.42, 5.15), 0, 0.59, 0);
    R.add(M.darkMetal, B(2.42, 0.1, 5.15), 0, 0.59, 0);
    for (const s of [-1.26, 1.26]) R.add(M.darkMetal, B(0.09, 2.46, 5.3), s, 0.59, 0);
    // trunnion stubs mating with the towers
    for (const s of [-1.31, 1.31]) R.add(M.steel, C(0.13, 0.13, 0.12, 12), s, -0.55, 0, 0, 0, Math.PI / 2);
    // lifting lugs on top canisters
    for (const [px, zz] of [[-0.59, -1.7], [0.59, -1.7], [-0.59, 1.7], [0.59, 1.7]]) {
      R.add(M.darkMetal, B(0.05, 0.14, 0.1), px, 1.76, zz);
      R.add(M.darkMetal, TO(0.05, 0.016, TAU, 10), px, 1.84, zz, 0, Math.PI / 2, 0);
    }
    // umbilical conduit along right rail down to the turntable
    R.add(M.darkMetal, B(0.07, 0.12, 4.4), 1.33, 1.0, -0.3);
    R.add(M.darkMetal, B(0.18, 0.22, 0.3), 1.33, 0.9, -2.4);
    cableRun(R, [[1.33, 0.8, -2.4], [1.28, 0.2, -2.0], [1.05, -0.5, -1.1], [0.75, -0.72, -0.4]], 0.04);
    R.flush();
    // roundel decal on the left outer canister
    const roundel = new THREE.Mesh(
      new THREE.PlaneGeometry(0.62, 0.62),
      new THREE.MeshStandardMaterial({ map: textures.roundel(), transparent: true, roughness: 0.9 })
    );
    roundel.position.set(-1.125, 0.59, 1.9);
    roundel.rotation.y = -Math.PI / 2;
    canGrp.add(roundel);

    // hydraulic erector rams (prominent) + deck anchor lugs
    for (const sx of [-1, 1]) S.add(M.darkMetal, B(0.24, 0.16, 0.24), sx * 0.8, 1.2, 0.3);
    const hyd1 = hydraulics(g, { pos: new THREE.Vector3(0.8, 1.22, 0.3), node: g }, { pos: new THREE.Vector3(0.62, -0.45, 1.55), node: canGrp }, 0.09, 0.062);
    const hyd2 = hydraulics(g, { pos: new THREE.Vector3(-0.8, 1.22, 0.3), node: g }, { pos: new THREE.Vector3(-0.62, -0.45, 1.55), node: canGrp }, 0.09, 0.062);

    // umbilical from turntable base to trailer junction box + ground exit
    cableRun(S, [[0.55, 1.15, -2.6], [0.95, 1.25, -0.5], [1.16, 1.3, 2.85]], 0.04);
    droop(S, [1.16, 1.25, 3.15], [2.3, 0.06, 4.6], 0.55, 0.045);
    droop(S, [-0.4, 1.05, -2.95], [-2.2, 0.06, -4.6], 0.5, 0.04);

    S.flush();
    D.flush({ shadow: false });

    ctx.world.colliders.push(makeColliderBox(pad.position.x, pad.position.z, 2.0, 4.8, pad.heading, 0, 3));

    return {
      group: g, turntable, elevGroup: canGrp, tubes, statusLight: light, beacon,
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
    const S = bucketFor(g, { receive: true });
    const D = bucketFor(g); // glass + no-shadow decals

    // ---- chassis + frame ----
    S.add(canisterMatTan, uvShift(B(2.5, 0.6, 10.6), 0.07, 0.33), 0, 1.02, 0);
    for (const x of [-0.78, 0.78]) S.add(M.darkMetal, B(0.18, 0.4, 10.8), x, 0.6, 0);
    for (const z of [-4.6, -3.0, -1.4, 0.2, 1.8, 3.4]) S.add(M.darkMetal, B(1.6, 0.16, 0.14), 0, 0.55, z);
    S.add(M.metal, uvShift(B(2.5, 0.06, 6.6), 0.5, 0.24), 0, 1.36, -1.9);
    // tie-down cleats along deck edges
    for (const z of [-4.6, -2.6, -0.6]) {
      for (const sx of [-1, 1]) S.add(M.steel, TO(0.06, 0.02, Math.PI, 8), sx * 1.2, 1.4, z);
    }

    // ---- cab (cab-over) ----
    S.add(canisterMatTan, uvShift(B(2.6, 1.15, 2.4), 0.42, 0.13), 0, 1.78, 4.55);
    S.add(canisterMatTan, uvShift(B(2.5, 1.0, 2.05), 0.8, 0.55), 0, 2.85, 4.38);
    S.add(canisterMatTan, B(2.56, 0.09, 2.12), 0, 3.4, 4.38);
    // windshield + frame
    D.add(M.glassDark, P(2.14, 0.66), 0, 3.0, 5.425, -0.1, 0, 0);
    S.add(M.darkMetal, B(2.3, 0.07, 0.06), 0, 3.36, 5.4);
    S.add(M.darkMetal, B(2.3, 0.07, 0.06), 0, 2.64, 5.46);
    for (const x of [-1.1, 0, 1.1]) S.add(M.darkMetal, B(0.08, 0.76, 0.06), x, 3.0, 5.43, -0.1, 0, 0);
    // side windows + door seams + handles
    for (const sx of [-1, 1]) {
      D.add(M.glassDark, P(0.78, 0.55), sx * 1.262, 2.98, 4.6, 0, sx * Math.PI / 2, 0);
      S.add(M.darkMetal, B(0.02, 1.5, 0.05), sx * 1.26, 2.4, 5.25);
      S.add(M.darkMetal, B(0.02, 1.5, 0.05), sx * 1.26, 2.4, 3.95);
      S.add(M.steel, B(0.03, 0.05, 0.22), sx * 1.27, 2.42, 4.1);
    }
    // grille + headlights + brush guard + bumper
    S.add(grilleMat, B(1.8, 0.62, 0.08), 0, 1.98, 5.78);
    for (const x of [-1.02, -0.78, 0.78, 1.02]) S.add(lensMat, CZ(0.085, 0.085, 0.07, 12), x, 1.5, 5.79);
    for (const x of [-1.02, -0.78, 0.78, 1.02]) S.add(M.darkMetal, CZ(0.105, 0.105, 0.05, 12), x, 1.5, 5.77);
    S.add(M.darkMetal, B(2.85, 0.42, 0.35), 0, 0.94, 5.9);
    for (const x of [-0.85, 0, 0.85]) S.add(M.steel, C(0.028, 0.028, 1.5, 8), x, 1.7, 6.02);
    for (const y of [1.35, 2.05]) S.add(M.steel, C(0.024, 0.024, 2.2, 8), 0, y, 6.03, 0, 0, Math.PI / 2);
    labelPlate(g, 'HA-9 · IV-DEF', 0.9, 0.18, 0.7, 0.98, 6.09, 0, { fg: '#1c1d20', bg: '#c9c4b2', font: 'bold 26px Arial' });
    // roof: horns, marker lights, antenna
    for (const sx of [-1, 1]) S.add(M.steel, C(0.05, 0.085, 0.42, 10), sx * 0.42, 3.52, 4.9, -1.25, 0, 0);
    for (const x of [-0.9, -0.45, 0, 0.45, 0.9]) S.add(markerMat, B(0.09, 0.05, 0.05), x, 3.47, 5.42);
    S.add(M.steel, C(0.012, 0.018, 1.6, 6), -1.05, 4.2, 3.6, 0, 0, 0.06);
    // mirrors
    for (const sx of [-1, 1]) {
      S.add(M.steel, C(0.02, 0.02, 0.55, 8), sx * 1.42, 3.15, 5.3, 0, 0, sx * 1.2);
      S.add(M.darkMetal, B(0.24, 0.38, 0.04), sx * 1.66, 2.95, 5.32);
      D.add(M.glassDark, P(0.19, 0.32), sx * 1.66, 2.95, 5.345);
    }
    // exhaust stack + heat shield behind cab (right)
    S.add(M.steel, C(0.085, 0.085, 2.15, 10), 1.16, 2.65, 3.25);
    S.add(M.darkMetal, new THREE.CylinderGeometry(0.13, 0.13, 1.3, 10, 1, true, 0, Math.PI), 1.16, 2.4, 3.25);
    S.add(M.steel, C(0.08, 0.085, 0.3, 10), 1.16, 3.82, 3.2, 0.5, 0, 0);
    // fuel tanks + straps + top step plates
    for (const sx of [-1, 1]) {
      S.add(M.steel, CZ(0.34, 0.34, 1.7, 14), sx * 1.22, 0.8, 2.3);
      for (const z of [1.85, 2.75]) S.add(M.darkMetal, TO(0.36, 0.028, TAU, 14), sx * 1.22, 0.8, z);
      S.add(M.metal, B(0.55, 0.04, 1.6), sx * 1.22, 1.17, 2.3);
    }
    // cab steps + grab rails
    for (const sx of [-1, 1]) {
      S.add(M.darkMetal, B(0.5, 0.05, 0.55), sx * 1.32, 0.62, 4.9);
      S.add(M.darkMetal, B(0.5, 0.05, 0.55), sx * 1.32, 1.08, 4.9);
      S.add(M.steel, C(0.02, 0.02, 1.3, 8), sx * 1.31, 1.95, 5.52);
    }
    // front fenders + mud flaps
    for (const sx of [-1, 1]) {
      S.add(canisterMatTan, B(0.56, 0.06, 1.6), sx * 1.42, 1.42, 4.2);
      S.add(canisterMatTan, B(0.56, 0.06, 0.45), sx * 1.42, 1.3, 5.1, -0.6, 0, 0);
      S.add(M.rubber, B(0.5, 0.5, 0.035), sx * 1.42, 0.62, 3.35);
      S.add(M.rubber, B(0.5, 0.5, 0.035), sx * 1.42, 0.62, -5.12);
    }

    // ---- 10 wheels + axles ----
    const wz = [4.2, 1.6, -0.6, -2.6, -4.4];
    for (const z of wz) S.add(M.darkMetal, C(0.08, 0.08, 2.4, 8), 0, 0.62, z, 0, 0, Math.PI / 2);
    wheelsFor(S, wz.flatMap((z) => [[-1.42, z], [1.42, z]]), 0.62, 0.5);

    // ---- rear stabilizer legs ----
    for (const sx of [-1, 1]) {
      S.add(M.darkMetal, B(0.32, 0.3, 0.5), sx * 1.25, 1.0, -4.95);
      S.add(M.steel, C(0.11, 0.11, 1.1, 10), sx * 1.6, 0.62, -4.95);
      S.add(M.darkMetal, B(0.6, 0.1, 0.6), sx * 1.6, 0.07, -4.95);
      S.add(M.darkMetal, B(0.55, 0.12, 0.14), sx * 1.42, 1.05, -4.95, 0, 0, sx * 0.45);
    }

    // ---- trunnion pedestals for the pack pivot ----
    for (const sx of [-1, 1]) {
      S.add(M.darkMetal, B(0.42, 0.62, 0.55), sx * 0.95, 1.55, -3.4);
      S.add(M.steel, C(0.17, 0.17, 0.2, 12), sx * 1.21, 1.55, -3.4, 0, 0, Math.PI / 2);
    }
    // spare wheel against the cab rear + tool boxes + air reservoirs
    S.add(M.rubber, CZ(0.6, 0.6, 0.35, 16), -0.55, 2.0, 3.28);
    S.add(M.darkMetal, CZ(0.26, 0.26, 0.4, 10), -0.55, 2.0, 3.28);
    S.add(canisterMatTan, uvShift(B(0.7, 0.52, 0.8), 0.55, 0.8), 1.18, 1.06, 0.5);
    S.add(canisterMatTan, uvShift(B(0.7, 0.5, 0.85), 0.15, 0.42), -1.18, 1.04, -1.6);
    for (const sy of [-0.1, 0.14]) S.add(M.steel, C(0.11, 0.11, 0.9, 10), 0.2, 0.62 + sy, -3.9, 0, 0, Math.PI / 2);
    // transport bolster the pack rests on
    S.add(M.darkMetal, B(2.2, 0.24, 0.4), 0, 1.5, 0.9);
    S.add(M.rubber, B(2.1, 0.06, 0.34), 0, 1.65, 0.9);

    // ---- elevating tube pack: 6 tubes (2 cols x 3 rows) ----
    const pivot = new THREE.Group();
    pivot.position.set(0, 1.55, -3.4);
    g.add(pivot);
    const PV = bucketFor(pivot);
    for (const sx of [-1, 1]) PV.add(M.darkMetal, C(0.14, 0.14, 0.24, 12), sx * 1.12, 0, 0, 0, 0, Math.PI / 2);
    PV.flush();
    const pack = new THREE.Group();
    pivot.add(pack);
    pack.position.set(0, 0.3, 1.2);
    const K = bucketFor(pack);
    const tubes = [];
    const tubeLabels = [];
    for (let col = 0; col < 2; col++) {
      for (let row = 0; row < 3; row++) {
        const tx = (col - 0.5) * 1.05, ty = 0.35 + row * 0.95;
        const i = col * 3 + row;
        K.add(canisterMat, uvShift(CZ(0.42, 0.42, 6.8, 18), i * 0.29 + 0.07, i * 0.17), tx, ty, 0.4);
        K.add(heatMat, CZ(0.45, 0.45, 0.18, 18), tx, ty, 3.72);          // heat collar at mouth
        K.add(M.darkMetal, CZ(0.44, 0.44, 0.1, 18), tx, ty, -2.98);      // rear cap ring
        K.add(membraneMat, new THREE.CircleGeometry(0.36, 16).rotateY(Math.PI), tx, ty, -3.04); // rear blow-out membrane
        const cover = new THREE.Mesh(new THREE.CircleGeometry(0.385, 20), membraneMat);
        cover.position.set(tx, ty, 3.83);
        pack.add(cover);
        // offsets in pivot space so effects align with the visual mouth
        tubes.push({ cover, offset: new THREE.Vector3(tx, ty + 0.3, 1.2 + 3.7), used: false });
        K.add(M.darkMetal, B(0.4, 0.18, 0.05), tx, ty + 0.48, 3.78);
        tubeLabels.push({ text: `H-${i + 1}`, w: 0.32, h: 0.13, x: tx, y: ty + 0.48, z: 3.815 });
      }
    }
    labelStrip(pack, tubeLabels, { font: 'bold 34px Arial' });
    // pack side plates (bottom two rows) + ribs + conduit; top tube row stays exposed
    for (const sx of [-1, 1]) {
      K.add(M.metal, uvShift(B(0.06, 2.1, 6.3), sx * 0.3, 0.6), sx * 1.05, 0.85, 0.3);
      for (const z of [-2.4, -1.2, 0, 1.2, 2.4]) K.add(M.darkMetal, B(0.05, 2.0, 0.12), sx * 1.09, 0.85, z);
      K.add(wornMat, B(0.07, 0.09, 6.3), sx * 1.05, 1.94, 0.3);
      K.add(wornMat, B(0.07, 0.09, 6.3), sx * 1.05, -0.22, 0.3);
    }
    K.add(M.darkMetal, B(0.06, 0.12, 5.2), 1.11, 1.55, 0.0);
    // base plate + front/rear frames
    K.add(M.darkMetal, B(2.16, 0.14, 6.4), 0, -0.28, 0.3);
    for (const zf of [3.1, -2.7]) {
      K.add(M.darkMetal, B(2.24, 0.16, 0.2), 0, -0.14, zf);
      K.add(M.darkMetal, B(2.24, 0.16, 0.2), 0, 2.78, zf);
      for (const sx of [-1, 1]) K.add(M.darkMetal, B(0.16, 3.1, 0.2), sx * 1.06, 1.3, zf);
    }
    // top guard rails
    for (const sx of [-1, 1]) {
      K.add(M.steel, CZ(0.028, 0.028, 6.2, 8), sx * 0.5, 3.0, 0.3);
      for (const z of [-2.4, 0.3, 2.9]) K.add(M.steel, B(0.05, 0.24, 0.05), sx * 0.5, 2.88, z);
    }
    // rear bulkhead greebles: access panels, valve wheels, cable elbows
    for (const [px, py] of [[-0.5, 0.6], [0.5, 0.6], [-0.5, 1.85], [0.5, 1.85]]) {
      K.add(M.metal, B(0.44, 0.44, 0.06), px, py, -3.12);
    }
    for (const [px, py] of [[-0.2, 1.25], [0.25, 1.3]]) K.add(M.steel, TO(0.07, 0.02, TAU, 10), px, py, -3.16);
    for (const [px, py] of [[-0.85, 0.3], [0.88, 2.3]]) K.add(M.cable, TO(0.1, 0.03, Math.PI / 2, 8), px, py, -3.14);
    K.flush();
    labelStrip(pack, [
      { text: 'HALBERD HA-9', w: 1.7, h: 0.3, x: -1.09, y: 1.35, z: 0.3, ry: -Math.PI / 2 },
      { text: 'HALBERD HA-9', w: 1.7, h: 0.3, x: 1.12, y: 1.35, z: 0.3, ry: Math.PI / 2 },
    ], { bg: '#42452f' });

    // prominent elevation piston pair + chassis anchor lugs
    for (const sx of [-1, 1]) S.add(M.darkMetal, B(0.26, 0.2, 0.26), sx * 0.92, 1.32, -1.0);
    const hyd = hydraulics(g, { pos: new THREE.Vector3(0.92, 1.35, -1.0), node: g }, { pos: new THREE.Vector3(0.92, 0.1, 1.8), node: pack }, 0.115, 0.08);
    const hyd2 = hydraulics(g, { pos: new THREE.Vector3(-0.92, 1.35, -1.0), node: g }, { pos: new THREE.Vector3(-0.92, 0.1, 1.8), node: pack }, 0.115, 0.08);

    // ---- interconnect cable bundle to a ground junction box ----
    S.add(M.darkMetal, B(0.72, 0.52, 0.38), 2.5, 0.26, -5.2);
    S.add(M.metal, B(0.5, 0.28, 0.04), 2.5, 0.3, -4.99);
    droop(S, [0.4, 1.1, -4.9], [2.35, 0.52, -5.15], 0.35, 0.04);
    droop(S, [0.1, 1.05, -4.95], [2.42, 0.5, -5.3], 0.5, 0.035);
    droop(S, [-0.2, 1.0, -4.85], [2.3, 0.48, -5.0], 0.65, 0.03);
    droop(S, [2.62, 0.4, -5.2], [3.8, 0.05, -5.9], 0.3, 0.05);

    // ---- status light + beacon on rear-left mast ----
    S.add(M.darkMetal, C(0.028, 0.028, 1.0, 8), -1.35, 1.9, -5.05);
    const light = statusLightMesh();
    light.position.set(-1.35, 2.45, -5.05);
    g.add(light);
    const beacon = beaconMesh();
    beacon.position.set(-1.35, 2.66, -5.05);
    g.add(beacon);

    labelPlate(g, 'HALBERD HA-9', 1.9, 0.36, 0, 1.6, 5.93, 0, { bg: '#42452f' });
    const roundel = new THREE.Mesh(
      new THREE.PlaneGeometry(0.5, 0.5),
      new THREE.MeshStandardMaterial({ map: textures.roundel(), transparent: true, roughness: 0.9 })
    );
    roundel.position.set(-1.267, 2.35, 4.62);
    roundel.rotation.y = -Math.PI / 2;
    g.add(roundel);

    S.flush();
    D.flush({ shadow: false });

    ctx.world.colliders.push(makeColliderBox(pad.position.x, pad.position.z, 1.9, 5.8, pad.heading, 0, 3.4));
    const jb = padWorld(pad, 2.5, -5.2);
    ctx.world.colliders.push(makeColliderCyl(jb.x, jb.z, 0.6, 0, 0.6));

    return {
      group: g, turntable: null, elevGroup: pivot, tubes, statusLight: light, beacon,
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
    const S = bucketFor(g, { receive: true });
    const D = bucketFor(g); // decals, no shadow

    // ---- ring base + hazard edge band ----
    S.add(M.concrete, C(4.4, 4.8, 0.7, 28), 0, 0.35, 0);
    S.add(M.hazard, new THREE.CylinderGeometry(4.45, 4.45, 0.14, 28, 1, true), 0, 0.66, 0);

    // ---- pedestal under the pivot ----
    S.add(M.darkMetal, C(0.95, 1.25, 1.15, 16), 0.4, 0.575, 0);
    S.add(M.metal, C(1.12, 1.12, 0.09, 16), 0.4, 1.1, 0);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU;
      S.add(M.steel, C(0.05, 0.05, 0.1, 6), 0.4 + Math.cos(a) * 1.0, 1.16, Math.sin(a) * 1.0);
    }

    // ---- blast deflector wedge + scorch ----
    S.add(scorchSteelMat, B(2.6, 0.18, 2.5), 0.4, 0.9, -2.1, 0.62, 0, 0);
    for (const sx of [-1, 1]) S.add(scorchSteelMat, B(0.14, 1.0, 2.2), 0.4 + sx * 1.32, 0.85, -2.1, 0.45, 0, 0);
    for (const sx of [-0.7, 0.7]) S.add(M.darkMetal, B(0.16, 0.7, 0.16), 0.4 + sx, 0.55, -1.6);
    D.add(scorchDecalMat, P(4.2, 4.2).rotateX(-Math.PI / 2), 0.4, 0.715, -2.4);

    // ---- gantry tower ----
    const tower = new THREE.Group();
    tower.position.set(-3.0, 0, 0);
    g.add(tower);
    const TW = bucketFor(tower);
    for (const [x, z] of [[-0.6, -0.6], [0.6, -0.6], [-0.6, 0.6], [0.6, 0.6]]) {
      TW.add(bandMat, C(0.09, 0.13, 13, 10), x, 6.5, z);
      TW.add(M.darkMetal, B(0.5, 0.08, 0.5), x, 0.04, z);
    }
    // perimeter beams + X diagonals per level
    for (let i = 1; i <= 6; i++) {
      const y = i * 2;
      for (const s of [-0.6, 0.6]) {
        TW.add(M.steel, B(1.32, 0.08, 0.08), 0, y, s);
        TW.add(M.steel, B(0.08, 0.08, 1.32), s, y, 0);
      }
      for (const s of [-0.6, 0.6]) {
        TW.add(M.steel, C(0.024, 0.024, 2.2, 6), 0, y - 1, s, 0, 0, 0.55);
        TW.add(M.steel, C(0.024, 0.024, 2.2, 6), 0, y - 1, s, 0, 0, -0.55);
        TW.add(M.steel, C(0.024, 0.024, 2.2, 6), s, y - 1, 0, 0.55, 0, 0);
        TW.add(M.steel, C(0.024, 0.024, 2.2, 6), s, y - 1, 0, -0.55, 0, 0);
      }
    }
    // work platforms with railings (two levels + top); the mid platform keeps a
    // gap on the +x face where the umbilical boom is mounted
    for (const py of [4.4, 8.8, 12.4]) {
      const gapX = py === 4.4;
      TW.add(M.metal, uvShift(B(2.6, 0.1, 2.2), py * 0.13, 0.3), 0, py, 0);
      TW.add(M.darkMetal, B(2.6, 0.12, 0.03), 0, py - 0.02, 1.11);
      TW.add(M.darkMetal, B(2.6, 0.12, 0.03), 0, py - 0.02, -1.11);
      TW.add(M.darkMetal, B(0.03, 0.12, 2.2), 1.29, py - 0.02, 0);
      TW.add(M.darkMetal, B(0.03, 0.12, 2.2), -1.29, py - 0.02, 0);
      for (const [px, pz] of [[-1.25, -1.05], [0, -1.05], [1.25, -1.05], [-1.25, 1.05], [0, 1.05], [1.25, 1.05], [-1.25, 0], [1.25, 0]]) {
        if (gapX && px === 1.25 && pz === 0) continue;
        TW.add(M.steel, B(0.045, 1.0, 0.045), px, py + 0.55, pz);
      }
      for (const s of [-1.05, 1.05]) {
        TW.add(M.steel, B(2.55, 0.045, 0.045), 0, py + 1.05, s);
        TW.add(M.steel, B(2.55, 0.045, 0.045), 0, py + 0.6, s);
      }
      for (const s of [-1.25, 1.25]) {
        if (gapX && s > 0) continue;
        TW.add(M.steel, B(0.045, 0.045, 2.15), s, py + 1.05, 0);
        TW.add(M.steel, B(0.045, 0.045, 2.15), s, py + 0.6, 0);
      }
    }
    // umbilical boom bracket cantilevered off the mid platform edge
    TW.add(M.darkMetal, B(0.55, 0.12, 0.26), 1.32, 4.42, 0);
    TW.add(M.steel, C(0.05, 0.05, 0.5, 8), 1.45, 4.62, 0);
    TW.add(M.steel, B(0.08, 0.1, 0.5), 1.28, 4.3, 0, 0, 0, 0.7);
    // service ladder up the -x face with safety cage
    for (const s of [-0.22, 0.22]) TW.add(M.steel, B(0.05, 12.6, 0.05), -0.85, 6.3, s);
    for (let y = 0.5; y < 12.5; y += 0.38) TW.add(M.steel, B(0.04, 0.04, 0.42), -0.85, y, 0);
    for (let y = 2.6; y < 12.2; y += 1.2) {
      TW.add(M.steel, TO(0.38, 0.02, Math.PI * 1.2, 12), -0.85, y, 0, Math.PI / 2, 0, Math.PI * 0.4);
    }
    // cable tray up a rear leg + cables
    TW.add(M.darkMetal, B(0.3, 12.4, 0.05), 0.62, 6.2, 0.78);
    for (const s of [-0.14, 0.14]) TW.add(M.darkMetal, B(0.04, 12.4, 0.12), 0.62 + s, 6.2, 0.72);
    for (const s of [-0.08, 0, 0.08]) TW.add(M.cable, C(0.022, 0.022, 12.3, 6), 0.62 + s, 6.2, 0.76);
    TW.add(M.darkMetal, B(0.4, 0.5, 0.22), 0.62, 12.7, 0.7);
    // top mast
    TW.add(M.steel, C(0.03, 0.045, 1.5, 8), 0, 13.65, 0);
    TW.flush();
    // warning strobes: one merged mesh, blinking material
    const strobeMat = new THREE.MeshStandardMaterial({ color: 0x330000, emissive: 0xff2a1a, emissiveIntensity: 0.15, roughness: 0.4 });
    {
      const sb = bucketFor(tower);
      sb.add(strobeMat, SP(0.1, 10, 7), 0, 14.45, 0);
      sb.add(strobeMat, SP(0.075, 8, 6), -1.25, 13.1, -1.0);
      sb.add(strobeMat, SP(0.075, 8, 6), 1.25, 13.1, 1.0);
      sb.flush({ shadow: false });
    }
    for (const [px, pz] of [[-1.25, -1.0], [1.25, 1.0]]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.5, 6), M.steel);
      post.position.set(px, 12.78, pz);
      tower.add(post);
    }

    // ---- erecting rail on pivot pedestal ----
    const pivot = new THREE.Group();
    pivot.position.set(0.4, 1.15, 0);
    g.add(pivot);
    const PV = bucketFor(pivot);
    PV.add(M.metal, C(1.02, 1.02, 0.14, 18), 0, -0.02, 0);
    for (const sx of [-1, 1]) {
      PV.add(M.darkMetal, B(0.24, 0.5, 0.7), sx * 0.55, 0.1, 0);
      PV.add(M.steel, C(0.14, 0.14, 0.18, 12), sx * 0.69, 0.28, 0, 0, 0, Math.PI / 2);
    }
    PV.flush();

    const rail = new THREE.Group();
    pivot.add(rail);
    const R = bucketFor(rail);
    R.add(M.metal, uvShift(B(0.7, 0.5, 12.6), 0.21, 0.65), 0, 0, 1.8);
    for (const sx of [-1, 1]) R.add(M.darkMetal, B(0.09, 0.62, 12.6), sx * 0.39, 0, 1.8);
    for (let z = -3.6; z <= 7.6; z += 1.6) R.add(M.darkMetal, B(0.88, 0.1, 0.14), 0, -0.31, z);
    // underside X-bracing + conduit + winch cable (this face reads from the base side)
    for (let z = -2.8; z <= 6.8; z += 1.6) {
      R.add(M.steel, B(0.05, 0.04, 1.78), 0, -0.34, z, 0, 0.5, 0);
      R.add(M.steel, B(0.05, 0.04, 1.78), 0, -0.34, z, 0, -0.5, 0);
    }
    R.add(M.darkMetal, B(0.06, 0.08, 11.6), 0.3, -0.33, 2.0);
    R.add(M.cable, CZ(0.02, 0.02, 10.8, 6), -0.22, -0.32, 2.4);
    R.add(M.hazard, B(0.74, 0.55, 0.22), 0, 0, -0.6);
    R.add(redPaint, B(0.73, 0.53, 0.18), 0, 0, 7.85);
    // head sheave + fork at rail tip
    R.add(M.darkMetal, C(0.2, 0.2, 0.1, 14), 0, 0.06, 8.0, 0, 0, Math.PI / 2);
    for (const sx of [-1, 1]) R.add(M.steel, B(0.05, 0.44, 0.5), sx * 0.1, 0.1, 7.95);
    // trolley carriage under the round
    R.add(M.darkMetal, B(0.95, 0.26, 1.5), 0, 0.4, 0.6);
    for (const [sx, zz] of [[-0.44, 0.15], [0.44, 0.15], [-0.44, 1.05], [0.44, 1.05]]) {
      R.add(M.steel, C(0.1, 0.1, 0.09, 10), sx, 0.14, zz, 0, 0, Math.PI / 2);
    }
    // released hold-down clamp arms + cradle saddles
    for (const zz of [0.0, 1.2]) {
      for (const sx of [-1, 1]) R.add(M.steel, B(0.08, 0.5, 0.12), sx * 0.52, 0.68, zz, 0, 0, sx * 2.2);
    }
    for (const zz of [-1.6, 2.6]) {
      R.add(M.darkMetal, TO(0.5, 0.05, Math.PI, 14), 0, 0.75, zz, 0, 0, Math.PI);
      R.add(M.darkMetal, B(0.9, 0.22, 0.2), 0, 0.3, zz);
    }
    // winch drum + guard at rail rear
    R.add(M.darkMetal, C(0.16, 0.16, 0.5, 12), 0, 0.12, -2.9, 0, 0, Math.PI / 2);
    R.add(M.steel, B(0.7, 0.08, 0.5), 0, 0.34, -2.9);
    R.flush();
    const tubes = [{ cover: null, offset: new THREE.Vector3(0, 0.75, 4.0), used: false },
                   { cover: null, offset: new THREE.Vector3(0, 0.75, 4.0), used: false },
                   { cover: null, offset: new THREE.Vector3(0, 0.75, 4.0), used: false }];

    // ---- visible loaded round (hidden while a shot reloads) ----
    const roundMesh = new THREE.Group();
    {
      const RB = bucketFor(roundMesh);
      const bodyMat = new THREE.MeshStandardMaterial({ color: 0xe3e0d5, roughness: 0.42, metalness: 0.15 });
      const noseMat = new THREE.MeshStandardMaterial({ color: 0x2f3338, roughness: 0.3, metalness: 0.5 });
      const finMat = new THREE.MeshStandardMaterial({ color: 0x9aa0a6, roughness: 0.5, metalness: 0.4 });
      const bandMt = new THREE.MeshStandardMaterial({ color: 0xb3402e, roughness: 0.6 });
      RB.add(bodyMat, CZ(0.42, 0.42, 7.6, 18), 0, 0, 0);
      RB.add(noseMat, new THREE.ConeGeometry(0.42, 1.9, 18).rotateX(Math.PI / 2), 0, 0, 4.75);
      RB.add(heatMat, CZ(0.3, 0.38, 0.5, 14), 0, 0, -4.0);
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * TAU + Math.PI / 4;
        RB.add(finMat, B(0.05, 0.55, 1.2), Math.cos(a) * 0.55, Math.sin(a) * 0.55, -3.4, 0, 0, a);
      }
      for (const zz of [2.4, -1.6]) RB.add(bandMt, CZ(0.428, 0.428, 0.16, 18), 0, 0, zz);
      // umbilical service port on the +x side
      RB.add(noseMat, B(0.1, 0.22, 0.34), 0.4, 0.12, 1.6);
      RB.flush();
      labelPlate(roundMesh, 'LR-1 T3', 0.9, 0.22, 0.435, 0, 0.2, Math.PI / 2, { fg: '#6a655a', font: 'bold 26px Arial' });
      roundMesh.position.set(0, 0.75, 0.6);
      roundMesh.traverse((o) => { o.castShadow = true; });
      rail.add(roundMesh);
    }

    for (const ax of [1.4, -1.0]) S.add(M.darkMetal, B(0.26, 0.22, 0.26), ax, 0.78, -1.6);
    const hyd = hydraulics(g, { pos: new THREE.Vector3(1.4, 0.86, -1.6), node: g }, { pos: new THREE.Vector3(0.42, -0.1, 3.4), node: rail }, 0.1, 0.07);
    const hyd2 = hydraulics(g, { pos: new THREE.Vector3(-1.0, 0.86, -1.6), node: g }, { pos: new THREE.Vector3(-0.42, -0.1, 3.4), node: rail }, 0.1, 0.07);

    // ---- umbilical service arm (swings clear during launch) ----
    const armGroup = new THREE.Group();
    armGroup.position.set(-1.55, 4.85, 0);
    g.add(armGroup);
    const armYawExtended = -Math.atan2(1.26, 1.95);
    armGroup.rotation.y = armYawExtended;
    {
      const AB = bucketFor(armGroup);
      AB.add(M.steel, B(1.85, 0.16, 0.2), 0.92, 0, 0);
      AB.add(M.steel, B(0.09, 0.13, 0.85), 0.7, -0.26, 0, 0.85, 0, 0); // kick brace
      AB.add(M.darkMetal, B(0.28, 0.42, 0.3), 1.86, -0.06, 0);
      for (const dy of [-0.16, 0.04]) AB.add(M.cable, C(0.03, 0.03, 0.16, 8), 2.04, dy, 0, 0, 0, Math.PI / 2);
      AB.flush();
      const AC = bucketFor(armGroup);
      cableRun(AC, [[1.95, -0.25, 0.04], [2.2, -0.75, 0.18], [2.35, -0.4, 0.42], [2.3, -0.25, 0.6]], 0.04);
      cableRun(AC, [[0.06, -0.06, 0.06], [0.7, -0.22, 0.1], [1.35, -0.16, 0.06], [1.8, -0.12, 0]], 0.028);
      AC.flush({ shadow: false });
    }

    // ---- spare rounds in transport canisters on cradles ----
    const spareLabels = [];
    for (const [x, z, a] of [[4.4, -3.6, 0.5], [5.2, -1.2, 0.35]]) {
      const dirx = Math.cos(a), dirz = -Math.sin(a);
      S.add(canisterMatTan, uvShift(C(0.55, 0.55, 9.6, 16), x * 0.2, z * 0.2), x, 0.88, z, 0, a, Math.PI / 2);
      for (const s of [-4.9, 4.9]) {
        S.add(canisterMatTan, C(0.55, 0.42, 0.35, 16), x + dirx * s, 0.88, z + dirz * s, 0, a, Math.PI / 2 * Math.sign(s));
      }
      for (const s of [-3.1, 0, 3.1]) S.add(M.darkMetal, TO(0.57, 0.03, TAU, 16), x + dirx * s, 0.88, z + dirz * s, 0, a + Math.PI / 2, 0);
      for (const s of [-3, 3]) {
        for (const ss of [-1, 1]) {
          S.add(M.darkMetal, B(0.12, 1.0, 0.16), x + dirx * s + ss * 0.45 * -dirz, 0.42, z + dirz * s + ss * 0.45 * dirx, 0, a, ss * 0.42);
        }
        S.add(M.darkMetal, B(0.16, 0.14, 1.15), x + dirx * s, 0.14, z + dirz * s, 0, a + Math.PI / 2, 0);
        S.add(M.steel, TO(0.58, 0.025, Math.PI, 12), x + dirx * s, 0.88, z + dirz * s, 0, a + Math.PI / 2, Math.PI);
      }
      spareLabels.push({ text: 'SNTL TEST ARTICLE', w: 2.4, h: 0.4, x: x - dirz * 0.57, y: 1.0, z: z + dirx * 0.57, ry: a });
    }
    labelStrip(g, spareLabels, { font: 'bold 24px Arial' });

    // ---- ground cabling: tower -> pedestal + trench covers ----
    droop(S, [-2.35, 0.75, 0.7], [-0.75, 0.75, 0.35], 0.4, 0.04);
    droop(S, [-2.3, 0.75, -0.5], [-0.7, 0.75, -0.3], 0.5, 0.035);
    S.add(M.metal, B(0.6, 0.05, 1.9), -1.5, 0.73, 0.05, 0, 0.12, 0);
    droop(S, [1.3, 0.72, -0.4], [3.6, 0.06, -3.2], 0.4, 0.045);
    droop(S, [0.9, 0.72, 1.0], [2.6, 0.06, 4.2], 0.5, 0.04);

    // ---- console pillar with status light + beacon ----
    S.add(M.darkMetal, B(0.42, 1.25, 0.34), -2.5, 1.32, 1.5);
    S.add(M.metal, B(0.3, 0.4, 0.04), -2.5, 1.5, 1.68);
    const light = statusLightMesh();
    light.position.set(-2.5, 2.1, 1.5);
    g.add(light);
    const beacon = beaconMesh();
    beacon.position.set(-2.5, 2.3, 1.5);
    g.add(beacon);

    // ---- signage ----
    S.add(M.darkMetal, B(2.6, 0.55, 0.07), 0, 1.35, -4.55);
    for (const sx of [-1.1, 1.1]) S.add(M.steel, C(0.035, 0.035, 0.75, 8), sx, 1.0, -4.55);
    labelPlate(g, 'SENTINEL LR-1', 2.4, 0.44, 0, 1.35, -4.51, Math.PI, { bg: '#5a4632' });
    D.add(dangerMat, P(1.0, 0.38), 1.55, 0.6, 0, 0, Math.PI / 2, 0);
    D.add(dangerMat, P(1.0, 0.38), 0.4, 0.6, 1.14, 0, 0, 0);
    D.add(dangerMat, P(1.1, 0.4), -3.62, 1.6, 0.62, 0, -Math.PI / 2, 0);

    S.flush();
    D.flush({ shadow: false });

    ctx.world.colliders.push(makeColliderCyl(pad.position.x, pad.position.z, 5.0, 0, 2.2));
    ctx.world.colliders.push(makeColliderBox(
      pad.position.x + Math.cos(pad.heading) * -3.0, pad.position.z - Math.sin(pad.heading) * -3.0, 1.5, 1.5, pad.heading, 0, 13
    ));
    // full-length box colliders — gapped cylinders let the player slip inside
    // the canister mesh (camera fills with dark geometry)
    for (const [x, z, a] of [[4.4, -3.6, 0.5], [5.2, -1.2, 0.35]]) {
      const w = padWorld(pad, x, z);
      ctx.world.colliders.push(makeColliderBox(w.x, w.z, 5.4, 0.95, pad.heading + a, 0, 1.7));
    }

    // per-frame hook: strobes blink, umbilical arm tracks battery state
    let armK = 0;
    const restElevation = 1.05;
    function extraUpdate(battery, dt) {
      const t = ctx.time.now % 1.6;
      strobeMat.emissiveIntensity = (t < 0.07 || (t > 0.24 && t < 0.31)) ? 3.8 : 0.15;
      const connected = battery.state === 'ready' && roundMesh.visible &&
        Math.abs(wrapAngle(pivot.rotation.y)) < 0.05 &&
        Math.abs(battery.currentElev - restElevation) < 0.05;
      armK = damp(armK, connected ? 0 : 1, 2.6, dt);
      armGroup.rotation.y = armYawExtended - armK * 1.95;
    }

    return {
      group: g, turntable: pivot, elevGroup: rail, tubes, statusLight: light, beacon,
      restElevation, fireElevation: 1.45, elevAxis: 'x', elevSign: -1,
      hydUpdaters: [hyd, hyd2],
      muzzleForward: new THREE.Vector3(0, 0, 1),
      isSentinel: true,
      roundMesh,
      extraUpdate,
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
      // rotate around x by -elev so the +z muzzle axis tips upward
      this.rig.elevGroup.rotation.x = -this.currentElev;
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
          if (this.ammo > 0) {
            if (this.rig.roundMesh) this.rig.roundMesh.visible = true;
            ctx.events.emit('battery-ready', { battery: this });
          }
        }
      }
      // status light
      const mat = r.statusLight.material;
      if (this.ammo <= 0) { mat.emissive.setHex(0xff2222); mat.emissiveIntensity = 1.2; }
      else if (this.state === 'ready') { mat.emissive.setHex(0x22ff44); mat.emissiveIntensity = 2.4; }
      else if (this.state === 'launching') { mat.emissive.setHex(0xff8822); mat.emissiveIntensity = 2 + Math.sin(ctx.time.now * 20) * 1.6; }
      else { mat.emissive.setHex(0xffaa22); mat.emissiveIntensity = 1.8; }
      // amber launch beacon (unlit emissive mesh, no THREE.Light)
      if (r.beacon) {
        r.beacon.material.emissiveIntensity = this.state === 'launching'
          ? (Math.sin(ctx.time.now * 16) > 0 ? 3.4 : 0.25)
          : 0;
      }
      if (r.extraUpdate) r.extraUpdate(this, dt);
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
      if (this.rig.roundMesh) this.rig.roundMesh.visible = false;
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
      if (this.rig.roundMesh) this.rig.roundMesh.visible = true;
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
