import { ROOMS, ROOM_BY_ID, DOORS, WALL_T } from "/workspace/src/core/layout.js";
for (const d of DOORS) {
  const A = ROOM_BY_ID[d.a], B = ROOM_BY_ID[d.b];
  const edges = (r) => d.axis === "z" ? [r.box[2], r.box[3]] : [r.box[0], r.box[1]];
  const ea = edges(A), eb = edges(B);
  const na = ea.reduce((p, c) => Math.abs(c - d.at) < Math.abs(p - d.at) ? c : p);
  const nb = eb.reduce((p, c) => Math.abs(c - d.at) < Math.abs(p - d.at) ? c : p);
  const gap = Math.abs(na - nb);
  const offA = Math.abs(na - d.at), offB = Math.abs(nb - d.at);
  if (gap > WALL_T + 1e-6 || offA > 1e-6 || offB > 1e-6) console.log(`${d.id.padEnd(16)} ${d.kind.padEnd(6)} ${d.a}→${d.b} axis ${d.axis} at ${d.at}: edges ${na} | ${nb}  gap ${gap.toFixed(1)} m  (door plane off A ${offA}, off B ${offB}) floors ${A.floor}/${B.floor}`);
}
