/**
 * BRICK WARS -- capital ships and large hardware.
 *
 * Every model here is brick-built with the `Bricks` builder and collapsed by
 * `build()` into a handful of merged meshes, so a 3000-element star destroyer
 * still costs about six draw calls. Nothing calls Math.random(): all scatter
 * comes from `hash11`, so the models are byte-identical on every worker of the
 * offline renderer.
 *
 * SHARED CONVENTIONS
 * ------------------
 *   +z is forward (the pointy end), +y is up, +x is starboard.
 *   Builder coordinates are LEGO units: x/z in studs, y in plates.
 *   1 stud = 1.0 world unit, 1 plate = 0.4 world units, so a vertical distance
 *   measured in studs must be multiplied by 2.5 to become plates -- `PL()`.
 *
 * Every factory returns a THREE.Group whose userData carries attachment
 * metadata in **model-local world units**:
 *
 *   enginePoints  THREE.Vector3[]   nozzle mouths, for `Thruster`
 *   gunPoints     THREE.Vector3[]   turret muzzles, for `BoltPool`
 *   triangles     number            merged triangle count
 *   size          THREE.Vector3     bounding-box size in studs
 */
import * as THREE from 'three';
import { Bricks, PITCH, PLATE } from '../engine/brick.js';
import { COLORS, KIT } from '../engine/palette.js';
import { hash11 } from '../engine/rng.js';
import { svgTexture } from '../engine/svg.js';
import * as ease from '../engine/ease.js';

// ---------------------------------------------------------------------------
// Unit helpers
// ---------------------------------------------------------------------------

/** Vertical distance in studs -> plates (the builder's y unit). */
const PL = (studs) => (studs * PITCH) / PLATE;

/** LEGO-unit position -> world-unit Vector3. */
const LU = (x, y, z) => new THREE.Vector3(x * PITCH, y * PLATE, z * PITCH);

const linear = (u) => u;

/** Piecewise profile through [z, halfWidth] keys. */
function profile(keys, easeFn = ease.smooth) {
  return (z) => ease.track(keys, z, easeFn);
}

// ---------------------------------------------------------------------------
// Swept-plate helpers
//
// A long tapering hull is built the way a real set builds one: rectangular
// plates stepping in width, with wedge plates filling every step so the flank
// reads as one straight sweep instead of a staircase.
// ---------------------------------------------------------------------------

// Which corner of the footprint holds the wedge's right angle, per `rot`.
const CORNER_ROT = { x0z0: 0, x1z0: 1, x1z1: 2, x0z1: 3 };

/**
 * Right-triangular plate filling exactly x:[x0,x1] * z:[z0,z1].
 * `corner` names the square corner. The builder's rot=1/3 rotate the geometry
 * but not the anchor, so those two cases need their dimensions swapped.
 */
function wedgeFill(b, x0, x1, z0, z1, y, h, color, corner, opts = {}) {
  const rot = CORNER_ROT[corner];
  const w = x1 - x0;
  const d = z1 - z0;
  if (w <= 1e-4 || d <= 1e-4) return;
  if (rot === 0 || rot === 2) {
    b.wedge(x0, y, z0, w, d, h, color, { ...opts, rot });
  } else {
    b.wedge((x0 + x1) / 2 - d / 2, y, (z0 + z1) / 2 - w / 2, d, w, h, color, { ...opts, rot });
  }
}

/**
 * One horizontal course of hull: a flat slab running z0..z1 whose half-width
 * follows `halfWAt(z)`.
 *
 * @param {function} [o.hAt]    height in plates as a function of z (nose ramps)
 * @param {function} [o.yAt]    bottom y in plates as a function of z
 * @param {function} [o.gapAt]  half-width of a centre gap (hangar recesses)
 */
function taperedSlab(b, o) {
  const { z0, z1, halfWAt, h, color, step = 4, opts = {}, hAt = null, yAt = null, gapAt = null } = o;
  const n = Math.max(1, Math.round((z1 - z0) / step));
  const dz = (z1 - z0) / n;
  for (let i = 0; i < n; i++) {
    const za = z0 + i * dz;
    const zb = za + dz;
    const zm = (za + zb) / 2;
    const hh = hAt ? hAt(zm) : h;
    const y = yAt ? yAt(zm) : o.y;
    if (hh <= 0.06) continue;
    const wa = Math.max(0, halfWAt(za));
    const wb = Math.max(0, halfWAt(zb));
    const wIn = Math.min(wa, wb);
    const wOut = Math.max(wa, wb);
    if (wIn > 0.06) {
      const gap = gapAt ? Math.max(0, gapAt(zm)) : 0;
      if (gap > 0 && wIn > gap + 0.5) {
        b.box(gap, y, za, wIn - gap, dz, hh, color, opts);
        b.box(-wIn, y, za, wIn - gap, dz, hh, color, opts);
      } else {
        b.box(-wIn, y, za, wIn * 2, dz, hh, color, opts);
      }
    }
    if (wOut - wIn > 0.04) {
      const wideAft = wa > wb;
      wedgeFill(b, wIn, wOut, za, zb, y, hh, color, wideAft ? 'x0z0' : 'x0z1', opts);
      wedgeFill(b, -wOut, -wIn, za, zb, y, hh, color, wideAft ? 'x1z0' : 'x1z1', opts);
    }
  }
}

/**
 * A stack of courses = one rounded hull section. `courses` gives each course a
 * bottom y, a height and a width factor, which together shape the cross
 * section (0.45 at the keel, 1.0 amidships, 0.6 at the spine reads as a tube).
 * `grow` widens every course, which is how the raised drive rings are made.
 * `vAt(z)` scales the whole section vertically about y = 0, which is what gives
 * a hull a waisted side profile instead of a constant-depth loaf.
 */
function hullSection(b, o) {
  const { z0, z1, halfWAt, courses, color, step = 3, opts = {}, grow = 0, gapAt = null, pad = 0, vAt = null } = o;
  for (const c of courses) {
    taperedSlab(b, {
      z0,
      z1,
      y: c.y - pad,
      h: c.h + pad * 2,
      color: c.color ?? color,
      step,
      halfWAt: (z) => halfWAt(z) * c.f + grow,
      yAt: vAt ? (z) => c.y * vAt(z) - pad : null,
      hAt: vAt ? (z) => c.h * vAt(z) + pad * 2 : null,
      opts: { studs: false, ...opts, ...(c.opts || {}) },
      gapAt,
    });
  }
}

/**
 * Studded deck plates snapped to the stud grid and inset from the hull edge,
 * so the sweeping tapered border stays smooth while the middle shows studs.
 * Slab courses are never studded directly: their fractional widths would put
 * the studs on a different grid in every slice.
 */
function deck(b, o) {
  const { z0, z1, y, halfWAt, color, tile = 4, inset = 1, maxHalf = Infinity, gap = 0, vAt = null, opts = {} } = o;
  for (let z = Math.ceil(z0); z + tile <= z1; z += tile) {
    const w = Math.floor(Math.min(halfWAt(z), halfWAt(z + tile), maxHalf) - inset);
    if (w < 1) continue;
    const yy = vAt ? y * Math.min(vAt(z), vAt(z + tile)) : y;
    if (gap > 0 && w > gap + 1) {
      b.plate(gap, yy, z, w - gap, tile, color, opts);
      b.plate(-w, yy, z, w - gap, tile, color, opts);
    } else {
      b.plate(-w, yy, z, w * 2, tile, color, opts);
    }
  }
}

/**
 * A band hugging both flanks -- hull stripes, rub rails, greeble runs. Each
 * segment is rotated to follow the local taper so the band stays continuous.
 */
function flankBand(b, o) {
  const { z0, z1, halfWAt, y, h, color, step = 3, thickness = 0.55, out = 0, vAt = null, opts = {} } = o;
  const n = Math.max(1, Math.round((z1 - z0) / step));
  const dz = (z1 - z0) / n;
  for (let i = 0; i < n; i++) {
    const za = z0 + i * dz;
    const zb = za + dz;
    const wa = halfWAt(za);
    const wb = halfWAt(zb);
    if (Math.min(wa, wb) < 0.4) continue;
    const theta = Math.atan2(wb - wa, dz);
    const len = Math.hypot(dz, wb - wa) + 0.05;
    const mx = (wa + wb) / 2 + out;
    const mz = (za + zb) / 2;
    const v = vAt ? vAt(mz) : 1;
    for (const s of [1, -1]) {
      b.push();
      b.translate(s * mx, 0, mz);
      b.rotateY(s > 0 ? theta : -theta);
      b.box(-thickness / 2, y * v, -len / 2, thickness, len, h * v, color, { studs: false, ...opts });
      b.pop();
    }
  }
}

/**
 * Deterministic hull greeble: little plates, tiles and cylinders scattered
 * across a z-range and clipped to the hull plan. Mirrored port/starboard so it
 * reads as engineering rather than noise.
 */
function greeble(b, o) {
  const {
    z0, z1, halfWAt, seed = 1, n = 40, inset = 1.2,
    colors = [COLORS.darkBluishGray, COLORS.flatSilver, COLORS.lightBluishGray],
    maxW = 3, maxD = 5, h = 2, cylChance = 0.22, symmetric = true,
    centreBias = 0, yAt = null, opts = {},
  } = o;
  for (let i = 0; i < n; i++) {
    const z = Math.round(z0 + hash11(i, seed) * (z1 - z0));
    const y = yAt ? yAt(z) : o.y;
    const hw = halfWAt(z) - inset;
    if (hw < 1.2) continue;
    const w = 1 + Math.floor(hash11(i, seed + 31) * maxW);
    const d = 1 + Math.floor(hash11(i, seed + 61) * maxD);
    let u = hash11(i, seed + 97) * 2 - 1;
    if (centreBias > 0) u = Math.sign(u) * Math.pow(Math.abs(u), 1 + centreBias);
    const x = Math.round(u * Math.max(0, hw - w / 2));
    const c = colors[Math.floor(hash11(i, seed + 131) * colors.length) % colors.length];
    const hh = 1 + Math.floor(hash11(i, seed + 163) * h);
    const round = hash11(i, seed + 197) < cylChance;
    const place = (px) => {
      if (round) b.cyl(px, y, z + d / 2, Math.min(w, d) * 0.45, hh, c, { segments: 8, ...opts });
      else b.box(px - w / 2, y, z, w, d, hh, c, { studs: false, ...opts });
    };
    place(x);
    if (symmetric && Math.abs(x) > w * 0.55) place(-x);
  }
}

// ---------------------------------------------------------------------------
// Round-element helpers
// ---------------------------------------------------------------------------

/**
 * Cylinder lying along z, centred at (x,y,z) in LEGO units, `len` in studs.
 * `opts.rTop` is the radius at the +z end.
 */
