// Ion engines: three main + four auxiliary nozzles on the stern wall. Each is a lathe bell with depth
// (throat well inside the hull), inner rings and radial vanes, a hot blue-white core disc (vertex colours
// above 1.0 so bloom picks it up) and an additive haze cone inside the bell. The stern wall around the
// engines is heat-discoloured through vertex colours; exhaust duct greebles fill the wall between them.
import * as THREE from "three";
import { ENGINES } from "../config/shipSpec.js";
import { dorsal, ventral, merge, box, cylZ, atlasBox, layerMesh, worldUV, macroColor } from "./util.js";

const ALL_ENGINES = [...ENGINES.main.positions.map(([x, y]) => [x, y, ENGINES.main.radius]), ...ENGINES.aux.positions.map(([x, y]) => [x, y, ENGINES.aux.radius])];

// vertex-colour tint for the stern wall: scorch ring around every nozzle, soot beyond it
const _t = new THREE.Color();
export function sternHeatTint(x, y, z, col) {
  let scorch = 0;
  let soot = 0;
  for (const [ex, ey, R] of ALL_ENGINES) {
    const d = Math.hypot(x - ex, y - ey) / R;
    if (d < 1.55) scorch = Math.max(scorch, 1 - Math.max(0, d - 1.1) / 0.45);
    soot = Math.max(soot, Math.max(0, 1 - Math.max(0, d - 1.4) / 1.6));
  }
  col.multiplyScalar(1 - soot * 0.3);
  _t.setRGB(0.42, 0.36, 0.4);
  col.lerp(_t, scorch * 0.7);
  // bluish temper colours right at the rim
  if (scorch > 0.75) {
    _t.setRGB(0.35, 0.4, 0.62);
    col.lerp(_t, (scorch - 0.75) * 1.6);
  }
  return col;
}

// bell: throat well inside the hull, flaring to a thick rounded lip at the mouth, outer shell back to the wall
function bellProfile(R) {
  const pts = [
    [0.26, -0.66],
    [0.3, -0.62],
    [0.42, -0.6],
    [0.52, -0.52],
    [0.66, -0.38],
    [0.8, -0.22],
    [0.92, -0.06],
    [0.985, 0.08],
    [1.0, 0.15],
    [1.025, 0.2],
    [1.07, 0.225],
    [1.12, 0.2],
    [1.15, 0.14],
    [1.15, 0.06],
    [1.13, -0.04],
    [1.11, -0.2],
    [1.1, -0.5],
  ];
  return pts.map(([r, a]) => new THREE.Vector2(r * R, a * R));
}

