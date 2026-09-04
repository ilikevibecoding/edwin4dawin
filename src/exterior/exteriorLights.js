// Emissive exterior detail: lit window rows (cut-out texture, 2.5 m pitch) collected from every builder
// into one mesh, and instanced running lights at the hull extremities that blink from update().
import * as THREE from "three";
import { HULL, TOWER, SUPERSTRUCTURE, ENGINES } from "../config/shipSpec.js";
import { dorsal, ventral, instanced } from "./util.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

const WINDOW_TILE_W = 40; // 16 windows per tile => 2.5 m pitch
const WINDOW_TILE_H = 5; // 2 rows per tile

// Collects window quads; rows are derived from the quad height (2.5 m per row).
export function createWindowRows() {
  const geos = [];
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const one = new THREE.Vector3(1, 1, 1);
  const pos = new THREE.Vector3();
  return {
    add(w, h, p, rot) {
      if (w < 2.5) return;
      const g = new THREE.PlaneGeometry(w, h);
      const uv = g.attributes.uv;
      const repU = w / WINDOW_TILE_W;
      const repV = h / WINDOW_TILE_H;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * repU, uv.getY(i) * repV);
      e.set(rot[0], rot[1], rot[2]);
      q.setFromEuler(e);
      m4.compose(pos.set(p[0], p[1], p[2]), q, one);
      g.applyMatrix4(m4);
      geos.push(g);
    },
    build(mat, parent, name = "windowRows") {
      if (!geos.length) return null;
      const merged = mergeGeometries(geos, false);
      merged.computeBoundingSphere();
      const mesh = new THREE.Mesh(merged, mat);
      mesh.name = name;
      parent.add(mesh);
      return mesh;
    },
  };
}

// Running / navigation lights: red port, green starboard, white strobes; each has its own blink phase.
export function buildRunningLights(ctx) {
  const { group } = ctx;
  const { slab, spire, domes } = TOWER;
  const spots = [];
  const R = [2.4, 0.18, 0.12];
  const G = [0.18, 2.2, 0.4];
  const W = [2.5, 2.5, 2.6];
  const A = [2.5, 1.6, 0.6];
  const add = (x, y, z, col, mode) => spots.push({ x, y, z, col, mode });
  // bow tip and along the leading edges
  add(0, dorsal(0, HULL.bowZ + 8) + 1, HULL.bowZ + 8, W, "strobe");
  for (const z of [-500, -200, 100, 400, 700]) {
    const hw = HULL.halfWidthAt(z) - 6;
    add(-hw, dorsal(-hw, z) + 1.2, z, R, "steady");
    add(hw, dorsal(hw, z) + 1.2, z, G, "steady");
    add(-hw, ventral(-hw, z) - 1.2, z, R, "steady");
    add(hw, ventral(hw, z) - 1.2, z, G, "steady");
  }
  // stern corners
  const hwS = HULL.halfWidthAt(HULL.sternZ) - 4;
  add(-hwS, dorsal(-hwS, 796) + 1.5, 796, R, "blink");
  add(hwS, dorsal(hwS, 796) + 1.5, 796, G, "blink");
  // bridge slab corners, dome tops, spire top and mid
  for (const sx of [-1, 1]) {
    add(sx * (slab.halfX - 2), slab.y1 + 1.2, slab.z0 + 2, sx < 0 ? R : G, "steady");
    add(sx * (slab.halfX - 2), slab.y1 + 1.2, slab.z1 - 2, sx < 0 ? R : G, "steady");
    add(sx * (slab.halfX - 2), slab.y0 - 1.2, slab.z0 + 2, W, "blink");
  }
  for (const [dx, dy, dz] of domes.positions) add(dx, dy + domes.radius + 1.0, dz, R, "blink");
  add(spire.x, spire.y1 + 1.6, spire.z, W, "strobe");
  add(spire.x + 1.2, spire.y0 + 36, spire.z, A, "blink");
  // terrace forward corners
  for (const [hx, z0, , yTop] of SUPERSTRUCTURE.terraces) {
    add(-hx + 1.5, yTop + 1.0, z0 + yTop * 0.25 + 1.5, R, "steady");
    add(hx - 1.5, yTop + 1.0, z0 + yTop * 0.25 + 1.5, G, "steady");
  }
  // keel block and hangar approach lights
  const k = HULL.keelPlate;
  for (const z of [k.z0 + 4, k.z1 - 4]) {
    add(-k.x + 1, k.y - 1.2, z, R, "steady");
    add(k.x - 1, k.y - 1.2, z, G, "steady");
  }
  for (const [x, y] of ENGINES.aux.positions) if (Math.abs(x) > 300) add(x, y + ENGINES.aux.radius * 1.15 + 3, ENGINES.sternZ + 2, A, "blink");

  const geo = new THREE.SphereGeometry(1.1, 8, 6);
  const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false, toneMapped: true });
  const base = new Float32Array(spots.length * 3);
  const mesh = instanced(
    geo,
    mat,
    spots.length,
    group,
    (i, m, c) => {
      const s = spots[i];
      m.makeTranslation(s.x, s.y, s.z);
      c.setRGB(s.col[0], s.col[1], s.col[2]);
      base[i * 3] = s.col[0];
      base[i * 3 + 1] = s.col[1];
      base[i * 3 + 2] = s.col[2];
      return true;
    },
    "runningLights",
  );
  const phase = spots.map((_, i) => (i * 0.61803) % 1);
  const col = new THREE.Color();
  let last = -1;
  return {
    mesh,
    update(t) {
      // ~20 Hz is plenty for blinking; avoids uploading the colour buffer every frame
      const step = Math.floor(t * 20);
      if (step === last) return;
      last = step;
      for (let i = 0; i < spots.length; i++) {
        const s = spots[i];
        let k = 1;
        if (s.mode === "blink") k = (t * 0.9 + phase[i]) % 1 < 0.5 ? 1 : 0.12;
        else if (s.mode === "strobe") k = (t * 1.3 + phase[i]) % 1 < 0.08 ? 1.6 : 0.1;
        col.setRGB(base[i * 3] * k, base[i * 3 + 1] * k, base[i * 3 + 2] * k);
        mesh.setColorAt(i, col);
      }
      mesh.instanceColor.needsUpdate = true;
    },
  };
}