function tubeZ(b, x, y, z, r, len, color, opts = {}) {
  const h = PL(len);
  b.cyl(x, y - h / 2, z, r, h, color, { segments: 14, ...opts, rot: [Math.PI / 2, 0, 0] });
}

/** Cylinder lying along x, centred at (x,y,z). `opts.rTop` is at the -x end. */
function tubeX(b, x, y, z, r, len, color, opts = {}) {
  const h = PL(len);
  b.cyl(x, y - h / 2, z, r, h, color, { segments: 14, ...opts, rot: [0, 0, Math.PI / 2] });
}

/**
 * One engine nozzle firing aft: a flared bell with a recessed dark throat and
 * a glowing disc. The mouth sits on the plane z = zMouth and the bell reaches
 * forward into the hull. Returns the mouth centre in world units.
 */
function engineBell(b, x, y, zMouth, r, o = {}) {
  const shell = o.shell ?? COLORS.darkBluishGray;
  const liner = o.liner ?? COLORS.trueBlack;
  const glow = o.glow ?? KIT.engineBlue;
  const len = o.len ?? r * 1.5;
  const seg = o.segments ?? (r > 5 ? 20 : 14);
  // flared bell: wide at the mouth (-z), narrow at the throat (+z)
  tubeZ(b, x, y, zMouth + len / 2, r, len, shell, { segments: seg, rTop: r * 0.6 });
  // dark liner, proud of the mouth so the throat reads as a recess
  tubeZ(b, x, y, zMouth + len * 0.28, r * 0.8, len * 0.6, liner, { segments: seg, rTop: r * 0.46 });
  // glowing disc down the throat
  tubeZ(b, x, y, zMouth + len * 0.16, r * 0.54, len * 0.28, glow, {
    segments: seg,
    rTop: r * 0.36,
    finish: 'glow',
    emissive: glow,
    emissiveIntensity: o.emissive ?? 1.7,
  });
  // collar ring around the bell mouth
  b.torus(x, y, zMouth + 0.35, r * 1.02, r * 0.09, o.collar ?? COLORS.flatSilver, {
    rot: [0, 0, 0],
    seg: Math.max(10, seg - 4),
  });
  return LU(x, y, zMouth - 0.2);
}

/**
 * Push a frame whose +y axis points out of a sphere of radius `r` at the given
 * longitude/latitude, so tangent surface detail can be laid down with ordinary
 * plate calls. Caller must `b.pop()`.
 */
function surfaceFrame(b, lon, lat, r) {
  b.push();
  b.rotateY(lon);
  b.rotateX(-lat);
  b.translateWorld(0, 0, r * PITCH);
  b.rotateX(Math.PI / 2);
}

/** Unit direction for a longitude/latitude, matching `surfaceFrame`. */
function sphereDir(lon, lat) {
  return new THREE.Vector3(
    Math.cos(lat) * Math.sin(lon),
    Math.sin(lat),
    Math.cos(lat) * Math.cos(lon)
  );
}

/** Longitude/latitude of a unit vector, inverse of `sphereDir`. */
function dirToLonLat(d) {
  return { lon: Math.atan2(d.x, d.z), lat: Math.asin(THREE.MathUtils.clamp(d.y, -1, 1)) };
}

/**
 * Sphere shell with a conical hole cut through it, so a crater can be genuinely
 * recessed rather than buried under a closed hull. A triangle survives only if
 * all three of its corners lie outside the cone, which guarantees the ragged
 * lat/long seam always sits *outside* `half` and can be covered by a collar.
 */
function punchedSphere(rStuds, wSeg, hSeg, phi, phiLen, axis, half) {
  const g = new THREE.SphereGeometry(rStuds * PITCH, wSeg, hSeg, 0, Math.PI * 2, phi, phiLen);
  if (!axis) return g;
  const pos = g.attributes.position;
  const src = g.index.array;
  const cosHalf = Math.cos(half);
  const keep = [];
  const v = new THREE.Vector3();
  for (let i = 0; i < src.length; i += 3) {
    let outside = 0;
    for (let k = 0; k < 3; k++) {
      v.fromBufferAttribute(pos, src[i + k]).normalize();
      if (v.dot(axis) <= cosHalf) outside++;
    }
    if (outside === 3) keep.push(src[i], src[i + 1], src[i + 2]);
  }
  g.setIndex(keep);
  return g;
}

// ---------------------------------------------------------------------------
// Turbolaser turret -- shared by the tower, the corvette and the destroyer
// ---------------------------------------------------------------------------

const TURRET = { baseH: 4, yawY: 4, pitchY: 5, barrelLen: 6 };

/** Fixed pedestal. Local origin sits on the mounting surface, +z forward. */
function turretBase(b, o = {}) {
  const hull = o.hull ?? COLORS.lightBluishGray;
  const dark = o.dark ?? COLORS.darkBluishGray;
  b.cyl(0, 0, 0, 3.1, 1, dark, { segments: 12 });
  b.cyl(0, 1, 0, 2.7, 2, hull, { segments: 12 });
  b.cyl(0, 3, 0, 2.2, 1, dark, { segments: 12, stud: false });
  // four ammunition boxes around the pedestal
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    b.push();
    b.rotateY(a);
    b.box(-0.7, 1, 2.0, 1.4, 1.1, 3, dark, { studs: false });
    b.pop();
  }
  return b;
}

/** Rotating yoke: sits at y = TURRET.yawY, spins about its own y axis. */
function turretYoke(b, o = {}) {
  const hull = o.hull ?? COLORS.lightBluishGray;
  const dark = o.dark ?? COLORS.darkBluishGray;
  b.cyl(0, 0, 0, 2.4, 1, dark, { segments: 12 });
  b.box(-2.3, 1, -2.2, 4.6, 3.6, 3, hull, { studs: false });
  b.plate(-2, 4, -2, 4, 3, hull);
  // uprights carrying the trunnion
  for (const s of [-1, 1]) {
    b.box(s * 1.5 - 0.55, 4, -0.6, 1.1, 2.2, 5, hull, { studs: false });
    b.cyl(s * 1.5, 8, 0.5, 0.6, 1, COLORS.flatSilver, { segments: 10, rot: [Math.PI / 2, 0, 0] });
  }
  // rear counterweight
  b.box(-1.4, 4, -3.1, 2.8, 1.2, 4, dark, { studs: false });
  return b;
}

/** Twin barrels. Origin is the trunnion; the barrels run along +z. */
function turretBarrels(b, o = {}) {
  const hull = o.hull ?? COLORS.lightBluishGray;
  const dark = o.dark ?? COLORS.darkBluishGray;
  const len = o.len ?? TURRET.barrelLen;
  b.box(-1.6, -1.4, -2.4, 3.2, 4.2, 4, hull, { studs: false });
  b.box(-1.1, 2.8, -2.0, 2.2, 3.0, 1, dark, { studs: false });
  const muzzles = [];
  for (const s of [-1, 1]) {
    tubeZ(b, s * 0.85, 0, 1.6 + len / 2, 0.44, len, dark, { segments: 10, rTop: 0.38 });
    tubeZ(b, s * 0.85, 0, 1.9, 0.62, 1.6, COLORS.flatSilver, { segments: 10 });
    tubeZ(b, s * 0.85, 0, 1.6 + len - 0.5, 0.52, 1.1, COLORS.flatSilver, { segments: 10 });
    muzzles.push(LU(s * 0.85, 0, 1.6 + len + 0.2));
  }
  return muzzles;
}

/**
 * Merge a whole turret into another builder at the current transform, posed at
 * a fixed yaw/pitch. Returns the muzzle points in that builder's local space.
 */
function mergeTurret(host, { yaw = 0, pitch = -0.25, scale = 1, colors = {}, len } = {}) {
  const muzzles = [];
  host.push();
  host.scale(scale);
  const base = new Bricks({ studSegments: 8 });
  turretBase(base, colors);
  host.merge(base);
  host.push();
  host.translate(0, TURRET.yawY, 0);
  host.rotateY(yaw);
  const yoke = new Bricks({ studSegments: 8 });
  turretYoke(yoke, colors);
  host.merge(yoke);
  host.push();
  host.translate(0, 8, 0.5);
  host.rotateX(pitch);
  const barrels = new Bricks({ studSegments: 8 });
  const local = turretBarrels(barrels, { ...colors, len });
  host.merge(barrels);
  const m = host.matrix.clone();
  for (const p of local) muzzles.push(p.clone().applyMatrix4(m));
  host.pop();
  host.pop();
  host.pop();
  return muzzles;
}

// ---------------------------------------------------------------------------
// Common finishing
// ---------------------------------------------------------------------------

function finish(group, extra = {}) {
  group.updateWorldMatrix(true, true);
  const box = new THREE.Box3().setFromObject(group);
  const size = new THREE.Vector3();
  box.getSize(size);
  let tris = 0;
  group.traverse((n) => {
    if (n.isMesh && n.geometry?.attributes?.position) {
      const per = n.geometry.attributes.position.count / 3;
      tris += per * (n.isInstancedMesh ? n.count : 1);
    }
  });
  Object.assign(group.userData, { triangles: Math.round(tris), size, box }, extra);
  return group;
}

// ===========================================================================
// 1. CORVETTE  --  rebel blockade runner (CR90 "Tantive IV")
// ===========================================================================

/**
 * ORIENTATION: +z forward. The hammerhead command tower is at +z, the drive
 * drum and its eleven bells at -z. Origin is amidships; y = 0 is the vertical
 * centre of the hull. About 60 studs long, 19 wide, 12 tall.
 */
