// Holo table projection for d1-bridge: an additive wireframe of the ship itself (the §6.2 exterior envelope at
// 1:1000) rotating slowly over the plinth, a turntable grid, and a scan plane sweeping up and down through
// the model. Non-kit objects in ctx.group (LineSegments + one Mesh = 2 draw calls), animated from absolute time.
import * as THREE from "three";

export function buildHolo(ctx, { x, y, z, scale = 1 / 1000, hover = 0.55 }) {
  const S = scale;
  const pts = [];
  const cols = [];
  const C_HULL = [0.55, 0.78, 1.0];
  const C_DET = [0.42, 0.62, 1.0];
  const C_GRID = [0.25, 0.45, 0.9];
  const seg = (a, b, c, k = 1) => {
    pts.push(a[0], a[1], a[2], b[0], b[1], b[2]);
    for (let i = 0; i < 2; i++) cols.push(c[0] * k, c[1] * k, c[2] * k);
  };
  const box = (mn, mx, c, k) => {
    const p = (i) => [i & 1 ? mx[0] : mn[0], i & 2 ? mx[1] : mn[1], i & 4 ? mx[2] : mn[2]];
    for (let i = 0; i < 8; i++) for (const bit of [1, 2, 4]) if (!(i & bit)) seg(p(i), p(i | bit), c, k);
  };
  const ring = (cx, cy, cz, r, n, c, k, plane = "xz") => {
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * Math.PI * 2;
      const a1 = ((i + 1) / n) * Math.PI * 2;
      const q = (a) => (plane === "xz" ? [cx + r * Math.cos(a), cy, cz + r * Math.sin(a)] : [cx + r * Math.cos(a), cy + r * Math.sin(a), cz]);
      seg(q(a0), q(a1), c, k);
    }
  };

  // hull (bow -z): upper pyramid ridge + side edges, lower hull keel, stern edge
  const bow = [0, 0, -800 * S];
  const sternL = [-470 * S, 0, 800 * S];
  const sternR = [470 * S, 0, 800 * S];
  const ridge = [0, 75 * S, 800 * S];
  seg(bow, sternL, C_HULL, 1.35);
  seg(bow, sternR, C_HULL, 1.35);
  seg(bow, ridge, C_HULL, 1.2);
  seg(sternL, ridge, C_HULL, 1.2);
  seg(sternR, ridge, C_HULL, 1.2);
  const keel1 = [0, -95 * S, 100 * S];
  const keel2 = [0, -95 * S, 500 * S];
  const keelS = [0, -60 * S, 800 * S];
  seg(bow, keel1, C_HULL, 1.1);
  seg(keel1, keel2, C_HULL, 1.1);
  seg(keel2, keelS, C_HULL, 1.1);
  seg(sternL, keelS, C_HULL, 1.1);
  seg(sternR, keelS, C_HULL, 1.1);
  // keel plate outline
  box([-120 * S, -85 * S, -80 * S], [120 * S, -85 * S + 0.0001, 200 * S], C_DET, 0.6);
  // upper-surface panel lines
  for (const zz of [-500, -250, 0, 250, 500]) {
    const f = (zz + 800) / 1600;
    seg([-470 * S * f, 0, zz * S], [0, 75 * S * f, zz * S], C_DET, 0.7);
    seg([470 * S * f, 0, zz * S], [0, 75 * S * f, zz * S], C_DET, 0.7);
  }
  // side trenches (a line just under each side edge)
  for (const sx of [-1, 1]) seg([sx * 60 * S, -12 * S, -650 * S], [sx * 455 * S, -12 * S, 800 * S], C_DET, 0.5);
  // superstructure terraces, neck, bridge head, domes
  box([-110 * S, 20 * S, 120 * S], [110 * S, 90 * S, 760 * S], C_DET, 1.0);
  box([-80 * S, 90 * S, 200 * S], [80 * S, 135 * S, 700 * S], C_DET, 1.0);
  box([-38 * S, 135 * S, 480 * S], [38 * S, 232 * S, 560 * S], C_DET, 1.1);
  box([-90 * S, 232 * S, 455 * S], [90 * S, 268 * S, 545 * S], C_HULL, 1.5);
  for (const sx of [-1, 1]) {
    ring(sx * 62 * S, 286 * S, 500 * S, 20 * S, 10, C_DET, 1.0, "xz");
    ring(sx * 62 * S, 286 * S, 500 * S, 20 * S, 10, C_DET, 0.8, "xy");
    seg([sx * 62 * S, 268 * S, 500 * S], [sx * 62 * S, 286 * S, 500 * S], C_DET, 0.8);
  }
  // engines at the stern plane
  ring(0, 20 * S, 800 * S, 48 * S, 12, C_HULL, 1.5, "xy");
  for (const sx of [-1, 1]) ring(sx * 165 * S, 12 * S, 800 * S, 48 * S, 12, C_HULL, 1.5, "xy");
  for (const [ex, ey] of [
    [70, 45],
    [-70, 45],
    [260, 5],
    [-260, 5],
  ])
    ring(ex * S, ey * S, 800 * S, 16 * S, 8, C_DET, 1.0, "xy");
  // hangar aperture in the keel
  box([-36 * S, -85 * S, -30 * S], [36 * S, -85 * S + 0.0001, 94 * S], C_HULL, 1.0);

  // turntable grid in the plinth plane (rotates with the model)
  const gy = -hover;
  for (const r of [0.28, 0.56, 0.84]) ring(0, gy, 0, r, 40, C_GRID, 0.55, "xz");
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    seg([0.1 * Math.cos(a), gy, 0.1 * Math.sin(a)], [0.84 * Math.cos(a), gy, 0.84 * Math.sin(a)], C_GRID, 0.35);
  }
  // vertical projection ribs from the grid rim up to the model's stern corners
  for (const sx of [-1, 1]) seg([sx * 0.47, gy, 0.8], [sx * 0.47, 0, 0.8], C_GRID, 0.25);

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
  geo.setAttribute("color", new THREE.Float32BufferAttribute(cols, 3));
  const lineMat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false });
  const lines = new THREE.LineSegments(geo, lineMat);
  lines.name = "holo-wedge";
  lines.frustumCulled = false;

  const group = new THREE.Group();
  group.name = "holo";
  group.position.set(x, y, z);
  const hull = new THREE.Group();
  hull.position.y = hover;
  hull.add(lines);
  group.add(hull);

  const sweepMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.35, 0.6, 1.0).multiplyScalar(1.3), transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const sweep = new THREE.Mesh(new THREE.CircleGeometry(0.86, 40), sweepMat);
  sweep.name = "holo-sweep";
  sweep.rotation.x = -Math.PI / 2;
  sweep.position.y = 0.4;
  group.add(sweep);
  ctx.group.add(group);

  function update(t) {
    hull.rotation.y = t * 0.12;
    hull.position.y = hover + Math.sin(t * 0.7) * 0.015;
    const ph = (t * 0.25) % 1;
    const tri = ph < 0.5 ? ph * 2 : 2 - ph * 2;
    sweep.position.y = 0.32 + tri * 0.6;
    sweepMat.opacity = 0.12 + 0.06 * Math.sin(t * 3);
    lineMat.opacity = 0.9 + 0.05 * Math.sin(t * 7.3);
  }
  update(ctx.time ? ctx.time() : 0);
  return { group, update };
}
