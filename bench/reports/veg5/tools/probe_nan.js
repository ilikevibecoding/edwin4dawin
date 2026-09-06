(function(){
  const g = window.__game, V = g.vegetation;
  const tiles = V.tiles; const out = {tiles: tiles.length, nonFinite: {}, scale: {}, n: {}};
  for (const t of tiles) {
    const f = t.family; out.n[f] = (out.n[f]||0) + t.n;
    const M = t.matrices; let bad = 0; let smin = 1e9, smax = 0;
    for (let i = 0; i < t.n; i++) {
      for (let k = 0; k < 16; k++) if (!Number.isFinite(M[i*16+k])) bad++;
      const s = Math.hypot(M[i*16], M[i*16+1], M[i*16+2]); if (s < smin) smin = s; if (s > smax) smax = s;
    }
    const C = t.colors; for (let i = 0; i < t.n*3; i++) if (!Number.isFinite(C[i])) bad++;
    for (const E of t.extras) for (let i = 0; i < E.length; i++) if (!Number.isFinite(E[i])) bad++;
    if (bad) out.nonFinite[f] = (out.nonFinite[f]||0) + bad;
    const sc = out.scale[f] || (out.scale[f] = [1e9, 0]); sc[0] = Math.min(sc[0], smin); sc[1] = Math.max(sc[1], smax);
  }
  // extras layout per family: report min/max of each component of extras[0] (aVar)
  out.aVar = {};
  for (const t of tiles) { const E = t.extras[0]; if (!E) continue; const f = t.family; const a = out.aVar[f] || (out.aVar[f] = [[1e9,-1e9],[1e9,-1e9],[1e9,-1e9],[1e9,-1e9]]); const stride = E.length / t.n; for (let i = 0; i < t.n; i++) for (let k = 0; k < 4 && k < stride; k++) { const v = E[i*stride+k]; if (v < a[k][0]) a[k][0] = v; if (v > a[k][1]) a[k][1] = v; } }
  return JSON.stringify(out);
})()