export async function buildCorvette(opts = {}) {
  const hull = opts.hull ?? COLORS.white;
  const trim = opts.trim ?? COLORS.red;
  const dark = opts.dark ?? COLORS.darkBluishGray;
  const metal = opts.metal ?? COLORS.flatSilver;
  const glass = opts.glass ?? COLORS.transLightBlue;

  const b = new Bricks({ studSegments: 8 });
  const Z_AFT = -27;
  const Z_FWD = 29.5;

  // Plan half-width. Fat at the drive, long taper amidships, then a narrow
  // neck that flares hard into the hammerhead.
  const plan = profile([
    [-27, 7.2], [-25, 8.2], [-20, 8.4], [-16, 8.0], [-10, 6.9], [-2, 5.9],
    [6, 4.9], [11, 3.7], [15.5, 3.0], [17, 3.6], [18.5, 7.4], [20, 9.6],
    [25, 9.5], [27.5, 8.4], [29.5, 5.2],
  ]);
  // Vertical scale of the whole cross section: deep at the drive, waisted at
  // the neck, then flat and wide through the hammerhead.
  const vert = profile([
    [-27, 0.94], [-24, 1.0], [-17, 1.0], [-8, 0.93], [2, 0.82], [10, 0.68],
    [15.5, 0.58], [17.5, 0.6], [20, 0.68], [26, 0.68], [29.5, 0.48],
  ]);

  // Cross section: a flattened tube, 24 plates from keel to spine.
  const courses = [
    { y: -12, h: 3, f: 0.46 },
    { y: -9, h: 3, f: 0.73 },
    { y: -6, h: 3, f: 0.91 },
    { y: -3, h: 3, f: 0.99 },
    { y: 0, h: 3, f: 1.0 },
    { y: 3, h: 3, f: 0.97 },
    { y: 6, h: 3, f: 0.86 },
    { y: 9, h: 3, f: 0.62 },
  ];
  const spineF = 0.62;
  const spineY = (z) => 12 * vert(z);

  function shell() {
    hullSection(b, { z0: Z_AFT, z1: Z_FWD, halfWAt: plan, courses, color: hull, step: 2, vAt: vert });
    // keel plate, smooth like a real set's finished underside
    taperedSlab(b, {
      z0: Z_AFT, z1: Z_FWD, y: -13, h: 1, color: dark, step: 2,
      halfWAt: (z) => plan(z) * 0.34,
      yAt: (z) => -13 * vert(z),
      opts: { studs: false },
    });
  }

  function drive() {
    // Three raised rings around the drive drum, each a full course stack
    // grown outward so it stands proud of the white shell.
    for (const zr of [-25.6, -22.2, -18.8]) {
      hullSection(b, {
        z0: zr, z1: zr + 1.4, halfWAt: plan, courses, color: dark,
        step: 1.4, grow: 0.55, pad: 0.09, vAt: vert,
      });
    }
    // Aft bulkhead the bells are set into.
    hullSection(b, {
      z0: -27.4, z1: -26.4, halfWAt: plan, courses, color: dark, step: 1, grow: 0.2, pad: 0.09, vAt: vert,
    });
    // Radiator strakes down the flanks of the drum.
    flankBand(b, {
      z0: -26, z1: -15, halfWAt: (z) => plan(z) * 0.99, y: -5.5, h: 4,
      color: metal, step: 2, thickness: 0.7, out: 0.15, vAt: vert,
    });
    greeble(b, {
      z0: -26, z1: -15, y: 11.5, halfWAt: (z) => plan(z) * spineF, seed: 17, n: 26,
      colors: [dark, metal], maxW: 2, maxD: 3, h: 2, cylChance: 0.4, inset: 0.6,
    });
    greeble(b, {
      z0: -26, z1: -15, y: -13.6, halfWAt: (z) => plan(z) * 0.36, seed: 23, n: 12,
      colors: [dark, metal], maxW: 2, maxD: 3, h: 1, cylChance: 0.3, inset: 0.3,
    });
  }

  // Eleven bells: one big on the axis, two large abeam, four medium at the
  // corners and four small outboard -- the CR90's signature cluster.
  const enginePoints = [];
  function engines() {
    const bells = [
      [0, 0, 2.4],
      [-4.4, 0, 1.85], [4.4, 0, 1.85],
      [-2.2, PL(2.9), 1.25], [2.2, PL(2.9), 1.25],
      [-2.2, PL(-2.9), 1.25], [2.2, PL(-2.9), 1.25],
      [-6.2, PL(2.0), 0.95], [6.2, PL(2.0), 0.95],
      [-6.2, PL(-2.0), 0.95], [6.2, PL(-2.0), 0.95],
    ];
    for (const [x, y, r] of bells) {
      enginePoints.push(engineBell(b, x, y, -30.2, r, { shell: dark, collar: metal, len: r * 1.9 }));
    }
  }

  function topside() {
    // Studded spine deck, inset so the swept edge stays smooth.
    deck(b, {
      z0: -18, z1: 14, y: 12, halfWAt: (z) => plan(z) * spineF, color: hull, tile: 3, inset: 0.9, vAt: vert,
    });
    deck(b, {
      z0: 18.5, z1: 28, y: 12, halfWAt: (z) => plan(z) * 0.86, color: hull, tile: 3, inset: 1.6, vAt: vert,
    });
    // Sensor and comms clutter along the spine.
    greeble(b, {
      z0: -14, z1: 13, halfWAt: (z) => plan(z) * spineF, yAt: (z) => spineY(z) + 1, seed: 41, n: 34,
      colors: [dark, metal, COLORS.lightBluishGray], maxW: 2, maxD: 4, h: 2, cylChance: 0.35, inset: 0.7,
    });
    // Dorsal ridge running the length of the hull.
    taperedSlab(b, {
      z0: -18, z1: 16, h: 2, color: hull, step: 2,
      halfWAt: (z) => Math.min(1.5, plan(z) * 0.24),
      yAt: (z) => spineY(z), opts: { studs: false },
    });
    // Ventral sensor blister.
    b.cyl(0, -spineY(-2) - 1.4, -2, 2.2, 2, dark, { segments: 12 });
    b.cyl(0, -spineY(-2) - 2.9, -2, 1.4, 2, metal, { segments: 12 });
  }

  function bridge() {
    // Hammerhead command tower: two stepped decks with a wraparound viewport.
    const y0 = Math.round(spineY(23));
    b.box(-5, y0, 19.5, 10, 8, 3, hull, { studs: false });
    b.box(-4.4, y0 + 3, 20, 8.8, 7, 1, dark, { studs: false });
    b.box(-4.2, y0 + 4, 20.2, 8.4, 6.6, 3, hull, { studs: false });
    // viewport band -- front and both cheeks
    b.box(-3.6, y0 + 5, 26.5, 7.2, 0.6, 2, glass, { studs: false, finish: 'trans' });
    for (const s of [-1, 1]) {
      b.box(s * 4.2 - 0.3, y0 + 5, 21.2, 0.6, 5.3, 2, glass, { studs: false, finish: 'trans' });
    }
    b.plate(-4, y0 + 7, 20.5, 8, 6, hull);
    b.box(-2.6, y0 + 8, 21.5, 5.2, 4, 2, hull, { studs: false });
    b.plate(-2, y0 + 10, 22, 4, 3, dark);
    // antenna pair
    for (const s of [-1, 1]) {
      b.cyl(s * 1.4, y0 + 11, 23.5, 0.22, 5, metal, { segments: 8 });
      b.cyl(s * 1.4, y0 + 16, 23.5, 0.42, 1, COLORS.red, { segments: 8 });
    }
    b.cyl(0, y0 + 10, 25.6, 0.5, 2, metal, { segments: 8 });
    b.dish(0, y0 + 12, 25.6, 1.5, 2.0, metal, { segments: 16, rot: [-0.5, 0, 0] });
    // Hammerhead face: two small docking ports and a chin sensor pod.
    for (const s of [-1, 1]) {
      tubeZ(b, s * 6.4, 0, 28.0, 1.05, 2.0, dark, { segments: 12, rTop: 0.85 });
      tubeZ(b, s * 6.4, 0, 28.9, 0.55, 1.2, COLORS.trueBlack, { segments: 12 });
    }
    tubeZ(b, 0, -3.6, 28.2, 1.7, 3.2, dark, { segments: 14, rTop: 1.2 });
    tubeZ(b, 0, -3.6, 29.6, 0.95, 1.0, glass, { segments: 14, finish: 'trans' });
    // greeble on the hammerhead shoulders
    greeble(b, {
      z0: 19.5, z1: 28, halfWAt: (z) => plan(z), yAt: (z) => spineY(z), seed: 71, n: 24,
      colors: [dark, metal], maxW: 2, maxD: 3, h: 2, cylChance: 0.3, inset: 5.6,
    });
  }

  // Outer face of the red rail at a given z, in studs.
  const RAIL = { out: 0.3, thick: 0.95, halfH: 2.6 };
  const railFace = (z) => plan(z) + RAIL.out + RAIL.thick / 2 + 0.05;

  /**
   * The red flank stripe. The band itself is always brick-built -- a chunky
   * rail whose top face catches the key light, because a flat dark red decal
   * disappears against white ABS. When `svg/hull-rebel-stripe.svg` is present
   * its artwork (outline, register marks, chamfered leading end) is printed
   * onto the rail as a decal ribbon, exactly the way a set prints a tile.
   */
  async function stripe() {
    for (const seg of [[-26.5, 17.5, 2], [18, 29.2, 1.4]]) {
      flankBand(b, {
        z0: seg[0], z1: seg[1], halfWAt: plan, y: -RAIL.halfH, h: RAIL.halfH * 2,
        color: trim, step: seg[2], thickness: RAIL.thick, out: RAIL.out, vAt: vert,
      });
      flankBand(b, {
        z0: seg[0], z1: seg[1], halfWAt: plan, y: RAIL.halfH, h: 0.7,
        color: hull, step: seg[2], thickness: RAIL.thick - 0.1, out: RAIL.out - 0.04, vAt: vert,
      });
    }

    let tex = null;
    try {
      if (typeof document !== 'undefined') {
        tex = await svgTexture('svg/hull-rebel-stripe.svg', { w: 1024, h: 512 });
      }
    } catch {
      tex = null;
    }
    if (!tex) return null;

    // The artwork's band occupies rows 200..312 of a 512-tall canvas, so the
    // ribbon samples only that slice of the texture.
    const V0 = 312 / 512;
    const V1 = 200 / 512;
    const group = new THREE.Group();
    for (const s of [1, -1]) {
      const pos = [];
      const uv = [];
      const idx = [];
      // Only over the main hull: across the hammerhead flare the plan changes
      // too fast for a flat ribbon to stay flush with the stepped rail.
      const N = 100;
      const zA = -26.2;
      const zB = 16.4;
      for (let i = 0; i <= N; i++) {
        const u = i / N;
        const z = zA + u * (zB - zA);
        const x = s * railFace(z) * PITCH;
        const hy = RAIL.halfH * vert(z) * PLATE;
        pos.push(x, -hy, z * PITCH, x, hy, z * PITCH);
        uv.push(u, V0, u, V1);
        if (i < N) {
          const a = i * 2;
          if (s > 0) idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
          else idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
        }
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      geo.setIndex(idx);
      geo.computeVertexNormals();
      const mesh = new THREE.Mesh(
        geo,
        new THREE.MeshStandardMaterial({
          map: tex,
          transparent: true,
          roughness: 0.42,
          metalness: 0,
          polygonOffset: true,
          polygonOffsetFactor: -3,
          polygonOffsetUnits: -3,
        })
      );
      mesh.castShadow = false;
      mesh.receiveShadow = true;
      group.add(mesh);
    }
    return group;
  }

  const gunPoints = [];
  function turrets() {
    const mounts = [
      [0, spineY(-9) - 0.4, -9, 0, 0.42],
      [0, -spineY(-9) + 0.4, -9, 0, 0.42],
      [0, spineY(3) - 0.4, 3, 0, -0.3],
    ];
    for (const [x, y, z, yaw, pitch] of mounts) {
      b.push();
      b.translate(x, y, z);
      if (y < 0) b.rotateZ(Math.PI);
      const m = mergeTurret(b, {
        yaw,
        pitch,
        scale: 0.62,
        len: 5,
        colors: { hull, dark },
      });
      b.pop();
      for (const p of m) gunPoints.push(p);
    }
  }

  shell();
  drive();
  engines();
  topside();
  bridge();
  turrets();
  const decal = await stripe();

  const group = new THREE.Group();
  group.add(b.build());
  if (decal) group.add(decal);
  group.name = 'corvette';
  return finish(group, { enginePoints, gunPoints, parts: group.children[0].userData.parts });
}

// ===========================================================================
// 2. STAR DESTROYER  --  the Imperial wedge
// ===========================================================================

const SD = { len: 260, beam: 68, nose: 130 };
const sdPlan = (z) => Math.max(0, (SD.beam * (SD.nose - z)) / SD.len);

/**
 * ORIENTATION: +z forward (the point of the dagger), stern transom at
 * z = -130. Origin amidships, y = 0 at the hull's vertical centre.
 * About 260 studs long, 136 across the stern, 44 tall including the domes.
 *
 * The vast hull plates are unstudded -- studs are reserved for the
 * superstructure, where the camera actually gets close.
 */
export async function buildStarDestroyer(opts = {}) {
  const hull = opts.hull ?? COLORS.lightBluishGray;
  const dark = opts.dark ?? COLORS.darkBluishGray;
  const metal = opts.metal ?? COLORS.flatSilver;
  const glass = opts.glass ?? COLORS.transLightBlue;
  const shadow = opts.shadow ?? COLORS.trueBlack;

  const b = new Bricks({ studSegments: 6 });
  const AFT = -SD.nose;

  // Eight courses. Each is a triangle in plan that stops short of the nose,
  // so the wedge is razor thin at the bow and 21 units deep at the transom.
  const layers = [
    { y: -26, h: 6.5, apex: -14, f: 0.78 },
    { y: -19.5, h: 6.5, apex: 20, f: 0.85 },
    { y: -13, h: 6.5, apex: 50, f: 0.9 },
    { y: -6.5, h: 6.5, apex: 74, f: 0.945 },
    { y: 0, h: 6.5, apex: 94, f: 0.975 },
    { y: 6.5, h: 6.5, apex: 110, f: 0.995 },
    { y: 13, h: 6.5, apex: 122, f: 1.0 },
    { y: 19.5, h: 6.5, apex: 129, f: 0.985 },
  ];
  const TOP = 26;
  const KEEL = -26;

  // Ventral hangar recess, cut out of the two lowest courses.
  const HANGAR = { z0: -124, z1: -94, half: 17 };
  const hangarGap = (z) => (z > HANGAR.z0 && z < HANGAR.z1 ? HANGAR.half : 0);

  function primaryHull() {
    for (let i = 0; i < layers.length; i++) {
      const L = layers[i];
      taperedSlab(b, {
        z0: AFT,
        z1: L.apex,
        y: L.y,
        h: L.h,
        color: hull,
        step: 6.5,
        halfWAt: (z) => sdPlan(z) * L.f,
        hAt: (z) => L.h * ease.clamp((L.apex - z) / 18, 0, 1),
        gapAt: i < 2 ? hangarGap : null,
        opts: { studs: false },
      });
    }
    // Chamfer the top edge of the flanks with a thin dark rub strake, which is
    // what stops the huge grey slab from reading as a featureless plane.
    flankBand(b, {
      z0: AFT + 2, z1: 120, halfWAt: (z) => sdPlan(z) * 0.985, y: TOP - 1.2, h: 1.2,
      color: dark, step: 8, thickness: 1.1, out: 0.1,
    });
    flankBand(b, {
      z0: AFT + 2, z1: 108, halfWAt: (z) => sdPlan(z) * 0.995, y: 4, h: 2.4,
      color: dark, step: 8, thickness: 0.9, out: 0.12,
    });
  }

  function hangar() {
    const { z0, z1, half } = HANGAR;
    // lit ceiling of the bay
    b.box(-half, -13.4, z0, half * 2, z1 - z0, 1, shadow, { studs: false });
    b.box(-half + 2, -13.9, z0 + 3, (half - 2) * 2, z1 - z0 - 6, 0.6, COLORS.brightOrange, {
      studs: false, finish: 'glow', emissive: 0xff9a3c, emissiveIntensity: 1.4,
    });
    // ribbed side walls
    for (const s of [-1, 1]) {
      for (let z = z0 + 2; z < z1 - 1; z += 4) {
        b.box(s * half - (s > 0 ? 1.2 : 0), KEEL, z, 1.2, 2.2, 13, dark, { studs: false });
      }
    }
    // deck lip and door runners
    for (const s of [-1, 1]) {
      b.box(s * (half + 0.2) - (s > 0 ? 0 : 3), KEEL - 0.6, z0 - 1, 3, z1 - z0 + 2, 1.2, dark, { studs: false });
    }
    greeble(b, {
      z0: z0 + 2, z1: z1 - 2, y: -14.6, halfWAt: () => half - 1, seed: 311, n: 18,
      colors: [dark, metal], maxW: 3, maxD: 4, h: 2, cylChance: 0.3, inset: 1,
    });
  }

  function upperHull() {
    // Raised central mesa, then the superstructure block on top of it.
    taperedSlab(b, {
      z0: AFT, z1: 70, y: TOP, h: 5, color: hull, step: 7,
      halfWAt: (z) => sdPlan(z) * 0.6,
      hAt: (z) => 5 * ease.clamp((70 - z) / 20, 0, 1),
      opts: { studs: false },
    });
    taperedSlab(b, {
      z0: AFT, z1: 40, y: 31, h: 5, color: hull, step: 7,
      halfWAt: (z) => sdPlan(z) * 0.44,
      hAt: (z) => 5 * ease.clamp((40 - z) / 18, 0, 1),
      opts: { studs: false },
    });
    // Long recessed trenches either side of the mesa.
    for (const s of [-1, 1]) {
      for (let z = AFT + 8; z < 60; z += 9) {
        const w = sdPlan(z);
        b.box(s * w * 0.72 - 1.6, TOP - 0.3, z, 3.2, 7, 0.9, dark, { studs: false });
      }
    }
  }

  function superstructure() {
    // A stepped ziggurat carrying a genuinely tall conning tower -- the ISD
    // silhouette lives or dies on how far the bridge stands off the hull.
    const blocks = [
      { z0: -122, z1: -50, half: 27, y: 36, h: 7 },
      { z0: -116, z1: -62, half: 21, y: 43, h: 7 },
      { z0: -112, z1: -78, half: 15.5, y: 50, h: 7 },
    ];
    for (const s of blocks) {
      b.box(-s.half, s.y, s.z0, s.half * 2, s.z1 - s.z0, s.h, hull, { studs: false });
      // stud the exposed ledge left by the block above, at the ends only
      for (const z of [s.z0 + 1, s.z1 - 4]) {
        b.plate(-s.half + 1, s.y + s.h, z, 8, 3, hull);
        b.plate(s.half - 9, s.y + s.h, z, 8, 3, hull);
      }
      // side buttresses
      for (const sx of [-1, 1]) {
        b.box(sx * s.half - (sx > 0 ? 1.4 : 0), s.y, s.z0 + 3, 1.4, s.z1 - s.z0 - 6, s.h - 1, dark, { studs: false });
      }
    }
    // conning tower neck
    b.box(-10.5, 57, -108, 21, 22, 13, hull, { studs: false });
    for (const sx of [-1, 1]) {
      b.box(sx * 10.5 - (sx > 0 ? 1.2 : 0), 58, -106, 1.2, 18, 11, dark, { studs: false });
    }
    // bridge deck, overhanging the neck, with its viewport band
    b.box(-13, 70, -110, 26, 26, 6, hull, { studs: false });
    b.box(-12.5, 71.5, -110.7, 25, 0.8, 3, glass, { studs: false, finish: 'trans' });
    for (const s of [-1, 1]) {
      b.box(s * 13 - 0.4, 71.5, -109, 0.8, 23, 3, glass, { studs: false, finish: 'trans' });
    }
    deck(b, { z0: -109, z1: -85, y: 76, halfWAt: () => 12, color: hull, tile: 4, inset: 1 });
    b.box(-9, 77, -107, 18, 20, 3, hull, { studs: false });
    b.plate(-7, 80, -105, 14, 16, dark);
    // deflector shield generator domes on outriggers either side of the bridge
    for (const s of [-1, 1]) {
      tubeX(b, s * 15, 74, -97, 2.2, 6, dark, { segments: 12 });
      b.cyl(s * 18.5, 66, -97, 3.6, 8, dark, { segments: 14 });
      b.torus(s * 18.5, 74, -97, 5.6, 0.9, dark, { seg: 16 });
      b.sphere(s * 18.5, 76, -97, 6.6, hull, { segments: 20 });
    }
    // conning masts
    b.cyl(0, 81, -101, 1.2, 9, metal, { segments: 10 });
    b.cyl(0, 90, -101, 2.2, 2, dark, { segments: 12 });
    b.cyl(0, 92, -101, 0.5, 7, metal, { segments: 8 });
    for (const s of [-1, 1]) {
      b.cyl(s * 5, 81, -95, 0.5, 12, metal, { segments: 8 });
      b.dish(s * 5, 93, -95, 2.4, 3, metal, { segments: 14, rot: [0.5, 0, 0] });
    }
    // greeble across the superstructure decks
    greeble(b, {
      z0: -120, z1: -52, y: 43, halfWAt: () => 26, seed: 501, n: 54,
      colors: [dark, metal, hull], maxW: 3, maxD: 5, h: 5, cylChance: 0.3, inset: 1.5,
    });
    greeble(b, {
      z0: -114, z1: -64, y: 50, halfWAt: () => 20, seed: 523, n: 38,
      colors: [dark, metal], maxW: 3, maxD: 4, h: 4, cylChance: 0.35, inset: 1.5,
    });
    greeble(b, {
      z0: -110, z1: -80, y: 57, halfWAt: () => 15, seed: 547, n: 26,
      colors: [dark, metal], maxW: 3, maxD: 4, h: 3, cylChance: 0.4, inset: 1.2,
    });
  }

  const enginePoints = [];
  function engines() {
    // Three great bells across the transom, four smaller below them.
    for (const [x, y, r] of [[0, 2, 8.6], [-19.5, 2, 8.6], [19.5, 2, 8.6]]) {
      enginePoints.push(engineBell(b, x, y, AFT - 4.5, r, { shell: dark, collar: metal, len: r * 1.5 }));
    }
    for (const [x, y, r] of [[-10.5, -15, 3.4], [10.5, -15, 3.4], [-32, -12, 3.0], [32, -12, 3.0]]) {
      enginePoints.push(engineBell(b, x, y, AFT - 3, r, { shell: dark, collar: metal, len: r * 1.7 }));
    }
    // Transom face: a dense band of machinery either side of the engines.
    for (const s of [-1, 1]) {
      for (let i = 0; i < 9; i++) {
        const x = s * (38 + i * 3.1);
        const h = 8 + Math.floor(hash11(i, 900 + (s > 0 ? 0 : 7)) * 22);
        b.box(x - 1.4, -20 + h * 0.1, AFT - 1.6, 2.8, 2.2, h, dark, { studs: false });
      }
    }
    b.box(-SD.beam * 0.79, KEEL + 1, AFT - 2.2, SD.beam * 1.58, 2.4, 3, dark, { studs: false });
    b.box(-SD.beam * 0.97, TOP - 4, AFT - 2.2, SD.beam * 1.94, 2.4, 3.4, dark, { studs: false });
  }

  const gunPoints = [];
  function turrets() {
    const mounts = [];
    for (const z of [-104, -68, -30, 12]) {
      for (const s of [-1, 1]) mounts.push([s * (sdPlan(z) * 0.9 - 4), TOP, z, s > 0 ? 0.5 : -0.5]);
    }
    // two heavy mounts flanking the superstructure
    for (const s of [-1, 1]) mounts.push([s * 34, 31, -90, s > 0 ? 0.9 : -0.9]);
    for (const [x, y, z, yaw] of mounts) {
      b.push();
      b.translate(x, y, z);
      const m = mergeTurret(b, { yaw, pitch: 0.35, scale: 1.5, len: 7, colors: { hull, dark } });
      b.pop();
      for (const p of m) gunPoints.push(p);
    }
  }

  function panelling() {
    // Heavy detail concentrated along the spine and the trailing edge, which
    // is what sells the scale: hundreds of tiny elements on a vast plate.
    greeble(b, {
      z0: AFT + 6, z1: 100, y: TOP, halfWAt: (z) => sdPlan(z) * 0.55, seed: 601, n: 150,
      colors: [dark, metal, hull], maxW: 4, maxD: 7, h: 3, cylChance: 0.24, inset: 2, centreBias: 0.5,
    });
    greeble(b, {
      z0: AFT + 4, z1: -20, y: TOP, halfWAt: (z) => sdPlan(z) * 0.97, seed: 631, n: 130,
      colors: [dark, metal, hull], maxW: 4, maxD: 6, h: 2, cylChance: 0.28, inset: 3,
    });
    greeble(b, {
      z0: -20, z1: 96, y: TOP, halfWAt: (z) => sdPlan(z) * 0.96, seed: 659, n: 90,
      colors: [dark, metal, hull], maxW: 3, maxD: 6, h: 2, cylChance: 0.24, inset: 3,
    });
    // underside plating
    greeble(b, {
      z0: AFT + 6, z1: 40, y: KEEL - 1.4, halfWAt: (z) => sdPlan(z) * 0.72, seed: 683, n: 90,
      colors: [dark, metal], maxW: 4, maxD: 7, h: 2, cylChance: 0.2, inset: 3,
    });
    // long panel seams down the top surface
    for (const s of [-1, 1]) {
      for (let z = AFT + 10; z < 100; z += 12) {
        const w = sdPlan(z);
        b.box(s * w * 0.34 - 0.6, TOP - 0.2, z, 1.2, 9, 0.7, dark, { studs: false });
        if (w > 20) b.box(s * w * 0.86 - 0.7, TOP - 0.2, z + 3, 1.4, 6, 0.7, dark, { studs: false });
      }
    }
    // Smooth tiled runway down the spine. Studs would cost 40k triangles here
    // and are invisible on a hull this long; they live on the tower instead.
    for (let z = -78; z < 60; z += 11) {
      b.box(-5, TOP + 0.5, z, 10, 9, 0.8, metal, { studs: false });
      b.box(-3.2, TOP + 1.3, z + 1, 6.4, 7, 0.7, dark, { studs: false });
    }
    // trailing-edge blocks
    for (let i = 0; i < 26; i++) {
      const x = -SD.beam + 1.5 + (i / 25) * (SD.beam * 2 - 3);
      const h = 3 + Math.floor(hash11(i, 733) * 5);
      const d = 4 + Math.floor(hash11(i, 751) * 7);
      b.box(x - 1.6, TOP, AFT + 1, 3.2, d, h, hash11(i, 769) > 0.5 ? dark : metal, { studs: false });
    }
  }

  primaryHull();
  hangar();
  upperHull();
  superstructure();
  engines();
  panelling();
  turrets();

  const group = new THREE.Group();
  const mesh = b.build();
  group.add(mesh);
  group.name = 'star-destroyer';
  return finish(group, { enginePoints, gunPoints, parts: mesh.userData.parts });
}

// ===========================================================================
// 3. ESCAPE POD
// ===========================================================================

/**
 * ORIENTATION: +z forward, nose cone at +z, retro thrusters at -z.
 * Origin at the centre of the body, y = 0 on the axis. About 8 studs long.
 */
export async function buildEscapePod(opts = {}) {
  const hull = opts.hull ?? COLORS.white;
  const dark = opts.dark ?? COLORS.darkBluishGray;
  const metal = opts.metal ?? COLORS.flatSilver;
  const glass = opts.glass ?? COLORS.transLightBlue;

  const b = new Bricks({ studSegments: 10 });
  const R = 2.2;

  function body() {
    tubeZ(b, 0, 0, -0.6, R, 5.0, hull, { segments: 20 });
    // Ribbing is confined to the aft two thirds: the hoops all sit on the
    // constant-radius section so none floats clear of the nose taper, and the
    // forward bay is left smooth for the viewports.
    for (const z of [-2.9, -2.1, -1.3, -0.5]) {
      b.torus(0, 0, z, R + 0.06, 0.19, dark, { rot: [0, 0, 0], seg: 20 });
    }
    // longitudinal strakes between the hoops
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + 0.26;
      b.push();
      b.rotateZ(a);
      b.box(-0.34, PL(R - 0.12), -3.0, 0.68, 2.7, 0.7, metal, { studs: false });
      b.pop();
    }
  }

  function nose() {
    // The cone starts a touch inside the body so the butt joint under the
    // forward hoop can never open into a gap. rot +x/2 turns the hemisphere so
    // its dome faces forward.
    tubeZ(b, 0, 0, 2.55, R, 1.5, hull, { segments: 20, rTop: R * 0.55 });
    tubeZ(b, 0, 0, 3.4, R * 0.55, 0.35, dark, { segments: 20, rTop: R * 0.52 });
    b.sphere(0, 0, 3.5, R * 0.55, hull, { segments: 18, phiLen: Math.PI / 2, rot: [Math.PI / 2, 0, 0] });
    // sensor nub on the tip
    b.cyl(0, 0, 4.6, 0.22, 0.7, metal, { segments: 8, rot: [Math.PI / 2, 0, 0] });
  }

  function viewport() {
    // Main port on the upper forward hull. Its axis is the hull normal rather
    // than a rake, so the collar seats cleanly instead of slicing the nose.
    b.cyl(0, PL(R - 0.45), 1.2, 1.15, PL(0.85), dark, { segments: 16 });
    b.cyl(0, PL(R + 0.05), 1.2, 0.86, PL(0.4), glass, { segments: 16, finish: 'trans' });
    // a matching port on each flank
    for (const s of [-1, 1]) {
      b.push();
      b.rotateZ(s * Math.PI / 2);
      b.cyl(0, PL(R - 0.35), -0.6, 0.95, PL(0.7), dark, { segments: 14 });
      b.cyl(0, PL(R + 0.05), -0.6, 0.68, PL(0.35), glass, { segments: 14, finish: 'trans' });
      b.pop();
    }
  }

  const enginePoints = [];
  function retros() {
    tubeZ(b, 0, 0, -3.35, R * 0.98, 1.0, dark, { segments: 20 });
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const x = Math.cos(a) * 1.15;
      const y = PL(Math.sin(a) * 1.15);
      enginePoints.push(engineBell(b, x, y, -3.95, 0.62, { shell: dark, collar: metal, len: 1.5, segments: 12 }));
    }
    b.cyl(0, 0, -4.0, 0.5, 0.5, metal, { segments: 12, rot: [Math.PI / 2, 0, 0] });
    // grab handles and a beacon
    for (const s of [-1, 1]) {
      b.push();
      b.rotateZ(s * 1.05);
      b.box(-0.28, PL(R - 0.05), -2.5, 0.56, 1.0, 1.6, dark, { studs: false });
      b.pop();
    }
    b.cyl(0, PL(R - 0.15), 0.4, 0.34, 1.2, COLORS.transRed, {
      segments: 10, finish: 'glow', emissive: 0xff3322, emissiveIntensity: 1.8,
    });
  }

  body();
  nose();
  viewport();
  retros();

  const group = new THREE.Group();
  const mesh = b.build();
  group.add(mesh);
  group.name = 'escape-pod';
  return finish(group, { enginePoints, gunPoints: [], parts: mesh.userData.parts });
}

