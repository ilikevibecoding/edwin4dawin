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

// The terrain's graded pad is an ellipse in camp coordinates: 21 m toward the
// road, 30 m away from it, 27 m to either side, with an edge that wanders a
// metre or so. The clearing's *visual* boundary — where bare dirt gives way to
// grass — is painted here as a 3–6 m noise-displaced band straddling that
// edge, and the same function is exported so the vegetation can ramp its grass
// off the same line.
const PAD = { road: 21, far: 30, side: 27 };
const BLEND_IN = -2.2; // metres inside the pad edge where grass starts to creep in
const BLEND_OUT = 3.6; // metres outside it where the dust stops

/** Signed distance from the pad edge in camp coordinates, wobbled; negative inside. */
export function padEdge(u, v) {
  const rv = v < 0 ? PAD.road : PAD.far;
  const qn = Math.sqrt((u * u) / (PAD.side * PAD.side) + (v * v) / (rv * rv));
  const wob = Math.sin(u * 0.31 + v * 0.17) * 1.1 + Math.sin(u * 0.83 - v * 0.62 + 1.7) * 0.7 + Math.sin(v * 1.9 + u * 0.4) * 0.35;
  return (qn - 1) * PAD.side + wob;
}

/** 1 on bare compound dirt, 0 on savanna, ramping across the blend band. */
export function bareAt(u, v) {
  const e = padEdge(u, v);
  const t = (e - BLEND_IN) / (BLEND_OUT - BLEND_IN);
  const s = t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t);
  return 1 - s;
}

/**
 * The clearing as the vegetation sees it: world-space queries. `bare(x, z)` is
 * 1 where nothing grows, 0 in the open savanna; `edge(x, z)` is the signed
 * distance to the pad edge in metres.
 */
export function clearingMask(anchor) {
  const a = anchor;
  const toCamp = (x, z) => {
    const dx = x - a.x;
    const dz = z - a.z;
    return [dx * a.tx + dz * a.tz, -(dx * a.lx + dz * a.lz)];
  };
  return {
    radii: { ...PAD },
    blend: { inside: -BLEND_IN, outside: BLEND_OUT },
    bare: (x, z) => {
      const [u, v] = toCamp(x, z);
      return bareAt(u, v);
    },
    edge: (x, z) => {
      const [u, v] = toCamp(x, z);
      return padEdge(u, v);
    },
    toCamp,
  };
}

