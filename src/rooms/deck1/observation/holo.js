// Rotating wireframe holo ship models over the display plinths. All ships live in ONE LineSegments
// (one draw call); update() rewrites the position buffer with each ship rotated about its own axis.
import * as THREE from "three";

function model(build) {
  const pts = [];
  const seg = (a, b) => pts.push(a[0], a[1], a[2], b[0], b[1], b[2]);
  const loop = (ring) => {
    for (let i = 0; i < ring.length; i++) seg(ring[i], ring[(i + 1) % ring.length]);
  };
  const circle = (r, y, n = 24) => Array.from({ length: n }, (_, i) => [r * Math.cos((i / n) * Math.PI * 2), y, r * Math.sin((i / n) * Math.PI * 2)]);
  const box = (x0, y0, z0, x1, y1, z1) => {
    const c = [];
    for (const x of [x0, x1]) for (const y of [y0, y1]) for (const z of [z0, z1]) c.push([x, y, z]);
    // 12 edges of the box (index bits x:4 y:2 z:1)
    for (let i = 0; i < 8; i++) for (const bit of [1, 2, 4]) if (!(i & bit)) seg(c[i], c[i | bit]);
  };
  build({ seg, loop, circle, box });
  return new Float32Array(pts);
}

// Wedge-hulled capital ship (original silhouette: flat dart, raised aft superstructure, notch bow)
const WEDGE = model(({ seg, loop }) => {
  const nose = [0, 0, -0.62];
  const L = [-0.36, 0, 0.44];
  const R = [0.36, 0, 0.44];
  const top = [0, 0.11, 0.3];
  const bot = [0, -0.07, 0.25];
  const aftC = [0, 0.04, 0.5];
  for (const a of [L, R, top, bot]) seg(nose, a);
  loop([L, aftC, R]);
  seg(L, top); seg(R, top); seg(L, bot); seg(R, bot); seg(top, aftC); seg(bot, aftC);
  // superstructure block + tower
  const b = [[-0.09, 0.11, 0.2], [0.09, 0.11, 0.2], [0.09, 0.11, 0.42], [-0.09, 0.11, 0.42]];
  const t = b.map((p) => [p[0], 0.2, p[2]]);
  loop(t);
  for (let i = 0; i < 4; i++) seg(b[i], t[i]);
  seg([-0.05, 0.2, 0.31], [-0.05, 0.3, 0.31]); seg([0.05, 0.2, 0.31], [0.05, 0.3, 0.31]); seg([-0.05, 0.3, 0.31], [0.05, 0.3, 0.31]);
  // deck chevrons
  for (let i = 0; i < 3; i++) {
    const z = -0.35 + i * 0.22;
    const w = 0.09 + i * 0.07;
    seg([-w, 0.003, z + 0.08], [0, 0.003, z]); seg([w, 0.003, z + 0.08], [0, 0.003, z]);
  }
});

// Ring station: two rings, spokes, hub column
const RING = model(({ seg, loop, circle }) => {
  const outer = circle(0.42, 0, 28);
  const inner = circle(0.3, 0.05, 28);
  const inner2 = circle(0.3, -0.05, 28);
  loop(outer); loop(inner); loop(inner2);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    seg([0.3 * Math.cos(a), 0.05, 0.3 * Math.sin(a)], [0.42 * Math.cos(a), 0, 0.42 * Math.sin(a)]);
    seg([0.3 * Math.cos(a), -0.05, 0.3 * Math.sin(a)], [0.42 * Math.cos(a), 0, 0.42 * Math.sin(a)]);
    seg([0.08 * Math.cos(a), 0.05, 0.08 * Math.sin(a)], [0.3 * Math.cos(a), 0.05, 0.3 * Math.sin(a)]);
  }
  loop(circle(0.08, 0.28, 12)); loop(circle(0.08, -0.28, 12)); loop(circle(0.12, 0.05, 12));
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    seg([0.08 * Math.cos(a), 0.28, 0.08 * Math.sin(a)], [0.08 * Math.cos(a), -0.28, 0.08 * Math.sin(a)]);
  }
});

// Escort frigate: slab hull, forward spine, twin engine pods
const FRIGATE = model(({ seg, box }) => {
  box(-0.16, -0.05, -0.2, 0.16, 0.07, 0.38);
  box(-0.04, -0.03, -0.62, 0.04, 0.03, -0.2);
  box(-0.3, -0.06, 0.1, -0.18, 0.06, 0.46);
  box(0.18, -0.06, 0.1, 0.3, 0.06, 0.46);
  seg([-0.18, 0, 0.3], [-0.16, 0, 0.3]); seg([0.16, 0, 0.3], [0.18, 0, 0.3]);
  seg([0, 0.07, 0.05], [0, 0.17, 0.05]); seg([0, 0.17, 0.05], [0, 0.17, 0.2]); seg([0, 0.17, 0.2], [0, 0.07, 0.2]);
});

const MODELS = [WEDGE, RING, FRIGATE];

/**
 * anchors: [{ pos:[x,y,z], scale }] centre of each floating model. Returns update(t).
 */
export function holoShips(ctx, anchors) {
  const ships = anchors.map((a, i) => ({ pos: a.pos, s: a.scale || 1, pts: MODELS[i % MODELS.length], phase: i * 1.9, speed: 0.32 + i * 0.06 }));
  const total = ships.reduce((n, s) => n + s.pts.length, 0);
  const buf = new Float32Array(total);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(buf, 3));
  const mat = new THREE.LineBasicMaterial({ color: 0x7fd0ff, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  const lines = new THREE.LineSegments(geo, mat);
  lines.frustumCulled = false;
  ctx.group.add(lines);
  const update = (t) => {
    let o = 0;
    for (const s of ships) {
      const a = s.phase + t * s.speed;
      const c = Math.cos(a);
      const sn = Math.sin(a);
      const bob = 0.03 * Math.sin(t * 0.7 + s.phase);
      const p = s.pts;
      for (let i = 0; i < p.length; i += 3) {
        const x = p[i] * s.s;
        const y = p[i + 1] * s.s;
        const z = p[i + 2] * s.s;
        buf[o++] = s.pos[0] + x * c + z * sn;
        buf[o++] = s.pos[1] + y + bob;
        buf[o++] = s.pos[2] - x * sn + z * c;
      }
    }
    geo.attributes.position.needsUpdate = true;
  };
  update(0);
  geo.computeBoundingBox();
  geo.computeBoundingSphere();
  return update;
}