// ===========================================================================
// 4. DEATH STAR
// ===========================================================================

/**
 * ORIENTATION: the battle station has no bow, so +z is simply the direction
 * the superlaser leans toward. Origin at the centre of the sphere; the
 * equatorial trench lies in the y = 0 plane.
 *
 * @param {number} [opts.radius=60]
 * @param {number} [opts.detail=1]  scales the amount of surface panelling
 * @param {boolean} [opts.lit]      add emissive window specks
 */
export async function buildDeathStar(opts = {}) {
  const R = opts.radius ?? 60;
  const detail = opts.detail ?? 1;
  const hull = opts.hull ?? COLORS.lightBluishGray;
  const dark = opts.dark ?? COLORS.darkBluishGray;
  const metal = opts.metal ?? COLORS.flatSilver;
  const greys = [hull, dark, metal, COLORS.lightBluishGray, COLORS.darkBluishGray];

  const b = new Bricks({ studSegments: 6 });
  const seg = Math.max(24, Math.round(R * 0.9));
  const trench = 0.055; // half-angle of the equatorial band, radians
  const trenchR = R * 0.945;
  const yLip = R * Math.sin(trench);

  // The superlaser crater. `rim` is the radius of the hole in the hull, `floorR`
  // the radius of the dish at the bottom of it, and `collar` the outer edge of
  // the stepped ring that covers the punched seam.
  const DISH = { lon: 0.62, lat: 0.6 };
  const CRATER = {
    rim: R * 0.28,
    floorR: R * 0.2,
    depth: R * 0.17,
    collar: R * 0.42,
  };
  CRATER.cut = Math.asin(CRATER.rim / R);
  const dishDir = sphereDir(DISH.lon, DISH.lat);
  /** Height above the sphere centre, in studs, of a point at lateral `rho`. */
  const yOn = (rad, rho) => Math.sqrt(Math.max(0, rad * rad - rho * rho));
  const yRim = yOn(R, CRATER.rim);
  const yFloor = yRim - CRATER.depth;

  function sphereShell() {
    // Two caps with the equatorial trench cut between them. The northern cap
    // also has the superlaser crater cut out of it.
    b.addGeometry(punchedSphere(R, seg, seg, 0, Math.PI / 2 - trench, dishDir, CRATER.cut), {
      color: hull,
    });
    b.sphere(0, 0, 0, R, hull, { segments: seg, phi: Math.PI / 2 + trench, phiLen: Math.PI / 2 - trench });
    // trench floor and its two sloped walls
    b.cyl(0, PL(-yLip), 0, trenchR, PL(yLip * 2), dark, { segments: seg });
    b.cone(0, PL(yLip - 0.02), 0, trenchR, R * 0.999, PL(R * 0.028), hull);
    b.cone(0, PL(-yLip - R * 0.028 + 0.02), 0, R * 0.999, trenchR, PL(R * 0.028), hull);
  }

  function trenchDetail() {
    // Machinery in the trench, plus the lip rails above and below it.
    const n = Math.round(78 * detail);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + hash11(i, 21) * 0.04;
      const yy = (hash11(i, 37) - 0.5) * yLip * 1.1;
      const w = 0.6 + hash11(i, 53) * R * 0.028;
      const h = R * (0.012 + hash11(i, 71) * 0.03);
      b.push();
      b.rotateY(a);
      b.translateWorld(0, 0, trenchR * PITCH);
      b.box(-w, PL(yy), -0.6, w * 2, 1.2, PL(h), hash11(i, 89) > 0.55 ? metal : dark, { studs: false });
      if (hash11(i, 103) > 0.7) {
        b.cyl(0, PL(yy - h), 0.9, R * 0.012, PL(h * 2), dark, { segments: 8 });
      }
      b.pop();
    }
    for (const s of [-1, 1]) {
      b.torus(0, PL(s * yLip * 1.02), 0, R * 0.997, R * 0.008, dark, { seg: Math.min(64, seg) });
    }
  }

  function panels() {
    // Deterministic tangent panelling. A Fibonacci lattice keeps the coverage
    // even without any randomness at all.
    const n = Math.round(560 * detail);
    const golden = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < n; i++) {
      const sy = 1 - (i / (n - 1)) * 2;
      const lat = Math.asin(sy * 0.999);
      const lon = i * golden;
      if (Math.abs(sy) < Math.sin(trench) * 1.5) continue;
      // keep the superlaser crater clear
      const d = new THREE.Vector3(
        Math.cos(lat) * Math.sin(lon),
        Math.sin(lat),
        Math.cos(lat) * Math.cos(lon)
      );
      if (d.dot(dishDir) > Math.cos(Math.asin(CRATER.collar / R) + 0.05)) continue;

      const w = 2 + Math.floor(hash11(i, 211) * R * 0.1);
      const dd = 2 + Math.floor(hash11(i, 233) * R * 0.13);
      const c = greys[Math.floor(hash11(i, 257) * greys.length) % greys.length];
      surfaceFrame(b, lon, lat, R - 0.16);
      b.rotateY(hash11(i, 271) * Math.PI);
      const kind = hash11(i, 293);
      if (kind < 0.16) {
        b.cyl(0, -0.4, 0, Math.min(w, dd) * 0.4, 1 + Math.floor(hash11(i, 311) * 2), c, { segments: 8 });
      } else if (kind < 0.28) {
        b.cyl(0, -0.6, 0, Math.min(w, dd) * 0.5, 1.2, dark, { segments: 10 });
        b.cyl(0, 0.2, 0, Math.min(w, dd) * 0.3, 1, metal, { segments: 8 });
      } else {
        b.box(-w / 2, -0.5, -dd / 2, w, dd, kind > 0.78 ? 2 : 1, c, { studs: false });
        if (kind > 0.62) b.box(-w / 4, 0.5, -dd / 4, w / 2, dd / 2, 1, dark, { studs: false });
      }
      b.pop();
    }
  }

  function windows() {
    if (!opts.lit) return;
    const n = Math.round(120 * detail);
    const golden = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < n; i++) {
      const sy = 1 - ((i + 0.5) / n) * 2;
      const lat = Math.asin(sy * 0.999);
      const lon = i * golden * 1.61 + 0.7;
      if (Math.abs(sy) < Math.sin(trench) * 1.4) continue;
      surfaceFrame(b, lon, lat, R - 0.1);
      b.box(-0.35, -0.2, -0.9, 0.7, 1.8, 0.5, COLORS.transYellow, {
        studs: false, finish: 'glow', emissive: 0xffd98a, emissiveIntensity: 2.0,
      });
      b.pop();
    }
  }

  /**
   * The superlaser. Everything is a surface of revolution about the dish axis,
   * so it is built in a frame whose origin is the sphere centre and whose +y is
   * the dish normal -- then "height above the centre" is just local y and every
   * ring can be made to hug the hull exactly.
   */
  function superlaser() {
    const { rim, floorR, depth, collar } = CRATER;
    const SEG = 48;

    /**
     * Open cone frustum spanning two radii, each riding its own offset above
     * the hull, so a step can taper back down flush with the sphere.
     */
    const band = (rInner, rOuter, liftIn, liftOut, color) => {
      const yLo = yOn(R + liftOut, rOuter);
      const yHi = yOn(R + liftIn, rInner);
      b.cyl(0, PL(yLo), 0, rOuter, PL(yHi - yLo), color, {
        rTop: rInner, open: true, segments: SEG, side: THREE.DoubleSide,
      });
    };

    surfaceFrame(b, DISH.lon, DISH.lat, 0);

    // Crater wall: an outward-flaring funnel from the dish floor up through the
    // hole in the hull, double sided so the inside of the crater is visible.
    b.cyl(0, PL(yFloor), 0, floorR, PL(yRim - yFloor + 1.4), dark, {
      rTop: rim, open: true, segments: SEG, side: THREE.DoubleSide,
    });
    // Concave dish floor, and a ribbed collector ring just inside the wall.
    b.dish(0, PL(yFloor - depth * 0.42), 0, floorR, PL(depth * 0.42), dark, { segments: SEG });
    b.cyl(0, PL(yFloor - 0.4), 0, floorR * 1.02, PL(1.1), metal, {
      rTop: floorR * 0.96, open: true, segments: SEG, side: THREE.DoubleSide,
    });

    // Stepped collar hiding the punched seam: a wide lower step, a riser, and a
    // narrow upper lip that overhangs the crater mouth.
    const mid = rim + (collar - rim) * 0.55;
    band(mid, collar, 0.5, 0.15, hull);
    b.cyl(0, PL(yOn(R + 0.5, mid)), 0, mid, PL(yOn(R + 2.0, mid) - yOn(R + 0.5, mid)), dark, {
      open: true, segments: SEG, side: THREE.DoubleSide,
    });
    band(rim - 0.6, mid, 2.0, 2.0, hull);
    b.cyl(0, PL(yOn(R + 2.0, rim - 0.6) - 1.6), 0, rim - 0.6, PL(1.6), metal, {
      open: true, segments: SEG, side: THREE.DoubleSide,
    });

    // Focusing spar cross: four arms from the crater lip down to the emitter.
    const sparY = yFloor + depth * 0.62;
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
      b.bar(
        [0, sparY * PITCH, 0],
        [Math.cos(a) * rim * 0.99 * PITCH, (yRim + 0.5) * PITCH, Math.sin(a) * rim * 0.99 * PITCH],
        R * 0.014,
        metal
      );
    }
    // Eight tributary emitters standing on the dish floor.
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      const rr = floorR * 0.66;
      const yy = yFloor - depth * 0.42 + depth * 0.42 * Math.pow(0.66, 2);
      b.cyl(Math.cos(a) * rr, PL(yy), Math.sin(a) * rr, R * 0.02, PL(R * 0.03), metal, { segments: 10 });
      b.cyl(Math.cos(a) * rr, PL(yy + R * 0.03), Math.sin(a) * rr, R * 0.013, PL(R * 0.014), COLORS.transGreen, {
        segments: 10, finish: 'glow', emissive: 0x9dff7a, emissiveIntensity: 1.8,
      });
    }
    // Central emitter stack.
    const yEm = yFloor - depth * 0.42;
    b.cyl(0, PL(yEm), 0, floorR * 0.3, PL(depth * 0.55), dark, { segments: 18 });
    b.cyl(0, PL(yEm + depth * 0.55), 0, floorR * 0.2, PL(depth * 0.2), metal, { segments: 18 });
    b.cyl(0, PL(yEm + depth * 0.75), 0, floorR * 0.13, PL(R * 0.02), COLORS.transGreen, {
      segments: 18, finish: 'glow', emissive: 0x9dff7a, emissiveIntensity: 2.2,
    });
    b.pop();

    // Chunky greeble blocks bedded into the collar so the ring is not a plain
    // smooth donut. Each is placed tangent to the hull at its own lon/lat.
    const u = new THREE.Vector3(0, 1, 0).cross(dishDir).normalize();
    const w = new THREE.Vector3().crossVectors(dishDir, u).normalize();
    const p = new THREE.Vector3();
    const nBlock = Math.round(46 * detail);
    for (let i = 0; i < nBlock; i++) {
      const th = (i / nBlock) * Math.PI * 2;
      const ring = hash11(i, 401) > 0.5;
      const rho = ring ? mid + (collar - mid) * 0.5 : rim + (mid - rim) * 0.45;
      const alpha = Math.asin(THREE.MathUtils.clamp(rho / R, -1, 1));
      p.copy(dishDir).multiplyScalar(Math.cos(alpha));
      p.addScaledVector(u, Math.cos(th) * Math.sin(alpha));
      p.addScaledVector(w, Math.sin(th) * Math.sin(alpha));
      const { lon, lat } = dirToLonLat(p.normalize());
      surfaceFrame(b, lon, lat, R + (ring ? 0.5 : 2.0) - 0.1);
      b.rotateY(th + (ring ? 0 : Math.PI / 2));
      const ww = 2 + Math.floor(hash11(i, 419) * 3);
      const dd2 = 2 + Math.floor(hash11(i, 431) * 4);
      const shiny = hash11(i, 457) > 0.6;
      b.box(-ww / 2, 0, -dd2 / 2, ww, dd2, 1 + Math.floor(hash11(i, 443) * 3),
        shiny ? metal : dark, { studs: !shiny });
      b.pop();
    }
  }

  sphereShell();
  trenchDetail();
  panels();
  windows();
  superlaser();

  const group = new THREE.Group();
  const mesh = b.build();
  group.add(mesh);
  group.name = 'death-star';
  return finish(group, {
    radius: R,
    trenchY: 0,
    // The emitter at the bottom of the crater, plus the axis it fires along.
    dishCenter: dishDir.clone().multiplyScalar(yFloor * PITCH),
    dishNormal: dishDir.clone(),
    dishRadius: CRATER.rim * PITCH,
    enginePoints: [],
    gunPoints: [],
    parts: mesh.userData.parts,
  });
}

