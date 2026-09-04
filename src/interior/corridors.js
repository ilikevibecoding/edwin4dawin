// Imperial corridors: light-grey panelled walls with the recessed light band, black ribs, a dark
// deck with a glossy centre strip and a continuous ceiling light channel. Corridors that cross each
// other get full-height openings where they meet; the later-built one skips floor/ceiling in the
// overlap so nothing z-fights.
import * as THREE from "three";
import { ROOMS, STD, doorsOf } from "../config/layout.js";
import { buildShell, roomWalls } from "./shell.js";
import { impFloor, impCeiling, pointLightDesc, walkable, wallScreen, rng } from "./impKit.js";
import { ceilingFrame, wallFrame } from "../core/frame.js";
import { IMP } from "../materials/imperial.js";
import { impDecalRect } from "../materials/imperialTextures.js";

function overlap(a, b) {
  const x0 = Math.max(a[0], b[0]);
  const z0 = Math.max(a[1], b[1]);
  const x1 = Math.min(a[2], b[2]);
  const z1 = Math.min(a[3], b[3]);
  if (x1 - x0 <= 0.01 || z1 - z0 <= 0.01) return null;
  return [x0, z0, x1, z1];
}

// Corridors of a cluster in build order; the first one owns the floor/ceiling in any overlap.
export function corridorIds(cluster) {
  return Object.keys(ROOMS).filter((id) => ROOMS[id].cluster === cluster && ROOMS[id].corridor);
}

export function makeCorridorBuilder(id) {
  return (kit, ctx) => buildCorridor(kit, ctx, id);
}