// a flat fan disc with concentric rings; colour(t) gives the rgb at normalised radius t
function gradientDisc(x, y, z, radius, n, rings, color) {
  const pos = [];
  const col = [];
  const c0 = [0, 0, 0];
  const c1 = [0, 0, 0];
  for (let r = 0; r < rings; r++) {
    const t0 = r / rings;
    const t1 = (r + 1) / rings;
    color(t0, c0);
    color(t1, c1);
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * Math.PI * 2;
      const a1 = ((i + 1) / n) * Math.PI * 2;
      const p = (t, a) => [x + Math.cos(a) * radius * t, y + Math.sin(a) * radius * t, z];
      const A = p(t0, a0);
      const B = p(t1, a0);
      const C = p(t1, a1);
      const D = p(t0, a1);
      if (r === 0) {
        pos.push(...A, ...B, ...C);
        col.push(...c0, ...c1, ...c1);
      } else {
        pos.push(...A, ...B, ...C, ...A, ...C, ...D);
        col.push(...c0, ...c1, ...c1, ...c0, ...c1, ...c0);
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  return g;
}

function lathe(points, seg) {
  const g = new THREE.LatheGeometry(points, seg);
  g.rotateX(Math.PI / 2);
  return g;
}

export function buildEngines(ctx) {
  const { rand, mats, group, detail, atlas } = ctx;
  const metal = [];
  const cores = [];
  const glows = [];
  const z0 = ENGINES.sternZ;
  for (const [x, y, R] of ALL_ENGINES) {
    const seg = R > 40 ? 56 : 36;
    const bell = lathe(bellProfile(R), seg);
    bell.translate(x, y, z0);
    metal.push(bell);
    // mounting flange on the stern wall (also covers the cut-out edge of the wall grid) with bolt ring
    const flange = new THREE.RingGeometry(0.98 * R, R + 12, seg);
    flange.translate(x, y, z0 + 0.4);
    metal.push(flange);
    const boltRing = new THREE.TorusGeometry(R + 9, 0.45, 6, seg);
    boltRing.translate(x, y, z0 + 0.6);
    metal.push(boltRing);
    // inner rings step down the bell; two outer hoops give the shell depth and shading
    for (const [rr, a, tube] of [
      [0.72, -0.3, 0.022],
      [0.86, -0.12, 0.02],
      [0.58, -0.46, 0.02],
      [1.125, -0.12, 0.025],
      [1.115, -0.36, 0.022],
    ]) {
      const ring = new THREE.TorusGeometry(rr * R, tube * R, 8, seg);
      ring.translate(x, y, z0 + a * R);
      metal.push(ring);
    }
    // small hub deep in the throat
    const hub = cylZ(0.1 * R, 0.13 * R, 0.1 * R, 16);
    hub.translate(x, y, z0 - 0.6 * R);
    metal.push(hub);
    // hot core: smooth radial gradient, white-blue centre falling to a deep blue rim (bloom-friendly)
    cores.push(
      gradientDisc(x, y, z0 - 0.5 * R, 0.6 * R, seg, 6, (t, c) => {
        const k = Math.pow(1 - t, 1.6);
        c[0] = 0.12 + 1.3 * k;
        c[1] = 0.22 + 1.6 * k;
        c[2] = 0.7 + 1.55 * k;
      }),
    );
    // additive haze inside the bell (fades toward the lip)
    const haze = (profile) => {
      const g = lathe(
        profile.map(([r, a]) => new THREE.Vector2(r * R, a * R)),
        seg,
      );
      const ng = g.toNonIndexed();
      const p = ng.attributes.position;
      const c = new Float32Array(p.count * 3);
      for (let i = 0; i < p.count; i++) {
        const a = p.getZ(i) / R;
        let k = 0;
        for (let j = 0; j + 1 < profile.length; j++) {
          const a0 = profile[j][1];
          const a1 = profile[j + 1][1];
          if (a >= a0 - 1e-4 && a <= a1 + 1e-4) {
            const t = (a - a0) / (a1 - a0);
            k = profile[j][2] + (profile[j + 1][2] - profile[j][2]) * t;
            break;
          }
        }
        c[i * 3] = 0.45 * k;
        c[i * 3 + 1] = 0.68 * k;
        c[i * 3 + 2] = 1.0 * k;
      }
      ng.setAttribute("color", new THREE.BufferAttribute(c, 3));
      ng.translate(x, y, z0);
      glows.push(ng);
    };
    haze([
      [0.45, -0.5, 0.3],
      [0.62, -0.4, 0.2],
      [0.78, -0.22, 0.09],
      [0.93, 0.05, 0.03],
      [0.97, 0.14, 0.0],
    ]);
    // soft plume: an additive cone trailing aft of the mouth, brightest at the axis and the mouth
    haze([
      [0.9, 0.12, 0.0],
      [0.82, 0.3, 0.14],
      [0.66, 0.7, 0.09],
      [0.46, 1.2, 0.045],
      [0.22, 1.75, 0.012],
      [0.0, 2.05, 0.0],
    ]);
    // faint halo disc just behind the lip
    glows.push(
      gradientDisc(x, y, z0 + 0.25 * R, 1.18 * R, seg, 4, (t, c) => {
        const k = 0.1 * Math.pow(1 - t, 2.2);
        c[0] = 0.45 * k;
        c[1] = 0.68 * k;
        c[2] = 1.0 * k;
      }),
    );
  }
  const metalGeo = merge(metal);
  worldUV(metalGeo, 1 / 12);
  // temper colours run from blue-white heat at the throat to sooty dark grey at the lip
  const bellTint = (x, y, z, col) => {
    let best = null;
    for (const e of ALL_ENGINES) {
      const d = Math.hypot(x - e[0], y - e[1]) / e[2];
      if (!best || d < best.d) best = { d, R: e[2] };
    }
    const a = (z - z0) / best.R;
    const heat = THREE.MathUtils.clamp((-0.1 - a) / 0.5, 0, 1);
    _t.setRGB(0.66 + heat * 0.2, 0.68 + heat * 0.26, 0.72 + heat * 0.42);
    col.lerp(_t, 0.7);
    return col;
  };
  macroColor(metalGeo, { base: 0.95, tint: bellTint });
  metalGeo.computeBoundingSphere();
  const engMesh = new THREE.Mesh(metalGeo, mats.engine);
  engMesh.name = "engines";
  group.add(engMesh);
  const coreMesh = new THREE.Mesh(merge(cores), mats.engineCore);
  coreMesh.name = "engineCores";
  group.add(coreMesh);
  const glowMesh = new THREE.Mesh(merge(glows), mats.engineGlow);
  glowMesh.name = "engineGlow";
  glowMesh.renderOrder = 2;
  group.add(glowMesh);

  // exhaust ducts and heat exchangers on the stern wall between the nozzles
  const A = atlas.cells;
  const pipeGeo = cylZ(1, 1, 1, 12);
  const boxGeo = box(0, 0, 0, 1, 1, 1);
  const finGeo = atlasBox(1, 1, 1, { pz: A.fins, side: A.dark });
  const ductGeo = atlasBox(1, 1, 1, { pz: A.duct, side: A.dark });
  const L = { pipes: [], boxes: [], fins: [], ducts: [] };
  const q = new THREE.Quaternion();
  const p = new THREE.Vector3();
  const s = new THREE.Vector3();
  const c = new THREE.Color();
  const free = (x, y, m) => {
    for (const [ex, ey, R] of ALL_ENGINES) if (Math.hypot(x - ex, y - ey) < R * 1.16 + m) return false;
    return true;
  };
  for (let x = -428; x <= 428; x += 14) {
    const yLo = ventral(x, z0) + 4;
    const yHi = dorsal(x, z0) - 4;
    for (let y = yLo; y < yHi; y += 12) {
      const xx = x + (rand() - 0.5) * 8;
      const yy = y + (rand() - 0.5) * 6;
      if (yy < yLo || yy > yHi) continue;
      const r = rand();
      if (r < 0.3) continue;
      if (r < 0.55) {
        const rr = 1.2 + rand() * 2.2;
        const len = 5 + rand() * 9;
        if (!free(xx, yy, rr + 1)) continue;
        q.identity();
        p.set(xx, yy, z0 + len / 2 - 1);
        s.set(rr, rr, len);
        c.setScalar(0.66 + rand() * 0.3);
        L.pipes.push({ m: new THREE.Matrix4().compose(p, q, s), c: c.clone() });
      } else if (r < 0.78) {
        const sx = 4 + rand() * 6;
        const sy = 3 + rand() * 5;
        const sz = 3 + rand() * 6;
        if (!free(xx, yy, Math.max(sx, sy) / 2 + 1)) continue;
        q.identity();
        p.set(xx, yy, z0 + sz / 2 - 0.5);
        s.set(sx, sy, sz);
        c.setScalar(0.62 + rand() * 0.35);
        L.boxes.push({ m: new THREE.Matrix4().compose(p, q, s), c: c.clone() });
      } else if (r < 0.9) {
        const sx = 6 + rand() * 6;
        const sy = 5 + rand() * 5;
        if (!free(xx, yy, Math.max(sx, sy) / 2 + 1)) continue;
        q.identity();
        p.set(xx, yy, z0 + 0.6);
        s.set(sx, sy, 1.2);
        c.setScalar(0.85);
        L.fins.push({ m: new THREE.Matrix4().compose(p, q, s), c: c.clone() });
      } else {
        const sx = 5 + rand() * 5;
        const sy = 4 + rand() * 4;
        if (!free(xx, yy, Math.max(sx, sy) / 2 + 1)) continue;
        q.identity();
        p.set(xx, yy, z0 + 1.2);
        s.set(sx, sy, 2.4);
        c.setScalar(1);
        L.ducts.push({ m: new THREE.Matrix4().compose(p, q, s), c: c.clone() });
      }
    }
  }
  layerMesh(
    [
      { geo: pipeGeo, list: L.pipes },
      { geo: boxGeo, list: L.boxes },
    ],
    mats.greebleDark,
    detail.mid,
    "sternPipes",
  );
  layerMesh(
    [
      { geo: finGeo, list: L.fins },
      { geo: ductGeo, list: L.ducts },
    ],
    mats.atlas,
    detail.mid,
    "sternFins",
  );
}