// ===========================================================================
// 5. SANDCRAWLER
// ===========================================================================

/**
 * ORIENTATION: +z forward -- the sloped bow with the loading ramp faces +z,
 * the tall vertical stern faces -z. Unlike the starships this is a ground
 * vehicle, so y = 0 is the ground the treads sit on, not the hull centre.
 * About 40 studs long, 22 wide, 17 tall.
 *
 * `userData.rollTracks(t)` drives the treads; it is a pure function of t.
 */
export async function buildSandcrawler(opts = {}) {
  const body = opts.body ?? COLORS.tan;
  const trim = opts.trim ?? COLORS.darkTan;
  const dark = opts.dark ?? COLORS.reddishBrown;
  const metal = opts.metal ?? COLORS.flatSilver;
  const grey = opts.grey ?? COLORS.darkBluishGray;
  const glass = opts.glass ?? COLORS.transYellow;

  const b = new Bricks({ studSegments: 8 });

  const FLOOR = 11; // plates: underside of the hull, sitting on the treads
  const ROOF = 43; // plates: top of the hull
  const HALF = 11; // studs: half-beam at the waist

  // The body is a trapezoidal wedge: the bow face leans forward as it rises
  // and the flanks tuck in, so the whole thing looks like it is nosing down
  // into the dune. Each entry is one course of the stack.
  const COURSES = [];
  for (let i = 0; i < 8; i++) {
    COURSES.push({
      y: FLOOR + i * 4,
      h: 4,
      z0: -15 - i * 0.5,
      z1: 12.6 + i * 0.8,
      w: HALF * (1 - i * 0.026),
    });
  }
  const BOW = COURSES[COURSES.length - 1].z1;
  const STERN = COURSES[COURSES.length - 1].z0;
  /** Plan half-width of a course, chamfered at its four corners. */
  const courseW = (c) => (z) => c.w * Math.max(0.8, Math.min(1, (z - c.z0) / 2.2, (c.z1 - z) / 2.2));
  /** Half-width of the widest course present at this z, for greeble clipping. */
  const planAt = (z) => {
    let w = 0;
    for (const c of COURSES) if (z > c.z0 && z < c.z1) w = Math.max(w, courseW(c)(z));
    return w;
  };

  function tub() {
    for (const c of COURSES) {
      taperedSlab(b, {
        z0: c.z0, z1: c.z1, y: c.y, h: c.h, color: body, step: 2.2,
        halfWAt: courseW(c), opts: { studs: false },
      });
    }
    // Studded roof, inset from the swept edge.
    deck(b, {
      z0: STERN + 1, z1: BOW - 1, y: ROOF, halfWAt: courseW(COURSES[7]), color: body, tile: 3, inset: 1.6,
    });
    // Belly skirt over the treads, and the bottom rub rail.
    const c0 = COURSES[0];
    b.box(-HALF - 0.6, FLOOR - 3, c0.z0 - 1, (HALF + 0.6) * 2, c0.z1 - c0.z0 + 2, 3, trim, { studs: false });
    b.box(-HALF - 1, FLOOR - 1.4, c0.z0 - 1.2, (HALF + 1) * 2, c0.z1 - c0.z0 + 2.4, 1.4, grey, { studs: false });
    // Stern face: heat exchangers and a capping cornice.
    for (let i = 0; i < 5; i++) {
      const x = -8 + i * 4;
      b.cyl(x, FLOOR + 3, STERN - 0.4, 1.5, PL(9), grey, { segments: 12, rot: [Math.PI / 2, 0, 0] });
      b.cyl(x, FLOOR + 3, STERN - 1.3, 1.05, PL(1.6), metal, { segments: 10, rot: [Math.PI / 2, 0, 0] });
    }
    b.box(-HALF + 1, FLOOR + 20, STERN - 1.1, (HALF - 1) * 2, 1.4, 14, trim, { studs: false });
    b.box(-HALF, ROOF - 2, STERN - 1.6, HALF * 2, 2.2, 3, trim, { studs: false });
  }

  function panels() {
    // Ribbed plating down both flanks.
    for (let z = STERN + 2; z < 11; z += 3.6) {
      for (const s of [-1, 1]) {
        const w = planAt(z + 1.2) - 0.2;
        b.box(s * w - (s > 0 ? 0 : 0.7), FLOOR + 2, z, 0.7, 2.8, 26, trim, { studs: false });
      }
    }
    // Horizontal belt lines.
    for (const y of [FLOOR + 13, FLOOR + 25]) {
      for (const s of [-1, 1]) {
        b.box(s * (HALF - 0.9) - (s > 0 ? 0 : 0.6), y, -14, 0.6, 26, 1.6, trim, { studs: false });
      }
    }
    greeble(b, {
      z0: STERN + 2, z1: 1, y: ROOF, halfWAt: (z) => planAt(z), seed: 907, n: 42,
      colors: [trim, grey, metal, dark], maxW: 3, maxD: 4, h: 3, cylChance: 0.35, inset: 1.8,
    });
    // dorsal hatches
    for (const z of [-14, -9, -4]) {
      b.plate(-3, ROOF, z, 6, 4, trim);
      b.box(-2, ROOF + 1, z + 0.5, 4, 3, 1, grey, { studs: false });
    }
    // crane arm over the stern roof
    b.cyl(-6.5, ROOF, -12, 1.0, 5, grey, { segments: 10 });
    b.bar([-6.5, (ROOF + 5) * PLATE, -12], [-6.5, (ROOF + 13) * PLATE, -7.5], 0.34, grey);
    b.bar([-6.5, (ROOF + 13) * PLATE, -7.5], [-6.5, (ROOF + 9) * PLATE, -7.5], 0.16, metal);
    b.cyl(-6.5, ROOF + 8, -7.5, 0.5, 1.4, grey, { segments: 8 });
    // exhaust stacks
    for (const s of [-1, 1]) {
      b.cyl(s * 7.5, ROOF, -16, 1.15, 7, grey, { segments: 12 });
      b.cyl(s * 7.5, ROOF + 7, -16, 1.4, 1.4, COLORS.trueBlack, { segments: 12 });
    }
  }

  function bridge() {
    // Command box jutting out of the top of the bow face.
    const z0 = 9;
    const z1 = 20.5;
    b.box(-5.4, ROOF - 9, z0, 10.8, z1 - z0 - 2, 9, trim, { studs: false });
    b.box(-4.8, ROOF, z0 + 0.5, 9.6, z1 - z0 - 1, 5, body, { studs: false });
    // wraparound viewports
    b.box(-4.4, ROOF + 1.2, z1 - 1.1, 8.8, 0.7, 3, glass, { studs: false, finish: 'trans' });
    for (const s of [-1, 1]) {
      b.box(s * 4.8 - 0.35, ROOF + 1.2, z0 + 1.4, 0.7, z1 - z0 - 3, 3, glass, { studs: false, finish: 'trans' });
    }
    b.plate(-4.6, ROOF + 5, z0 + 0.5, 9, 10, body);
    b.box(-2, ROOF + 6, z0 + 2, 4, 4, 1, grey, { studs: false });
    // sensor mast and dish
    b.cyl(3.4, ROOF + 6, z0 + 1.8, 0.28, 6, grey, { segments: 8 });
    b.dish(-2.4, ROOF + 6, z0 + 6.5, 1.7, 2.4, grey, { segments: 14 });
    // headlamps under the bridge overhang
    for (const s of [-1, 1]) {
      b.cyl(s * 4.2, ROOF - 6, z1 - 2.1, 0.85, PL(0.6), grey, { segments: 10, rot: [Math.PI / 2, 0, 0] });
      b.cyl(s * 4.2, ROOF - 6, z1 - 1.5, 0.6, PL(0.35), COLORS.transYellow, {
        segments: 10, rot: [Math.PI / 2, 0, 0], finish: 'glow', emissive: 0xffe08a, emissiveIntensity: 1.6,
      });
    }
  }

  // Loading ramp: hinged at the foot of the bow face so scenes can drop it.
  const RAMP = { len: 11, hingeZ: 12.8, hingeY: FLOOR - 1.5, up: -1.13, down: 0.3 };
  const ramp = new THREE.Group();
  function loadingRamp() {
    const rb = new Bricks({ studSegments: 8 });
    const w = 6.6;
    const len = RAMP.len;
    rb.box(-w, 0, 0, w * 2, len, 1.4, trim, { studs: false });
    for (let i = 1; i < 6; i++) {
      rb.box(-w + 0.7, 1.4, (i * len) / 6, w * 2 - 1.4, 0.9, 0.8, dark, { studs: false });
    }
    for (const s of [-1, 1]) {
      rb.box(s * w - (s > 0 ? 0.8 : 0), 1.4, 0.4, 0.8, len - 0.8, 2.4, trim, { studs: false });
    }
    rb.box(-w, 0, len - 0.9, w * 2, 0.9, 2.8, grey, { studs: false });
    rb.cyl(0, 1.4, len - 2.5, 1.0, 1, grey, { segments: 12 });
    ramp.add(rb.build());
    ramp.position.set(0, RAMP.hingeY * PLATE, RAMP.hingeZ * PITCH);
    // Doorway cut into the bow face: jambs, lintel and a dark interior.
    const lean = 0.8 / 4; // studs of forward lean per plate of height
    for (let i = 0; i < 7; i++) {
      const y = FLOOR + i * 4;
      const z = 12.6 + i * 4 * lean;
      b.box(-w - 1.2, y, z - 0.6, 1.3, 2.2, 4.2, trim, { studs: false });
      b.box(w - 0.1, y, z - 0.6, 1.3, 2.2, 4.2, trim, { studs: false });
      b.box(-w, y, z - 1.4, w * 2, 1.6, 4.2, COLORS.trueBlack, { studs: false });
    }
    b.box(-w - 1.2, FLOOR + 28, 18.2, (w + 1.2) * 2, 2.4, 2.2, trim, { studs: false });
  }

  // --- treads ---------------------------------------------------------------
  // Each track is a closed stadium loop of identical links. The links live in
  // two InstancedMeshes (pad + cleat) so 88 of them cost two draw calls, and
  // `rollTracks(t)` just walks them along the loop.
  const TRACK = { len: 24, rad: 2.2, x: 8.0, y: 2.2, width: 4.6, links: 44 };
  const trackMeshes = [];
  let rollTracks = () => {};

  function treads() {
    // The link is modelled so that its outermost face sits at local y = 0,
    // which puts the loop's outer surface exactly on the path radius.
    const linkB = new Bricks({ studSegments: 6 });
    const LW = TRACK.width;
    const LL = 1.5;
    linkB.box(-LW / 2, -1.8, -LL / 2, LW, LL, 1.1, COLORS.trueBlack, { studs: false });
    linkB.box(-LW * 0.34, -0.72, -LL * 0.3, LW * 0.68, LL * 0.62, 0.72, grey, { studs: false });
    const linkGroup = linkB.build();

    const N = TRACK.links * 2;
    for (const child of linkGroup.children) {
      const im = new THREE.InstancedMesh(child.geometry, child.material, N);
      im.castShadow = true;
      im.receiveShadow = true;
      im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      trackMeshes.push(im);
    }

    const P = 2 * TRACK.len + Math.PI * 2 * TRACK.rad;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const pos = new THREE.Vector3();
    const one = new THREE.Vector3(1, 1, 1);

    // Arc-length parameterisation of the stadium, in world units.
    function at(s) {
      let u = ((s % P) + P) % P;
      const r = TRACK.rad;
      if (u < TRACK.len) return [-TRACK.len / 2 + u, r, 0];
      u -= TRACK.len;
      if (u < Math.PI * r) {
        const a = u / r;
        return [TRACK.len / 2 + Math.sin(a) * r, Math.cos(a) * r, a];
      }
      u -= Math.PI * r;
      if (u < TRACK.len) return [TRACK.len / 2 - u, -r, Math.PI];
      u -= TRACK.len;
      const a = u / r;
      return [-TRACK.len / 2 - Math.sin(a) * r, -Math.cos(a) * r, Math.PI + a];
    }

    rollTracks = (t) => {
      const shift = t * (TRACK.rad * 1.35);
      for (let side = 0; side < 2; side++) {
        const sx = side === 0 ? -TRACK.x : TRACK.x;
        for (let i = 0; i < TRACK.links; i++) {
          const [z, y, ang] = at((i / TRACK.links) * P + shift);
          pos.set(sx, TRACK.y + y, z);
          q.setFromEuler(new THREE.Euler(ang, 0, 0));
          m.compose(pos, q, one);
          for (const im of trackMeshes) im.setMatrixAt(side * TRACK.links + i, m);
        }
      }
      for (const im of trackMeshes) im.instanceMatrix.needsUpdate = true;
    };
    rollTracks(0);
    for (const im of trackMeshes) {
      im.computeBoundingBox();
      im.computeBoundingSphere();
    }

    // Drive sprockets, road wheels and the beam each track hangs from.
    for (const s of [-1, 1]) {
      const x = s * TRACK.x;
      for (const z of [-TRACK.len / 2, TRACK.len / 2]) {
        b.wheel(x, PL(TRACK.y), z, TRACK.rad - 0.72, TRACK.width - 1.0, COLORS.trueBlack, grey);
        b.cyl(x + s * (TRACK.width / 2 - 0.3), PL(TRACK.y), z, 0.85, 1.4, metal, {
          segments: 12, rot: [0, 0, Math.PI / 2],
        });
      }
      for (let i = 0; i < 4; i++) {
        const z = -TRACK.len / 2 + 3.5 + i * ((TRACK.len - 7) / 3);
        b.wheel(x, PL(TRACK.y - TRACK.rad + 0.95), z, 0.95, TRACK.width - 1.4, COLORS.trueBlack, grey);
      }
      // suspension beam between the sprockets, tucked inside the loop
      b.box(x - TRACK.width / 2 + 0.9, PL(TRACK.y) - 1.6, -TRACK.len / 2 + 1,
        TRACK.width - 1.8, TRACK.len - 2, 3.2, grey, { studs: false });
      // mounting pylons up into the belly
      for (const z of [-TRACK.len / 2 + 4, 0, TRACK.len / 2 - 4]) {
        b.box(x - 1.4, PL(TRACK.y + TRACK.rad) - 2, z - 1.2, 2.8, 2.4, 4, grey, { studs: false });
      }
    }
  }

  tub();
  panels();
  bridge();
  loadingRamp();
  treads();

  const group = new THREE.Group();
  const mesh = b.build();
  group.add(mesh);
  group.add(ramp);
  for (const im of trackMeshes) group.add(im);
  group.name = 'sandcrawler';

  /** 0 = stowed flat against the bow face, 1 = fully lowered to the sand. */
  const setRamp = (a) => {
    ramp.rotation.x = ease.lerp(RAMP.up, RAMP.down, ease.clamp(a));
  };
  setRamp(opts.ramp ?? 0);

  const out = finish(group, {
    enginePoints: [],
    gunPoints: [],
    parts: mesh.userData.parts,
    rollTracks,
    setRamp,
    ramp,
    previewUpdate: (t) => rollTracks(t),
  });
  return out;
}

