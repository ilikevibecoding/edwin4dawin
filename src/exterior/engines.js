// Ion engines: three main + four auxiliary nozzles on the stern wall. Each is a lathe bell with depth
// (throat well inside the hull), inner rings and radial vanes, a hot blue-white core disc (vertex colours
// above 1.0 so bloom picks it up) and an additive haze cone inside the bell. The stern wall around the
// engines is heat-discoloured through vertex colours; exhaust duct greebles fill the wall between them.
import * as THREE from "three";
import { ENGINES } from "../config/shipSpec.js";
import { dorsal, ventral, merge, box, cylZ, atlasBox, instancedFromList, worldUV, macroColor } from "./util.js";

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

function bellProfile(R) {
  const pts = [
    [0.26, -0.66],
    [0.3, -0.62],
    [0.42, -0.6],
    [0.52, -0.52],
    [0.66, -0.38],
    [0.8, -0.22],
    [0.92, -0.06],
    [0.99, 0.1],
    [1.0, 0.16],
    [1.07, 0.17],
    [1.09, 0.05],
    [1.1, -0.3],
    [1.1, -0.5],
  ];
  return pts.map(([r, a]) => new THREE.Vector2(r * R, a * R));
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
    for (const [rr, a, tube] of [
      [0.72, -0.3, 0.022],
      [0.86, -0.12, 0.02],
      [0.58, -0.46, 0.02],
    ]) {
      const ring = new THREE.TorusGeometry(rr * R, tube * R, 8, seg);
      ring.translate(x, y, z0 + a * R);
      metal.push(ring);
    }
    const vanes = R > 40 ? 14 : 10;
    for (let i = 0; i < vanes; i++) {
      const v = box(0.46 * R, 0, 0, 0.32 * R, 0.07 * R, Math.max(0.3, 0.008 * R));
      v.rotateZ((i / vanes) * Math.PI * 2);
      v.translate(x, y, z0 - 0.5 * R);
      metal.push(v);
    }
    // hub in the throat
    const hub = cylZ(0.12 * R, 0.16 * R, 0.14 * R, 16);
    hub.translate(x, y, z0 - 0.56 * R);
    metal.push(hub);
    // hot core disc: fan with bright centre, cooler rim
    {
      const n = 40;
      const pos = [];
      const col = [];
      const rc = 0.41 * R;
      const zc = z0 - 0.61 * R;
      for (let i = 0; i < n; i++) {
        const a0 = (i / n) * Math.PI * 2;
        const a1 = ((i + 1) / n) * Math.PI * 2;
        pos.push(x, y, zc, x + Math.cos(a0) * rc, y + Math.sin(a0) * rc, zc, x + Math.cos(a1) * rc, y + Math.sin(a1) * rc, zc);
        col.push(2.4, 2.55, 2.8, 0.55, 0.85, 1.7, 0.55, 0.85, 1.7);
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
      cores.push(g);
    }
    // additive haze cone inside the bell
    {
      const profile = [
        [0.4, -0.6, 0.85],
        [0.6, -0.42, 0.5],
        [0.78, -0.22, 0.22],
        [0.93, 0.05, 0.05],
        [0.97, 0.14, 0.0],
      ];
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
    }
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
    _t.setRGB(0.5 + heat * 0.25, 0.52 + heat * 0.3, 0.56 + heat * 0.5);
    col.lerp(_t, 0.75);
    return col;
  };
  macroColor(metalGeo, { base: 0.85, tint: bellTint });
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
        c.setScalar(0.4 + rand() * 0.3);
        L.pipes.push({ m: new THREE.Matrix4().compose(p, q, s), c: c.clone() });
      } else if (r < 0.78) {
        const sx = 4 + rand() * 6;
        const sy = 3 + rand() * 5;
        const sz = 3 + rand() * 6;
        if (!free(xx, yy, Math.max(sx, sy) / 2 + 1)) continue;
        q.identity();
        p.set(xx, yy, z0 + sz / 2 - 0.5);
        s.set(sx, sy, sz);
        c.setScalar(0.35 + rand() * 0.35);
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
  instancedFromList(pipeGeo, mats.greebleDark, L.pipes, detail.mid, "sternPipes");
  instancedFromList(boxGeo, mats.greebleDark, L.boxes, detail.mid, "sternBoxes");
  instancedFromList(finGeo, mats.atlas, L.fins, detail.mid, "sternFins");
  instancedFromList(ductGeo, mats.atlas, L.ducts, detail.mid, "sternDucts");
}