export function buildCorridor(kit, ctx, id) {
  const room = ROOMS[id];
  const [x0, z0, x1, z1] = room.box;
  const h = room.h;
  const y = ctx.floorY;
  const alongX = x1 - x0 > z1 - z0;
  const siblings = corridorIds(room.cluster);
  const myIndex = siblings.indexOf(id);
  const walls = roomWalls(room);
  const extraOpenings = { north: [], south: [], west: [], east: [] };
  const cutouts = [];
  for (const other of siblings) {
    if (other === id) continue;
    const ov = overlap(room.box, ROOMS[other].box);
    if (!ov) continue;
    ctx.portal(other);
    // which of my walls does the other corridor pass through? A wall is crossed when the overlap
    // touches that wall's plane.
    const [ox0, oz0, ox1, oz1] = ov;
    const eps = 0.05;
    if (Math.abs(oz0 - z0) < eps) extraOpenings.north.push({ type: "hole", u0: walls.north.u(ox0), u1: walls.north.u(ox1), v0: 0, v1: h });
    if (Math.abs(oz1 - z1) < eps) extraOpenings.south.push({ type: "hole", u0: walls.south.u(ox1), u1: walls.south.u(ox0), v0: 0, v1: h });
    if (Math.abs(ox0 - x0) < eps) extraOpenings.west.push({ type: "hole", u0: walls.west.u(oz1), u1: walls.west.u(oz0), v0: 0, v1: h });
    if (Math.abs(ox1 - x1) < eps) extraOpenings.east.push({ type: "hole", u0: walls.east.u(oz0), u1: walls.east.u(oz1), v0: 0, v1: h });
    if (siblings.indexOf(other) < myIndex) cutouts.push(ov);
  }
  // walls + (maybe) floor/ceiling via the shell
  const skip = cutouts.length ? ["floor", "ceiling"] : [];
  buildShell(kit, ctx, id, room, {
    skip,
    extraOpenings,
    wall: { pitch: 4, styles: { plain: 0.62, control: 0.1, vent: 0.1, hatch: 0.08, pipes: 0.05, screen: 0.05 }, tone: IMP.wallLight, toneAlt: IMP.wallLight },
    ceiling: { lightPitch: alongX ? 4 : 5, stripW: 0.34, panelW: 2.0 },
    floor: { strip: true, stripW: alongX ? 1.4 : 1.6, stripAxis: alongX ? "x" : "z" },
  });
  if (cutouts.length) {
    // floor + ceiling in pieces around the cutouts (only one cutout per corridor in this layout)
    const pieces = subtract([x0, z0, x1, z1], cutouts);
    for (const p of pieces) {
      impFloor(kit, p, y, { tone: IMP.wallDark, strip: true, stripW: alongX ? 1.4 : 1.6, stripAxis: alongX ? "x" : "z", trim: false });
      const f = ceilingFrame(kit, p[0], p[1], y + h);
      impCeiling(f, p[2] - p[0], p[3] - p[1], { lightPitch: alongX ? 4 : 5, stripW: 0.34, seed: 17 });
    }
    walkable(ctx, x0, z0, x1, z1, y, id);
  }
  // bulkhead frames every ~12 m: side pillars, a header beam with a lit underside and a hazard kick,
  // placed clear of doorways and crossings. They break up long runs and give every corridor a
  // rhythm of destinations instead of a black vanishing point.
  const len = alongX ? x1 - x0 : z1 - z0;
  {
    const blocked = [];
    for (const d of doorsOf(id)) blocked.push(alongX ? d.c : d.c);
    for (const other of siblings) {
      if (other === id) continue;
      const ov = overlap(room.box, ROOMS[other].box);
      if (ov) blocked.push(alongX ? (ov[0] + ov[2]) / 2 : (ov[1] + ov[3]) / 2);
    }
    const w = alongX ? z1 - z0 : x1 - x0;
    const c0 = alongX ? (z0 + z1) / 2 : (x0 + x1) / 2;
    const pitch = 12;
    for (let s = pitch * 0.5; s < len - 3; s += pitch) {
      const a = (alongX ? x0 : z0) + s;
      if (blocked.some((b) => Math.abs(b - a) < 3.2)) continue;
      const pillarW = 0.36;
      const pd = 0.3;
      for (const side of [-1, 1]) {
        const off = c0 + side * (w / 2 - STD.wallT - pd / 2 - 0.15);
        if (alongX) kit.box("impPaintedMetal", a, y + h / 2, off, pillarW, h, pd, { color: IMP.trim, texel: 1 });
        else kit.box("impPaintedMetal", off, y + h / 2, a, pd, h, pillarW, { color: IMP.trim, texel: 1 });
        // hazard kick + steel inlay on the pillar face
        if (alongX) {
          kit.box("hazard", a, y + 0.12, off - side * pd * 0.5, pillarW + 0.02, 0.24, 0.02, { uv: "scale", uvScale: [0.5, 0.3] });
          kit.box("impMetal", a, y + h / 2 + 0.2, off - side * (pd * 0.5 + 0.004), 0.04, h - 1.0, 0.008, { color: IMP.steel });
        } else {
          kit.box("hazard", off - side * pd * 0.5, y + 0.12, a, 0.02, 0.24, pillarW + 0.02, { uv: "scale", uvScale: [0.5, 0.3] });
          kit.box("impMetal", off - side * (pd * 0.5 + 0.004), y + h / 2 + 0.2, a, 0.008, h - 1.0, 0.04, { color: IMP.steel });
        }
      }
      // header beam with a lit underside strip
      const span = w - 2 * (STD.wallT + 0.15);
      if (alongX) {
        kit.box("impPaintedMetal", a, y + h - 0.28, c0, pillarW, 0.56, span, { color: IMP.trim, texel: 1 });
        kit.box("lightBand", a, y + h - 0.565, c0, pillarW - 0.14, 0.01, span - 0.6, { uv: "keep" });
      } else {
        kit.box("impPaintedMetal", c0, y + h - 0.28, a, span, 0.56, pillarW, { color: IMP.trim, texel: 1 });
        kit.box("lightBand", c0, y + h - 0.565, a, span - 0.6, 0.01, pillarW - 0.14, { uv: "keep" });
      }
      // pillar colliders
      for (const side of [-1, 1]) {
        const off = c0 + side * (w / 2 - STD.wallT - pd / 2 - 0.15);
        if (alongX) kit.collider([a - pillarW / 2, y, off - pd / 2], [a + pillarW / 2, y + h, off + pd / 2], "bulkhead");
        else kit.collider([off - pd / 2, y, a - pillarW / 2], [off + pd / 2, y + h, a + pillarW / 2], "bulkhead");
      }
    }
  }
  // lights: one every ~7 m down the middle, plus a sign/screen every ~12 m
  const n = Math.max(1, Math.round(len / 7));
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    const px = alongX ? x0 + t * (x1 - x0) : (x0 + x1) / 2;
    const pz = alongX ? (z0 + z1) / 2 : z0 + t * (z1 - z0);
    pointLightDesc(ctx, 0xd8e2ff, 3.2, 9, [px, y + h - 0.7, pz], 0);
  }
  // wall dressing: deck plates with the corridor id, emergency lighting boxes, occasional screens
  const rand = rng(myIndex * 31 + 5);
  const wKeys = alongX ? ["north", "south"] : ["west", "east"];
  for (const key of wKeys) {
    const w = walls[key];
    const { frame } = wallFrame(kit, w.from, w.to, y);
    for (let u = 6; u < w.length - 4; u += 12) {
      const r = rand();
      if (r < 0.35) wallScreen(frame, u, 1.55, 0.9, 0.5, Math.floor(rand() * 3));
      else if (r < 0.7) {
        // emergency box: red light + hazard label
        frame.box("impPaintedMetal", u, 1.6, 0.16, 0.5, 0.36, 0.14, { color: IMP.trim, texel: 1 });
        frame.box("emitRed", u, 1.7, 0.235, 0.3, 0.05, 0.01);
        frame.quad("impDecal", u, 1.5, 0.232, 0.22, 0.22, { uvRect: impDecalRect(13) });
      } else {
        frame.quad("impDecal", u, 1.7, 0.062, 0.5, 0.5, { uvRect: impDecalRect(0) });
        frame.quad("impDecal", u + 0.55, 1.7, 0.062, 0.3, 0.3, { uvRect: impDecalRect(7) });
      }
    }
  }
  // camera views for the harness: looking down the corridor from one end
  // stand a little off-axis so the nearest doorways and their signs are in frame
  if (alongX) ctx.view(id, x0 + 6, y + STD.eye, (z0 + z1) / 2 - 1.1, -78, -3);
  else ctx.view(id, (x0 + x1) / 2 + 1.1, y + STD.eye, z0 + 6, 180 - 12, -3);
}

// rectangle minus rectangles (axis-aligned), returns up to 4 pieces per cutout (handles one cutout well)
function subtract(box, cuts) {
  let pieces = [box];
  for (const c of cuts) {
    const next = [];
    for (const p of pieces) {
      const ov = overlap(p, c);
      if (!ov) {
        next.push(p);
        continue;
      }
      const [x0, z0, x1, z1] = p;
      const [cx0, cz0, cx1, cz1] = ov;
      if (cz0 > z0) next.push([x0, z0, x1, cz0]);
      if (cz1 < z1) next.push([x0, cz1, x1, z1]);
      if (cx0 > x0) next.push([x0, cz0, cx0, cz1]);
      if (cx1 < x1) next.push([cx1, cz0, x1, cz1]);
    }
    pieces = next;
  }
  return pieces;
}

export { THREE };
