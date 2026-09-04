import * as THREE from 'three';
import { mulberry32 } from '../textures/core.js';

// ---------------------------------------------------------------------------
// Ground wear. One overlay mesh draped over the terrain carries everything
// people and vehicles have done to the dirt: the gravelled apron, the access
// track, twin tyre ruts into every parking slot, footpaths worn between the
// places people walk, the scorch round the fire, the trampled ring under the
// mess tent, an oil stain at the workshop, and a game trail skirting the edge.
//
// It is painted on a canvas in camp coordinates and draped on a grid that
// samples terrain.heightAt(), so it follows whatever the terrain agent's pad
// ends up being. One draw call.
// ---------------------------------------------------------------------------

const EXTENT = { u0: -50, u1: 50, v0: -40, v1: 42 };

export function buildGroundWear(frame, plan, { quality = 'high' } = {}) {
  const px = quality === 'fast' ? 12 : quality === 'ultra' ? 22 : 16; // pixels per metre
  const W = Math.round((EXTENT.u1 - EXTENT.u0) * px);
  const H = Math.round((EXTENT.v1 - EXTENT.v0) * px);
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  const rnd = mulberry32(9090);
  const X = (u) => (u - EXTENT.u0) * px;
  const Y = (v) => (EXTENT.v1 - v) * px;

  const dust = (a) => `rgba(168,146,108,${a})`;
  const packed = (a) => `rgba(96,78,56,${a})`;
  const rut = (a) => `rgba(58,46,32,${a})`;
  const path = (a) => `rgba(104,86,60,${a})`;

  /** Noisy-edged fill along a polyline: many soft discs. */
  const stroke = (pts, width, color, { step = 0.25, jitter = 0.2, alpha = 0.6, feather = 1.6 } = {}) => {
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, az] = pts[i];
      const [bx, bz] = pts[i + 1];
      const L = Math.hypot(bx - ax, bz - az);
      const n = Math.max(1, Math.ceil(L / step));
      for (let k = 0; k <= n; k++) {
        const t = k / n;
        const u = ax + (bx - ax) * t + (rnd() - 0.5) * jitter;
        const v = az + (bz - az) * t + (rnd() - 0.5) * jitter;
        const r = width * 0.5 * (0.8 + rnd() * 0.4);
        const g = ctx.createRadialGradient(X(u), Y(v), 0, X(u), Y(v), r * feather * px);
        g.addColorStop(0, color(alpha));
        g.addColorStop(0.55, color(alpha * 0.6));
        g.addColorStop(1, color(0));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(X(u), Y(v), r * feather * px, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  };

  /** Twin ruts a track-width apart along a polyline, with a paler crown between. */
  const tyreTracks = (pts, { gauge = 1.75, width = 0.36, alpha = 0.55, passes = 1 } = {}) => {
    for (let pass = 0; pass < passes; pass++) {
      const off = (pass - (passes - 1) * 0.5) * 0.25;
      for (const s of [-1, 1]) {
        const line = [];
        for (let i = 0; i < pts.length; i++) {
          const prev = pts[Math.max(0, i - 1)];
          const next = pts[Math.min(pts.length - 1, i + 1)];
          const dx = next[0] - prev[0];
          const dz = next[1] - prev[1];
          const L = Math.hypot(dx, dz) || 1;
          const nx = -dz / L;
          const nz = dx / L;
          line.push([pts[i][0] + nx * (s * gauge * 0.5 + off), pts[i][1] + nz * (s * gauge * 0.5 + off)]);
        }
        stroke(line, width, rut, { step: 0.18, jitter: 0.05, alpha, feather: 1.3 });
      }
      stroke(pts, gauge * 0.7, dust, { step: 0.3, jitter: 0.1, alpha: alpha * 0.35, feather: 1.2 });
    }
  };

  // --- the apron and the access track --------------------------------------
  ctx.fillStyle = packed(0);
  ctx.fillRect(0, 0, W, H);
  const apron = [
    [-27, -19.5],
    [27, -19.5],
    [28, -6.5],
    [-28, -6.5],
  ];
  // packed earth with a ragged edge: fill, then eat the edge with soft discs of nothing
  ctx.save();
  ctx.beginPath();
  apron.forEach(([u, v], i) => (i ? ctx.lineTo(X(u), Y(v)) : ctx.moveTo(X(u), Y(v))));
  ctx.closePath();
  ctx.fillStyle = packed(0.7);
  ctx.fill();
  ctx.restore();
  stroke(
    [
      [-28, -19.5],
      [28, -19.5],
    ],
    2.5,
    packed,
    { step: 0.5, jitter: 0.8, alpha: 0.5, feather: 1.8 },
  );
  stroke(
    [
      [-28, -6.5],
      [28, -6.5],
    ],
    2.5,
    packed,
    { step: 0.5, jitter: 0.8, alpha: 0.5, feather: 1.8 },
  );
  // gravel: a speckle of paler stones over the apron
  for (let i = 0; i < W * H * 0.0025; i++) {
    const u = -28 + rnd() * 56;
    const v = -19.5 + rnd() * 13;
    ctx.fillStyle = rnd() < 0.7 ? `rgba(170,158,135,${0.25 + rnd() * 0.4})` : `rgba(60,50,40,${0.3 + rnd() * 0.3})`;
    ctx.beginPath();
    ctx.arc(X(u), Y(v), (0.03 + rnd() * 0.06) * px, 0, Math.PI * 2);
    ctx.fill();
  }
  stroke(plan.wear.trackIn, 5.5, packed, { step: 0.4, jitter: 0.4, alpha: 0.55, feather: 1.5 });
  tyreTracks(plan.wear.trackIn, { alpha: 0.8, passes: 3 });
  tyreTracks(plan.wear.laneLine, { alpha: 0.7, passes: 3 });
  // the turn into each slot is driven once a day, the lane a hundred times
  for (const t of plan.wear.slotTracks) tyreTracks(t, { alpha: 0.45, passes: 1 });
  // where the vehicles stand, the ground is packed to a polish
  for (const p of plan.parking) stroke([[p.u, p.v - 1.5], [p.u, p.v + 1.5]], 2.2, packed, { step: 0.4, alpha: 0.35, feather: 1.6 });

  // --- footpaths -----------------------------------------------------------
  for (const p of plan.wear.paths) {
    stroke(p, 0.8, path, { step: 0.22, jitter: 0.18, alpha: 0.7, feather: 1.5 });
    stroke(p, 0.4, rut, { step: 0.2, jitter: 0.1, alpha: 0.45, feather: 1.2 });
  }
  // trampled ground: round the fire, under the mess tent, at the kitchen, at the gate
  const trample = (u, v, r, a) => {
    for (let i = 0; i < 40; i++) {
      const ang = rnd() * Math.PI * 2;
      const rr = Math.sqrt(rnd()) * r;
      const g = ctx.createRadialGradient(X(u + Math.cos(ang) * rr), Y(v + Math.sin(ang) * rr), 0, X(u + Math.cos(ang) * rr), Y(v + Math.sin(ang) * rr), 1.2 * px);
      g.addColorStop(0, packed(a));
      g.addColorStop(1, packed(0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(X(u + Math.cos(ang) * rr), Y(v + Math.sin(ang) * rr), 1.2 * px, 0, Math.PI * 2);
      ctx.fill();
    }
  };
  trample(plan.fire.u, plan.fire.v, 4.5, 0.3);
  trample(plan.mess.u, plan.mess.v, 5.0, 0.22);
  trample(plan.kitchen.u, plan.kitchen.v, 3.2, 0.3);
  trample(plan.gate.u + 1, plan.gate.v + 3, 3.0, 0.25);
  trample(plan.cabin.u, plan.cabin.v - 3.5, 3.0, 0.25);
  for (const t of plan.tents) trample(t.u, t.v - 3.2, 2.2, 0.25);

  // --- scorch, ash and stains -------------------------------------------------
  const scorch = (u, v, r) => {
    const g = ctx.createRadialGradient(X(u), Y(v), 0, X(u), Y(v), r * px);
    g.addColorStop(0, 'rgba(22,18,14,0.95)');
    g.addColorStop(0.45, 'rgba(40,34,26,0.75)');
    g.addColorStop(0.7, 'rgba(120,112,100,0.35)');
    g.addColorStop(1, 'rgba(120,112,100,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(X(u), Y(v), r * px, 0, Math.PI * 2);
    ctx.fill();
  };
  scorch(plan.fire.u, plan.fire.v, plan.fire.radius * 2.1);
  scorch(plan.fire2.u, plan.fire2.v, plan.fire2.radius * 2.2);
  // oil under the workshop, the darkest thing on the ground
  for (let i = 0; i < 6; i++) {
    const u = plan.workshop.u - 1 + rnd() * 2.5;
    const v = plan.workshop.v - 1 + rnd() * 2;
    const g = ctx.createRadialGradient(X(u), Y(v), 0, X(u), Y(v), (0.3 + rnd() * 0.5) * px);
    g.addColorStop(0, 'rgba(18,14,10,0.9)');
    g.addColorStop(1, 'rgba(18,14,10,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(X(u), Y(v), 0.8 * px, 0, Math.PI * 2);
    ctx.fill();
  }
  // grey wash-water outfall from the kitchen
  stroke([[plan.kitchen.u + 2.5, plan.kitchen.v + 2.5], [plan.kitchen.u + 4, plan.kitchen.v + 3.5]], 0.8, (a) => `rgba(70,68,60,${a})`, { alpha: 0.45 });

  // --- game trail --------------------------------------------------------------
  stroke(plan.wear.gameTrail, 0.5, path, { step: 0.3, jitter: 0.25, alpha: 0.32, feather: 1.6 });
  for (let i = 0; i < plan.wear.gameTrail.length - 1; i++) {
    const [ax, az] = plan.wear.gameTrail[i];
    const [bx, bz] = plan.wear.gameTrail[i + 1];
    const L = Math.hypot(bx - ax, bz - az);
    for (let k = 0; k < L * 1.5; k++) {
      const t = rnd();
      const u = ax + (bx - ax) * t + (rnd() - 0.5) * 0.6;
      const v = az + (bz - az) * t + (rnd() - 0.5) * 0.6;
      ctx.fillStyle = `rgba(48,38,26,${0.35 + rnd() * 0.35})`;
      ctx.beginPath();
      ctx.ellipse(X(u), Y(v), 0.06 * px, 0.09 * px, rnd() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.needsUpdate = true;

  // --- the draped mesh -------------------------------------------------------------
  const cell = quality === 'fast' ? 1.0 : 0.75;
  const nu = Math.ceil((EXTENT.u1 - EXTENT.u0) / cell);
  const nv = Math.ceil((EXTENT.v1 - EXTENT.v0) / cell);
  const geo = new THREE.PlaneGeometry(EXTENT.u1 - EXTENT.u0, EXTENT.v1 - EXTENT.v0, nu, nv);
  // PlaneGeometry lies in xy; put it in xz with +y (plane) toward -z (camp v)
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const uvs = geo.attributes.uv;
  const cu = (EXTENT.u0 + EXTENT.u1) * 0.5;
  const cv = (EXTENT.v0 + EXTENT.v1) * 0.5;
  for (let i = 0; i < pos.count; i++) {
    const u = pos.getX(i) + cu;
    const v = -pos.getZ(i) + cv;
    // a little more lift where the terrain is steeper, so the sheet clears the mesh's facets
    pos.setXYZ(i, u, frame.ground(u, v) + 0.045, -v);
    uvs.setXY(i, (u - EXTENT.u0) / (EXTENT.u1 - EXTENT.u0), (v - EXTENT.v0) / (EXTENT.v1 - EXTENT.v0));
  }
  geo.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({
    map: tex,
    transparent: true,
    depthWrite: false,
    metalness: 0,
    roughness: 0.96,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
    envMapIntensity: 0.25,
    name: 'campWear',
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = 'campWear';
  mesh.receiveShadow = true;
  mesh.castShadow = false;
  mesh.renderOrder = -1;
  return { mesh, tris: geo.index.count / 3 };
}
