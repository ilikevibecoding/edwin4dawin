import { Rng } from '../../core/seed';
import { canvas, grime, heightToNormal, LIVERY, packRGB, panels, panelVariation, toTexture, wear, type PbrMaps } from './common';

/**
 * Floats: u bow..stern, v around the hull as laid out by `floatHull` (deck 0-0.12, side 0.12-0.22, chine 0.22,
 * keel 0.5, port mirrored). Aluminium with a dark anti-slip deck, a navy boot-top along the chine (the resting
 * waterline runs just under it), a darker wet / stained band either side of the waterline and a yellow keel.
 */
export function floatMaps(): PbrMaps {
  const w = 1024, h = 512;
  const rng = new Rng('float-paint');
  const [ac, actx] = canvas(w, h);
  const [hc, hctx] = canvas(w, h);
  const [rc, rctx] = canvas(w, h);
  hctx.fillStyle = '#808080'; hctx.fillRect(0, 0, w, h);
  actx.fillStyle = '#cfd3d6'; actx.fillRect(0, 0, w, h);
  const CHINE = 0.22;
  /** fill a v band on both sides of the hull */
  const band = (ctx: CanvasRenderingContext2D, v0: number, v1: number, style: string | CanvasGradient) => {
    ctx.fillStyle = style;
    ctx.fillRect(0, v0 * h, w, (v1 - v0) * h);
    ctx.fillRect(0, (1 - v1) * h, w, (v1 - v0) * h);
  };
  // bottom: slightly darker grey than the sides, yellow keel band
  band(actx, CHINE, 0.5, '#b9bec2');
  band(actx, 0.445, 0.5, LIVERY.lower);
  // deck: a dark anti-slip walkway down the middle on bare aluminium, lighter rolled edge
  band(actx, 0, 0.105, '#c3c7ca');
  band(actx, 0, 0.066, '#2b2e31');
  band(actx, 0.105, 0.118, '#9aa0a5');
  // scum line: a light stain from ~4 cm above the resting chine down over it (the wet band itself is live: the
  // float material darkens and glosses the hull below the immersion the flight model reports, model.ts
  // setWaterline, so a planing float runs dry and a float driven under at touchdown is wet to the deck)
  for (const side of [1, -1]) {
    const V = (v: number) => (side > 0 ? v : 1 - v) * h;
    const g = actx.createLinearGradient(0, V(0.165), 0, V(0.31));
    g.addColorStop(0, 'rgba(60,72,70,0)'); g.addColorStop(0.08, 'rgba(60,72,70,0.3)'); g.addColorStop(0.35, 'rgba(70,84,80,0.18)'); g.addColorStop(1, 'rgba(70,84,80,0)');
    actx.fillStyle = g;
    actx.fillRect(0, Math.min(V(0.165), V(0.31)), w, Math.abs(V(0.31) - V(0.165)));
  }
  // navy boot-top along the chine
  band(actx, CHINE - 0.012, CHINE + 0.012, LIVERY.cheat);
  // frames every ~0.6 m along the hull, deck-edge and chine seams, keel strip; rivets at ~6 cm pitch
  panels(hctx, actx, w, h, [0.1, 0.2, 0.3, 0.4, 0.5, 0.58, 0.66, 0.76, 0.86, 0.94], [0.118, 0.5], 24, { strength: 0.8 });
  hctx.strokeStyle = '#4a4a4a'; hctx.lineWidth = 2.5;
  for (const v of [CHINE, 1 - CHINE]) { hctx.beginPath(); hctx.moveTo(0, v * h); hctx.lineTo(w, v * h); hctx.stroke(); }
  // algae streaks and drips hanging from the scum line, scuffs on the deck
  for (let i = 0; i < 140; i++) {
    const side = rng.next() < 0.5 ? 1 : -1;
    const V = (v: number) => (side > 0 ? v : 1 - v) * h;
    actx.strokeStyle = `rgba(62,80,72,${rng.range(0.08, 0.3)})`;
    actx.lineWidth = rng.range(1, 3);
    const x = rng.range(0, w), y0 = V(rng.range(0.17, 0.2)), len = rng.range(8, 40) * side;
    actx.beginPath(); actx.moveTo(x, y0); actx.lineTo(x + rng.range(-4, 4), y0 + len); actx.stroke();
  }
  grime(actx, rng, w, h, 90, 0.08, '60,60,55');
  // Three material families on one hull, packed into one texture (clear coat R / roughness G / metalness B):
  //  - hull sides and bottom: painted aluminium (no metalness, clear-coated), base roughness ~0.42 varying panel by
  //    panel and rougher along the frame seams, the bottom a little duller (0.48) from spray and beaching;
  //  - the wet band around the waterline is glossier and darker (water in the pores), not duller;
  //  - the deck is bare anodised aluminium (metal, satin 0.6, no clear coat) and the walkway anti-slip grit
  //    (near-matte 0.85, barely metallic).
  const [mc, mctx] = canvas(w, h);
  const [cc, cctx] = canvas(w, h);
  const frames = [0.1, 0.2, 0.3, 0.4, 0.5, 0.58, 0.66, 0.76, 0.86, 0.94];
  rctx.fillStyle = '#6b6b6b'; rctx.fillRect(0, 0, w, h);
  band(rctx, CHINE, 0.5, '#7a7a7a');
  panelVariation(rctx, w, h, frames, [0.118, CHINE, 1 - CHINE, 1 - 0.118], rng, 12, 'all', { seam: 3, seamAmp: 20 });
  mctx.fillStyle = '#000000'; mctx.fillRect(0, 0, w, h);
  cctx.fillStyle = '#ffffff'; cctx.fillRect(0, 0, w, h);
  // scum line: a little glossier than the dry paint above it (the live wet band adds the real gloss below the water)
  for (const side of [1, -1]) {
    const V = (v: number) => (side > 0 ? v : 1 - v) * h;
    const g = rctx.createLinearGradient(0, V(0.165), 0, V(0.31));
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.08, 'rgba(0,0,0,0.16)'); g.addColorStop(0.5, 'rgba(0,0,0,0.12)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    rctx.fillStyle = g;
    rctx.fillRect(0, Math.min(V(0.165), V(0.31)), w, Math.abs(V(0.31) - V(0.165)));
  }
  grime(rctx, rng, w, h, 100, 0.22, '160,160,160');
  // scuffs: dock rash along the sides at deck height and boot marks on the walkways (dull, slightly lighter)
  for (let i = 0; i < 260; i++) {
    const side = rng.next() < 0.5 ? 1 : -1, onDeck = rng.next() < 0.45;
    const v = onDeck ? rng.range(0.005, 0.06) : rng.range(0.10, 0.19), y = (side > 0 ? v : 1 - v) * h;
    const x = rng.range(0, w), len = rng.range(6, 40), a = rng.range(0.15, 0.45);
    rctx.strokeStyle = `rgba(200,200,200,${a})`; rctx.lineWidth = rng.range(0.8, 2.5);
    rctx.beginPath(); rctx.moveTo(x, y); rctx.lineTo(x + len, y + rng.range(-4, 4)); rctx.stroke();
    actx.strokeStyle = `rgba(${onDeck ? '120,118,112' : '225,228,230'},${a * 0.5})`; actx.lineWidth = rng.range(0.6, 1.6);
    actx.beginPath(); actx.moveTo(x, y); actx.lineTo(x + len, y + rng.range(-4, 4)); actx.stroke();
  }
  // bare deck and anti-slip walkway: drawn last so nothing painted bleeds onto them
  band(rctx, 0, 0.118, '#9c9c9c');
  band(rctx, 0, 0.066, '#dadada');
  band(mctx, 0, 0.118, '#e6e6e6');
  band(mctx, 0, 0.066, '#1f1f1f');
  band(cctx, 0, 0.118, '#000000');
  // oxidised patches and boot scuffs on the deck vary its satin finish
  for (let i = 0; i < 120; i++) {
    const side = rng.next() < 0.5 ? 1 : -1, v = rng.range(0.0, 0.115), y = (side > 0 ? v : 1 - v) * h;
    wear(rctx, rng.range(0, w), y, rng.range(10, 40), rng.range(3, 8), rng.range(-30, 30));
  }
  const packed = toTexture(packRGB(cc, rc, mc), false);
  return { map: toTexture(ac, true), roughnessMap: packed, metalnessMap: packed, clearcoatMap: packed, normalMap: toTexture(heightToNormal(hc, 2.2), false) };
}
