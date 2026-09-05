// Ventral features. The ventral plane is built here (hull.js draws it as the "hullBottom" chunk) because
// it carries real recesses: a centreline channel ahead of the keel block, one channel along each flank
// and a cylindrical recess under the stern that holds the reactor hemisphere. Channel floors sit inside
// the hull with side walls, so from below they read as dark cuts with depth and the machinery hangs
// inside them. The keel fittings (secondary bay frame, well throat, the wide dark collar around the hangar
// well with its lit rim, hazard and door decals) are the rest. Thin features stay flat quads with
// polygonOffset (never raised slivers), so nothing sparkles at grazing angles.
import * as THREE from "three";
import { HULL, HANGAR } from "../config/shipSpec.js";
import { ventral, surfaceNormal, frameQuat, UP, merge, box, boxMM, atlasQuad, macroTint, macroColor, worldUV, finish, ensureColor, instancedFromList, layerMesh, Soup } from "./util.js";

const _q = new THREE.Quaternion();
const _q2 = new THREE.Quaternion();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();
const _n = new THREE.Vector3();
const _c = new THREE.Color();

// recessed channels: floor lifted `depth` into the hull between two side walls
export const CENTRE_CHANNEL = { halfW: 13, depth: 3, z0: -590, z1: HULL.keelPlate.z0 - 14 };
// the flank pair follows the wedge edge at a fixed fraction of the half-width
export const FLANK_CHANNEL = { s: 0.56, halfW: 7, depth: 3.5, z0: -520, z1: 700 };
export const flankX = (z) => FLANK_CHANNEL.s * HULL.halfWidthAt(z);
// reactor: a hemisphere of radius R whose equator sits on the floor of a cylindrical recess (radius Rr,
// `depth` into the hull) cut through a square of half-size `hole` in the plane. The pole stays above the
// keel block, which the spec keeps as the ship's lowest point.
export const REACTOR = { x: 0, z: 640, R: 34, Rr: 40, depth: 24, hole: 46 };
export const reactorFloorY = () => ventral(REACTOR.x, REACTOR.z) + REACTOR.depth;

const DOWN = [0, -1, 0];
const V = (x, z, dy = 0) => [x, ventral(x, z) + dy, z];

// quad wound so its face normal points along `dir`
function faceQuad(soup, a, b, c, d, dir) {
  const ux = b[0] - a[0];
  const uy = b[1] - a[1];
  const uz = b[2] - a[2];
  const vx = c[0] - a[0];
  const vy = c[1] - a[1];
  const vz = c[2] - a[2];
  const nx = uy * vz - uz * vy;
  const ny = uz * vx - ux * vz;
  const nz = ux * vy - uy * vx;
  if (nx * dir[0] + ny * dir[1] + nz * dir[2] >= 0) soup.quad(a, b, c, d);
  else soup.quad(a, d, c, b);
}