export function buildGroundWear(frame, plan, { quality = 'high', footprints = [] } = {}) {
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
  // The access track. Inside the fence it is the darkest, most driven ground in
  // the camp; out on the road's pale platform the same dark fill read as a
  // shadow slab the size of a wall in the gate frame (round 1, critic C), so
  // past the gate it fades to twin ruts alone, and those fade into the road.
  const inside = plan.wear.trackIn.filter(([, v]) => v > plan.gate.v - 0.5);
  const outside = plan.wear.trackIn.filter(([, v]) => v <= plan.gate.v + 0.5);
  stroke(inside, 5.0, packed, { step: 0.4, jitter: 0.4, alpha: 0.4, feather: 1.5 });
  tyreTracks(inside, { alpha: 0.6, passes: 3 });
  // the ruts through the gate and out to the road, thinning with every metre
  for (let i = 0; i < outside.length - 1; i++) {
    const seg = [outside[i], outside[i + 1]];
    const vMid = (outside[i][1] + outside[i + 1][1]) * 0.5;
    const k = 1 - Math.min(1, Math.max(0, (plan.gate.v - vMid) / 9));
    if (k <= 0.03) continue;
    tyreTracks(seg, { alpha: 0.12 + 0.3 * k, passes: 2, width: 0.3 });
  }
  tyreTracks(plan.wear.laneLine, { alpha: 0.7, passes: 3 });
  // the turn into each slot is driven once a day, the lane a hundred times
  for (const t of plan.wear.slotTracks) tyreTracks(t, { alpha: 0.45, passes: 1 });
  // where the vehicles stand, the ground is packed to a polish
  for (const p of plan.parking) stroke([[p.u, p.v - 1.5], [p.u, p.v + 1.5]], 2.2, packed, { step: 0.4, alpha: 0.35, feather: 1.6 });

  // --- footpaths -----------------------------------------------------------
  // a worn path in dry country is pale in the middle, where feet have polished
  // the dust, with a darker scuffed margin where the grass roots were
  for (const p of plan.wear.paths) {
    stroke(p, 1.0, path, { step: 0.22, jitter: 0.2, alpha: 0.6, feather: 1.5 });
    stroke(p, 0.45, dust, { step: 0.18, jitter: 0.08, alpha: 0.42, feather: 1.15 });
    stroke(p, 0.55, rut, { step: 0.2, jitter: 0.14, alpha: 0.22, feather: 1.3 });
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
  // ash: raked out of the pit, kicked about by feet and blown downwind (the
  // camp's wind comes off the road, so it drifts toward +v); charcoal bits with it
  const ashSpill = (u, v, r, wind) => {
    for (let i = 0; i < 260; i++) {
      const ang = rnd() * Math.PI * 2;
      const rr = r * (0.9 + Math.pow(rnd(), 0.6) * 1.6);
      const du = Math.cos(ang) * rr + wind[0] * rnd() * r * 1.2;
      const dv = Math.sin(ang) * rr + wind[1] * rnd() * r * 1.2;
      const grey = 140 + rnd() * 50;
      ctx.fillStyle = rnd() < 0.8 ? `rgba(${grey},${grey - 6},${grey - 14},${0.18 + rnd() * 0.3})` : `rgba(28,24,20,${0.5 + rnd() * 0.4})`;
      ctx.beginPath();
      ctx.ellipse(X(u + du), Y(v + dv), (0.06 + rnd() * 0.16) * px, (0.04 + rnd() * 0.1) * px, rnd() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
    // the ash-grey ground just outside the stones
    const g = ctx.createRadialGradient(X(u), Y(v), r * 0.9 * px, X(u), Y(v), r * 1.9 * px);
    g.addColorStop(0, 'rgba(150,144,132,0.32)');
    g.addColorStop(1, 'rgba(150,144,132,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(X(u), Y(v), r * 1.9 * px, 0, Math.PI * 2);
    ctx.fill();
  };
  ashSpill(plan.fire.u, plan.fire.v, plan.fire.radius, [0.3, 0.7]);
  ashSpill(plan.fire2.u, plan.fire2.v, plan.fire2.radius, [0.3, 0.7]);
  // bark and chips round the woodpile and the chopping ground beside it
  for (let i = 0; i < 220; i++) {
    const u = plan.wood.u + (rnd() - 0.5) * 5.5 + 0.8;
    const v = plan.wood.v + (rnd() - 0.5) * 3.2 - 0.4;
    const t = rnd();
    ctx.fillStyle = t < 0.5 ? `rgba(196,170,120,${0.3 + rnd() * 0.4})` : t < 0.8 ? `rgba(120,88,52,${0.3 + rnd() * 0.4})` : `rgba(60,44,28,${0.3 + rnd() * 0.3})`;
    ctx.beginPath();
    ctx.ellipse(X(u), Y(v), (0.05 + rnd() * 0.12) * px, (0.02 + rnd() * 0.05) * px, rnd() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }

  // --- contact: the ground under everything that stands on it ------------------
  // A soft dark blob under every placed prop — a chair leg's shadow, the damp
  // under a drum, the shade under a table — so nothing floats on a flat plane.
  for (const f of footprints) {
    const r = f.r * 1.1 + 0.15;
    const a = f.r < 0.6 ? 0.42 : f.r < 1.5 ? 0.3 : 0.16;
    const g = ctx.createRadialGradient(X(f.u), Y(f.v), 0, X(f.u), Y(f.v), r * px);
    g.addColorStop(0, `rgba(40,30,20,${a})`);
    g.addColorStop(0.5, `rgba(40,30,20,${a * 0.6})`);
    g.addColorStop(1, 'rgba(40,30,20,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(X(f.u), Y(f.v), r * px, r * px * 0.85, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // --- the clearing's edge: a band where dirt and grass trade places -----------
  // Inside the pad edge a thinning cover of straw-coloured tufts creeps in;
  // outside it bare dust patches thin out into the grass. On the road side the
  // pad edge runs just inside the fence line, so the band breaks the straight
  // pale strip between the parking row and the road (round 1, critics A, B).
  {
    const straw = (a) => `rgba(176,160,104,${a})`;
    const olive = (a) => `rgba(126,124,78,${a})`;
    const bare = (a) => `rgba(150,124,90,${a})`;
    const n = Math.round(W * H * 0.0075);
    for (let i = 0; i < n; i++) {
      const u = EXTENT.u0 + rnd() * (EXTENT.u1 - EXTENT.u0);
      const v = EXTENT.v0 + rnd() * (EXTENT.v1 - EXTENT.v0);
      const e = padEdge(u, v);
      if (e < BLEND_IN - 3 || e > BLEND_OUT + 2) continue;
      // along the road the band runs under the fence line, thinner (the verge is
      // driven and trampled) and clear of the access track through the gate
      if (v < -13 && Math.abs(u - plan.gate.u) < 4.5) continue;
      const roadSide = v < -13 ? 0.55 : 1;
      if (e < 0.4) {
        // inside: grass creeping back over the graded dirt, thickest at the edge
        const k = Math.min(1, Math.max(0, (e - BLEND_IN + 3) / (3 - BLEND_IN))) * roadSide;
        if (rnd() > k * k) continue;
        ctx.fillStyle = rnd() < 0.7 ? straw(0.28 + rnd() * 0.35) : olive(0.25 + rnd() * 0.3);
        ctx.beginPath();
        ctx.ellipse(X(u), Y(v), (0.18 + rnd() * 0.3) * px, (0.14 + rnd() * 0.22) * px, rnd() * Math.PI, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // outside: dust and bare patches in the grass, thinning outward
        const k = (1 - Math.min(1, e / (BLEND_OUT + 2))) * roadSide;
        if (rnd() > k * k * 1.4) continue;
        ctx.fillStyle = bare(0.2 + rnd() * 0.3);
        ctx.beginPath();
        ctx.ellipse(X(u), Y(v), (0.35 + rnd() * 0.7) * px, (0.25 + rnd() * 0.5) * px, rnd() * Math.PI, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
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
