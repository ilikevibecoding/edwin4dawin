(function () {
  // a ground camera on the upper beach (dune ridge, h 1.0-1.7) near palms / sea grape: scans the map grid
  // around the island-pass line for beach cells, then keeps the spots with plants 10-45 m off
  const g = window.__game, m = g.map, occ = g.city.occupied;
  const tiles = g.vegetation.tiles;
  const CX = 3200, CZ = -2200, R = 1600;
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
  const cands = [];
  for (let z = CZ - R; z <= CZ + R; z += 20) for (let x = CX - R; x <= CX + R; x += 20) {
    if (m.zoneAt(x, z) !== 2) continue;
    const y = m.heightAt(x, z);
    if (y < 1.0 || y > 1.7 || occ(x, z)) continue;
    cands.push([x, z, y]);
  }
  let seed = 777;
  const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  let best = null;
  for (let k = 0; k < Math.min(300, cands.length); k++) {
    const [x, z, y] = cands[Math.floor(rnd() * cands.length)];
    const near = plantsNear(x, z, 45);
    if (near.some((p) => p.d < 9)) continue;
    const mid = near.filter((p) => p.d < 45);
    if (mid.length < 3) continue;
    const score = mid.length + 4 * mid.filter((p) => p.fam === 1 && p.d < 35).length;
    if (!best || score > best.score) best = { x, z, y, mid, score };
  }
  if (!best) return 'dev&cam=' + CX + ',3,' + CZ + '&hdg=0&pch=-4&fov=50&time=15';
  let sx = 0, sz = 0;
  for (const p of best.mid) { sx += p.x; sz += p.z; }
  sx /= best.mid.length; sz /= best.mid.length;
  const hdg = (Math.atan2(sx - best.x, -(sz - best.z)) * 180 / Math.PI + 360) % 360;
  window.__FOUND_BEACH = { best, ncands: cands.length };
  return 'dev&cam=' + best.x.toFixed(1) + ',' + (best.y + 1.8).toFixed(2) + ',' + best.z.toFixed(1) + '&hdg=' + hdg.toFixed(0) + '&pch=-4&fov=50&time=15';
})()