// Ventral plane with its cuts. Returns { surface } for the hull material and { channels } (channel floors
// and walls, the reactor recess wall and floor) for the dark machinery material. Each ventral half-plane is
// exactly planar, so quads bounded by straight lines conform to it with no gaps.
export function buildVentralSurface() {
  const skin = new Soup();
  const dark = new Soup();
  const zStart = HULL.bowZ + 6;
  const zEnd = HULL.sternZ;
  const R = REACTOR;
  const rz0 = R.z - R.hole;
  const rz1 = R.z + R.hole;
  const eps = 1e-6;
  const zs = new Set();
  for (let i = 0; i <= 40; i++) zs.add(zStart + ((zEnd - zStart) * i) / 40);
  for (const z of [CENTRE_CHANNEL.z0, CENTRE_CHANNEL.z1, FLANK_CHANNEL.z0, FLANK_CHANNEL.z1, rz0, rz1]) zs.add(z);
  const rows = [...zs].sort((a, b) => a - b);
  const channelCut = (za, zb, ch, xa, xb, halfW) => ({ a0: xa - halfW, b0: xb - halfW, a1: xa + halfW, b1: xb + halfW, ch });
  const wall = (a0, b0, za, zb, depth, dir) => faceQuad(dark, V(a0, za), V(a0, za, depth), V(b0, zb, depth), V(b0, zb), dir);
  for (let i = 0; i + 1 < rows.length; i++) {
    const za = rows[i];
    const zb = rows[i + 1];
    if (zb - za < 0.01) continue;
    const hwa = HULL.halfWidthAt(za);
    const hwb = HULL.halfWidthAt(zb);
    const cuts = [];
    if (za >= CENTRE_CHANNEL.z0 - eps && zb <= CENTRE_CHANNEL.z1 + eps) cuts.push(channelCut(za, zb, CENTRE_CHANNEL, 0, 0, CENTRE_CHANNEL.halfW));
    if (za >= FLANK_CHANNEL.z0 - eps && zb <= FLANK_CHANNEL.z1 + eps) for (const s of [-1, 1]) cuts.push(channelCut(za, zb, FLANK_CHANNEL, s * flankX(za), s * flankX(zb), FLANK_CHANNEL.halfW));
    if (za >= rz0 - eps && zb <= rz1 + eps) cuts.push({ a0: -R.hole, b0: -R.hole, a1: R.hole, b1: R.hole, hole: true });
    cuts.sort((p, q) => p.a0 - q.a0);
    const lines = [[-hwa, -hwb]];
    for (const c of cuts) lines.push([c.a0, c.b0], [c.a1, c.b1]);
    lines.push([hwa, hwb]);
    // skin between the cuts, in columns of <= 60 m, split on the centreline where a column would cross it
    for (let k = 0; k + 1 < lines.length; k += 2) {
      const [xa0, xb0] = lines[k];
      const [xa1, xb1] = lines[k + 1];
      const width = Math.max(xa1 - xa0, xb1 - xb0);
      if (width < 0.05) continue;
      const ts = [0];
      const n = Math.max(1, Math.ceil(width / 60));
      for (let j = 1; j < n; j++) ts.push(j / n);
      if (xa0 < 0 && xa1 > 0) ts.push(-xa0 / (xa1 - xa0));
      ts.push(1);
      ts.sort((p, q) => p - q);
      for (let j = 0; j + 1 < ts.length; j++) {
        const l0 = xa0 + (xa1 - xa0) * ts[j];
        const l1 = xa0 + (xa1 - xa0) * ts[j + 1];
        const m0 = xb0 + (xb1 - xb0) * ts[j];
        const m1 = xb0 + (xb1 - xb0) * ts[j + 1];
        if (l1 - l0 < 0.02 && m1 - m0 < 0.02) continue;
        faceQuad(skin, V(l0, za), V(l1, za), V(m1, zb), V(m0, zb), DOWN);
      }
    }
    // channel floors and walls
    for (const c of cuts) {
      if (c.hole) continue;
      const d = c.ch.depth;
      if (c.a0 < 0 && c.a1 > 0) {
        faceQuad(dark, V(c.a0, za, d), V(0, za, d), V(0, zb, d), V(c.b0, zb, d), DOWN);
        faceQuad(dark, V(0, za, d), V(c.a1, za, d), V(c.b1, zb, d), V(0, zb, d), DOWN);
      } else faceQuad(dark, V(c.a0, za, d), V(c.a1, za, d), V(c.b1, zb, d), V(c.b0, zb, d), DOWN);
      wall(c.a0, c.b0, za, zb, d, [1, 0, 0]);
      wall(c.a1, c.b1, za, zb, d, [-1, 0, 0]);
      if (Math.abs(za - c.ch.z0) < eps) faceQuad(dark, V(c.a0, za), V(c.a1, za), V(c.a1, za, d), V(c.a0, za, d), [0, 0, 1]);
      if (Math.abs(zb - c.ch.z1) < eps) faceQuad(dark, V(c.b0, zb), V(c.b1, zb), V(c.b1, zb, d), V(c.b0, zb, d), [0, 0, -1]);
    }
  }
  // reactor recess: the plane closes on the circle with a ring of quads out to the square hole, the wall
  // drops from the circle to a flat floor, and the floor annulus runs in under the dome's equator
  {
    const N = 48;
    const yF = reactorFloorY();
    const pt = (i, r) => {
      const a = (i / N) * Math.PI * 2;
      return [R.x + Math.cos(a) * r, R.z + Math.sin(a) * r, a];
    };
    for (let i = 0; i < N; i++) {
      const [x0, z0, a0] = pt(i, R.Rr);
      const [x1, z1, a1] = pt(i + 1, R.Rr);
      const m0 = Math.max(Math.abs(Math.cos(a0)), Math.abs(Math.sin(a0)));
      const m1 = Math.max(Math.abs(Math.cos(a1)), Math.abs(Math.sin(a1)));
      const q0 = [R.x + (Math.cos(a0) * R.hole) / m0, R.z + (Math.sin(a0) * R.hole) / m0];
      const q1 = [R.x + (Math.cos(a1) * R.hole) / m1, R.z + (Math.sin(a1) * R.hole) / m1];
      faceQuad(skin, V(x0, z0), V(x1, z1), V(q1[0], q1[1]), V(q0[0], q0[1]), DOWN);
      const am = (a0 + a1) / 2;
      faceQuad(dark, V(x0, z0), V(x1, z1), [x1, yF, z1], [x0, yF, z0], [-Math.cos(am), 0, -Math.sin(am)]);
      const [fx0, fz0] = pt(i, R.R - 1.5);
      const [fx1, fz1] = pt(i + 1, R.R - 1.5);
      faceQuad(dark, [fx0, yF, fz0], [fx1, yF, fz1], [x1, yF, z1], [x0, yF, z0], DOWN);
    }
  }
  return { surface: skin.geometry(), channels: dark.geometry() };
}

