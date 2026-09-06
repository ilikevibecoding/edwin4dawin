(function () {
  // a ground camera on open lawn: no plant within 12 m, several within 45 m, on lawn zones, off footprints;
  // looks toward the nearby plants' centroid. Deterministic (LCG) so the batch is repeatable.
  const g = window.__game, m = g.map, occ = g.city.occupied;
  const tiles = g.vegetation.tiles;
  const CX = window.__FIND_CX ?? 320, CZ = window.__FIND_CZ ?? 2120, ZONES = window.__FIND_ZONES ?? [2, 4, 5, 6, 8, 16];
  let seed = 12345;
  const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  function plantsNear(x, z, r) {
    const out = [];
    for (const t of tiles) {
      if (t.family === 2) continue;
      if (t.box.min.x > x + r || t.box.max.x < x - r || t.box.min.z > z + r || t.box.max.z < z - r) continue;
      const M = t.matrices;
      for (let i = 0; i < t.n; i++) {
        const px = M[i * 16 + 12], pz = M[i * 16 + 14];
        const d = Math.hypot(px - x, pz - z);
        if (d < r) out.push({ x: px, z: pz, d, s: Math.hypot(M[i * 16], M[i * 16 + 1], M[i * 16 + 2]), fam: t.family });
      }
    }
    return out;
  }
  let best = null;
  for (let k = 0; k < 600; k++) {
    const x = CX + (rnd() - 0.5) * 250, z = CZ + (rnd() - 0.5) * 250;
    if (!ZONES.includes(m.zoneAt(x, z)) || occ(x, z)) continue;
    const y = m.heightAt(x, z);
    if (y < 0.5) continue;
    const near = plantsNear(x, z, 45);
    if (near.some((p) => p.d < 10)) continue; if (!near.some((p) => p.fam === 1 && p.d < 35)) continue;
    const mid = near.filter((p) => p.d < 45);
    if (mid.length < 4) continue;
    // prefer spots with big trees in the 15-40 m band and a palm among them
    const score = mid.length + 3 * mid.filter((p) => p.s > 3 && p.d < 40).length + (mid.some((p) => p.fam === 1) ? 4 : 0);
    if (!best || score > best.score) best = { x, z, y, mid, score };
  }
  if (!best) return 'dev&cam=' + CX + ',9,' + CZ + '&hdg=0&pch=-4&fov=50&time=15';
  let sx = 0, sz = 0;
  for (const p of best.mid) { sx += p.x; sz += p.z; }
  sx /= best.mid.length; sz /= best.mid.length;
  // heading: 0 = north = -z, clockwise
  const hdg = (Math.atan2(sx - best.x, -(sz - best.z)) * 180 / Math.PI + 360) % 360;
  window.__FOUND_PALM = best;
  return 'dev&cam=' + best.x.toFixed(1) + ',' + (best.y + 2.0).toFixed(2) + ',' + best.z.toFixed(1) + '&hdg=' + hdg.toFixed(0) + '&pch=-5&fov=50&time=15';
})()