// ===========================================================================
// 6. TURBOLASER TOWER
// ===========================================================================

/**
 * ORIENTATION: +z forward, base sitting on y = 0. About 7 studs across and
 * 8 tall. `userData.yaw` spins about y, `userData.pitch` elevates the barrels;
 * `userData.muzzles` are in the pitch group's local space, so aim with
 *   turret.userData.pitch.localToWorld(m.clone())
 */
export async function buildTurbolaserTower(opts = {}) {
  const hull = opts.hull ?? COLORS.lightBluishGray;
  const dark = opts.dark ?? COLORS.darkBluishGray;
  const metal = opts.metal ?? COLORS.flatSilver;
  const colors = { hull, dark };

  const root = new THREE.Group();

  /**
   * The fixed emplacement: a wider footing than the shipboard turret, ringed
   * with buttresses, power couplings, ammunition drums and an access ladder.
   */
  function emplacement() {
    const b = new Bricks({ studSegments: 10 });
    b.cyl(0, 0, 0, 4.2, 1, dark, { segments: 16 });
    b.cyl(0, 1, 0, 3.6, 1, hull, { segments: 16 });
    for (let i = 0; i < 6; i++) {
      b.push();
      b.rotateY((i / 6) * Math.PI * 2);
      b.box(-0.9, 2, 2.4, 1.8, 1.4, 2, dark, { studs: false });
      b.cyl(0, 2, 3.3, 0.5, 3, metal, { segments: 8 });
      // cable jumper from the coupling head into the pedestal collar; it has to
      // stop below y = 4 plates, which is where the yoke starts turning
      b.bar([0, 5 * PLATE, 3.3 * PITCH], [0, 3.4 * PLATE, 2.2 * PITCH], 0.13, dark);
      b.pop();
    }
    // ammunition drums standing between the buttresses
    for (let i = 0; i < 3; i++) {
      b.push();
      b.rotateY((i / 3) * Math.PI * 2 + Math.PI / 6);
      b.cyl(0, 2, 3.05, 0.8, 5, hull, { segments: 10, stud: true });
      b.cyl(0, 7, 3.05, 0.5, 1, dark, { segments: 8 });
      b.pop();
    }
    // access ladder up the rear face
    b.push();
    b.rotateY(Math.PI);
    for (const s of [-1, 1]) {
      b.bar([s * 0.34, 2 * PLATE, 2.7 * PITCH], [s * 0.34, 9 * PLATE, 2.15 * PITCH], 0.1, metal);
    }
    for (let r = 0; r <= 4; r++) {
      const u = r / 4;
      const y = (2 + u * 7) * PLATE;
      const z = (2.7 - u * 0.55) * PITCH;
      b.bar([-0.34, y, z], [0.34, y, z], 0.075, metal);
    }
    b.pop();
    turretBase(b, colors);
    root.add(b.build());
  }

  /** Rotating yoke, with cooling fins on the flanks and a rangefinder aft. */
  function yokeAssembly() {
    const yaw = new THREE.Group();
    yaw.position.y = TURRET.yawY * PLATE;
    root.add(yaw);
    const b = new Bricks({ studSegments: 10 });
    turretYoke(b, colors);
    for (const s of [-1, 1]) {
      for (let i = 0; i < 4; i++) {
        b.box(s > 0 ? 2.3 : -2.6, 1, -1.9 + i * 0.9, 0.3, 0.55, 3, metal, { studs: false });
      }
    }
    // rangefinder box on the rear deck, with a trans lens facing forward
    b.box(-1.9, 5, -2.0, 1.5, 1.1, 3, dark, { studs: false });
    b.cyl(-1.15, 6, -1.9, 0.28, 1, COLORS.transLightBlue, {
      segments: 8, rot: [Math.PI / 2, 0, 0], finish: 'trans',
    });
    b.plate(0.6, 5, -2.0, 1, 1, dark);
    yaw.add(b.build());
    return yaw;
  }

  /** Twin barrels plus recoil cylinders, on the elevating trunnion. */
  function barrelAssembly(yaw) {
    const pitch = new THREE.Group();
    pitch.position.set(0, 8 * PLATE, 0.5 * PITCH);
    yaw.add(pitch);
    const b = new Bricks({ studSegments: 10 });
    const muzzles = turretBarrels(b, { ...colors, len: TURRET.barrelLen });
    for (const s of [-1, 1]) {
      tubeZ(b, s * 0.85, 2.2, 2.6, 0.2, 2.4, metal, { segments: 8 });
      b.box(s * 1.35 - 0.2, -1.0, -1.2, 0.4, 2.0, 5, dark, { studs: false });
    }
    pitch.add(b.build());
    return { pitch, muzzles };
  }

  emplacement();
  const yaw = yokeAssembly();
  const { pitch, muzzles } = barrelAssembly(yaw);

  yaw.rotation.y = opts.yaw ?? 0;
  pitch.rotation.x = opts.pitch ?? -0.28;
  root.name = 'turbolaser';

  return finish(root, {
    yaw,
    pitch,
    muzzles,
    gunPoints: muzzles,
    enginePoints: [],
    previewUpdate: (t) => {
      yaw.rotation.y = Math.sin(t * 0.6) * 0.8;
      pitch.rotation.x = -0.3 - Math.sin(t * 0.9) * 0.25;
    },
  });
}

// ===========================================================================
// Turntable entries
// ===========================================================================

export const PREVIEW = {
  corvette: () => buildCorvette(),
  'star-destroyer': () => buildStarDestroyer(),
  'escape-pod': () => buildEscapePod(),
  'death-star': () => buildDeathStar({ lit: true }),
  sandcrawler: () => buildSandcrawler({ ramp: 1 }),
  turbolaser: () => buildTurbolaserTower(),
};