export function buildVentral(ctx) {
  const { rand, mats, group, detail, atlas } = ctx;
  const A = atlas.cells;
  const k = HULL.keelPlate;
  const lit = []; // every emissive fitting on the belly shares the well rim's mesh
  const darkParts = []; // channel recesses, reactor recess and keel fittings share one dark mesh
  if (ctx.ventralChannels) darkParts.push(finish(ctx.ventralChannels, 1 / 12, { base: 0.62 }));

  // ---- machinery hanging from the channel floors (boxes, drums, pipes, vents), random pitch, plus long
  // pipe runs along the channel edges
  const unitGeo = box(0, 0.5, 0, 1, 1, 1);
  const drumGeo = new THREE.CylinderGeometry(0.5, 0.5, 1, 12).translate(0, 0.5, 0);
  const pipeGeo = new THREE.CylinderGeometry(0.5, 0.5, 1, 10).rotateX(Math.PI / 2);
  const ventGeo = atlasQuad(1, 1, A.vent).rotateX(-Math.PI / 2); // faces local +y, the frame's outward (down) axis
  const L = { units: [], drums: [], pipes: [], vents: [] };
  const tone = () => 0.7 + rand() * 0.35;
  // items sit on the channel floor (lift = depth into the hull) and hang down from it
  const place = (list, x, z, sx, sy, sz, yaw, t, lift) => {
    surfaceNormal(x, z, false, _n);
    frameQuat(_n, _q);
    _q2.setFromAxisAngle(UP, yaw);
    _q.multiply(_q2);
    _p.set(x, ventral(x, z) + lift - 0.02, z);
    _s.set(sx, sy, sz);
    macroTint(x, _p.y, z, -1, _c);
    _c.multiplyScalar(t);
    list.push({ m: new THREE.Matrix4().compose(_p, _q, _s), c: _c.clone() });
  };
  const flankYaw = Math.atan(FLANK_CHANNEL.s * (HULL.beam / 2 / HULL.length));
  const channels = [
    { x: () => 0, halfW: CENTRE_CHANNEL.halfW, depth: CENTRE_CHANNEL.depth, z0: CENTRE_CHANNEL.z0, z1: CENTRE_CHANNEL.z1, yaw: 0 },
    { x: (z) => -flankX(z), halfW: FLANK_CHANNEL.halfW, depth: FLANK_CHANNEL.depth, z0: FLANK_CHANNEL.z0, z1: FLANK_CHANNEL.z1, yaw: -flankYaw },
    { x: (z) => flankX(z), halfW: FLANK_CHANNEL.halfW, depth: FLANK_CHANNEL.depth, z0: FLANK_CHANNEL.z0, z1: FLANK_CHANNEL.z1, yaw: flankYaw },
  ];
  for (const ch of channels) {
    const inner = ch.halfW - 2.2;
    // edge pipes: long runs in segments, one per side, with gaps
    for (const side of [-1, 1]) {
      let z = ch.z0 + 6 + rand() * 30;
      while (z < ch.z1 - 30) {
        const len = 40 + rand() * 90;
        const zc = Math.min(z + len / 2, ch.z1 - 8);
        const r = 0.7 + rand() * 0.6;
        place(L.pipes, ch.x(zc) + side * (ch.halfW - r - 0.6), zc, r * 2, r * 2, Math.min(len, (ch.z1 - 8 - z) * 2), ch.yaw, 0.75 + rand() * 0.3, ch.depth - r * 0.4);
        z += len + 10 + rand() * 40;
      }
    }
    // units down the middle
    let z = ch.z0 + 4 + rand() * 10;
    while (z < ch.z1 - 8) {
      const len = 4 + rand() * 9;
      const zc = z + len / 2;
      const x = ch.x(zc) + (rand() - 0.5) * 2 * (inner - 2.5);
      const r = rand();
      if (r < 0.45) place(L.units, x, zc, 2.5 + rand() * 3, 1.2 + rand() * (ch.depth - 0.6), len, ch.yaw, tone(), ch.depth);
      else if (r < 0.7) place(L.drums, x, zc, 2.5 + rand() * 2.5, 1.5 + rand() * (ch.depth - 0.4), 2.5 + rand() * 2.5, 0, tone(), ch.depth);
      else if (r < 0.88) place(L.pipes, x, zc, 0.8 + rand() * 0.8, 0.8 + rand() * 0.8, len + 6, ch.yaw, 0.75 + rand() * 0.3, ch.depth - 0.6);
      else place(L.vents, x, zc, 3 + rand() * 3, 1, 2.5 + rand() * 2.5, ch.yaw, 1, ch.depth - 0.06);
      z += len + 3 + rand() * 14;
    }
  }
  layerMesh(
    [
      { geo: unitGeo, list: L.units },
      { geo: drumGeo, list: L.drums },
      { geo: pipeGeo, list: L.pipes },
    ],
    mats.greebleDark,
    detail.mid,
    "ventralUnits",
  );
  instancedFromList(ventGeo, mats.atlas, L.vents, detail.near, "ventralVents");

  // ---- reactor: hemisphere on the recess floor, a proud collar at its equator, eight struts back to the
  // recess wall, a lit ring under the collar so the dome reads as a powered feature from 600 m
  {
    const { x, z, R, Rr } = REACTOR;
    const yF = reactorFloorY();
    const sphere = new THREE.SphereGeometry(R, 56, 32);
    const uv = sphere.attributes.uv;
    const circ = 2 * Math.PI * R;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) * circ) / 24, (uv.getY(i) * (Math.PI * R)) / 24);
    sphere.translate(x, yF, z);
    const uvParts = [new THREE.TorusGeometry(R + 0.9, 2.4, 10, 64).rotateX(Math.PI / 2).translate(x, yF - 0.6, z)];
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + 0.2;
      const b = box(0, 0, 0, 2.6, 4.5, Rr - R + 3);
      b.translate(0, -2.2, (R + Rr) / 2 - 0.5);
      b.rotateY(a);
      b.translate(x, yF, z);
      uvParts.push(b);
    }
    const uvMerged = merge(uvParts);
    worldUV(uvMerged, 1 / 12);
    const all = merge([sphere, uvMerged]);
    macroColor(all, { base: 1.02 });
    all.computeBoundingSphere();
    const bulb = new THREE.Mesh(all, mats.hullUv);
    bulb.name = "reactorBulb";
    group.add(bulb);
    lit.push(new THREE.TorusGeometry(R + 1.6, 0.45, 6, 64).rotateX(Math.PI / 2).translate(x, yF - 3.3, z));
  }

  // ---- keel fittings: the proud frame of the reserved secondary bay door, the well throat lining through
  // the plate thickness plus a 0.25 m curb above the hangar deck, and a wide dark collar standing proud
  // around the well mouth that carries the lit rim, so the well reads as a bay opening from 600 m
  const w = HANGAR.well;
  const cx = (w.x0 + w.x1) / 2;
  const cz = (w.z0 + w.z1) / 2;
  const ww = w.x1 - w.x0;
  const wd = w.z1 - w.z0;
  const sb = HANGAR.secondaryBayDoor;
  const throatTop = HANGAR.deckY + 0.25;
  const collarW = 12;
  const collarT = 0.8;
  darkParts.push(
    finish(boxMM([sb.x0 - 1, k.y - 0.7, sb.z0 - 1], [sb.x1 + 1, k.y + 1, sb.z1 + 1]), 1 / 6, { base: 0.6 }),
    finish(
      merge([
        boxMM([w.x0 - 0.6, k.y, w.z0 - 0.6], [w.x0, throatTop, w.z1 + 0.6]),
        boxMM([w.x1, k.y, w.z0 - 0.6], [w.x1 + 0.6, throatTop, w.z1 + 0.6]),
        boxMM([w.x0 - 0.6, k.y, w.z0 - 0.6], [w.x1 + 0.6, throatTop, w.z0]),
        boxMM([w.x0 - 0.6, k.y, w.z1], [w.x1 + 0.6, throatTop, w.z1 + 0.6]),
      ]),
      1 / 6,
      { base: 0.5 },
    ),
    finish(
      merge([
        boxMM([w.x0 - collarW, k.y - collarT, w.z0 - collarW], [w.x1 + collarW, k.y + 0.4, w.z0]),
        boxMM([w.x0 - collarW, k.y - collarT, w.z1], [w.x1 + collarW, k.y + 0.4, w.z1 + collarW]),
        boxMM([w.x0 - collarW, k.y - collarT, w.z0], [w.x0, k.y + 0.4, w.z1]),
        boxMM([w.x1, k.y - collarT, w.z0], [w.x1 + collarW, k.y + 0.4, w.z1]),
      ]),
      1 / 6,
      { base: 0.3 },
    ),
  );
  const darkGeo = merge(darkParts);
  darkGeo.computeBoundingSphere();
  const darkMesh = new THREE.Mesh(darkGeo, mats.dark);
  darkMesh.name = "keelDark";
  group.add(darkMesh);
  // lit rim: four bars on the collar's underside just outside the mouth and a thinner outer ring at the
  // collar's edge, soft cool white (above 1.0 so bloom lifts them gently)
  const yr = k.y - collarT - 0.12;
  const bar = (t, off) => [
    box(cx, yr, w.z0 - off, ww + off * 2 + t, 0.3, t),
    box(cx, yr, w.z1 + off, ww + off * 2 + t, 0.3, t),
    box(w.x0 - off, yr, cz, t, 0.3, wd + off * 2 - t),
    box(w.x1 + off, yr, cz, t, 0.3, wd + off * 2 - t),
  ];
  const rim = merge([...lit, ...bar(1.1, 2.4), ...bar(0.5, collarW - 1.2)]);
  rim.computeBoundingSphere();
  const rimMesh = new THREE.Mesh(rim, mats.rimLight);
  rimMesh.name = "wellRimLight";
  group.add(rimMesh);
  // hazard band on the hull plate outside the collar, plus the painted door stamp of the reserved
  // secondary bay: the two atlas decals on the keel share one mesh
  const y = k.y - 0.05;
  const door = atlasQuad(sb.x1 - sb.x0, sb.z1 - sb.z0, A.bayDoor).rotateX(Math.PI / 2).translate((sb.x0 + sb.x1) / 2, k.y - 0.75, (sb.z0 + sb.z1) / 2);
  const decals = ensureColor(
    merge([
      atlasQuad(ww + collarW * 2 + 6, 3, A.hazard).rotateX(Math.PI / 2).translate(cx, y, w.z0 - collarW - 1.5),
      atlasQuad(ww + collarW * 2 + 6, 3, A.hazard).rotateX(Math.PI / 2).translate(cx, y, w.z1 + collarW + 1.5),
      atlasQuad(wd + collarW * 2, 3, A.hazard).rotateZ(Math.PI / 2).rotateX(Math.PI / 2).translate(w.x0 - collarW - 1.5, y, cz),
      atlasQuad(wd + collarW * 2, 3, A.hazard).rotateZ(Math.PI / 2).rotateX(Math.PI / 2).translate(w.x1 + collarW + 1.5, y, cz),
      door,
    ]),
  );
  decals.computeBoundingSphere();
  const decalMesh = new THREE.Mesh(decals, mats.atlasFlat);
  decalMesh.name = "ventralDecals";
  group.add(decalMesh);
}
