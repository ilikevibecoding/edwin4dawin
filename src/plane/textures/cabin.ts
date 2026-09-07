import { Rng } from '../../core/seed';
import { canvas, grime, heightToNormal, toTexture, type FuselageLayout, type PbrMaps } from './common';

/** Where the cabin lining changes: everything in body metres, converted through the fuselage layout. */
export interface CabinLayout {
  /** firewall / rear bulkhead stations */
  front: number;
  rear: number;
  /** window sill, side-window top, cabin floor heights */
  sill: number;
  winTop: number;
  floor: number;
  /** door skin: front / aft station and bottom height (top is the sill) */
  door: { x0: number; x1: number; yBot: number };
  /** headliner cross seams (window pillar stations) */
  bows: number[];
}

/**
 * Cabin lining, laid out like the fuselage paint (same u/v, the inner shell is the outer loft inset): perforated
 * vinyl headliner with stitched longitudinal seams and cross seams at the bows, darker toward the crest (the
 * light comes in through the windows below it), dark window-band trim with a lighter sill ledge, vinyl sidewall
 * panels with a woven fabric insert and a kick strip at the floor, and the door panel with its stitched border
 * and map pocket. The normal map is a separate tileable vinyl grain (the material tiles it by `repeat`), so the
 * grain stays fine at the 10 cm the headliner is from the pilot's eye while the seams live in the albedo.
 */
export function cabinMaps(lay: FuselageLayout, cab: CabinLayout): PbrMaps {
  const w = 2048, h = 1024;
  const rng = new Rng('cabin-lining');
  const [ac, actx] = canvas(w, h);
  const [rc, rctx] = canvas(w / 2, h / 2);
  rctx.scale(0.5, 0.5);
  const U = (x: number) => lay.uOf(x) * w;
  const V = (v: number, side: 1 | -1) => (side > 0 ? v : 1 - v) * h;
  const vAt = (x: number, y: number) => lay.vOf(x, y) ?? 0.5;
  // dark trim everywhere the lining does not reach (window reveals sample the corner texel, the bulkheads the ends)
  actx.fillStyle = '#2b2d31'; actx.fillRect(0, 0, w, h);
  rctx.fillStyle = '#8c8c8c'; rctx.fillRect(0, 0, w, h);
  /** fill between the v-curves of heights y0 > y1 over stations x0 > x1 (both sides) */
  const band = (ctx: CanvasRenderingContext2D, x0: number, x1: number, y0: number, y1: number, style: string) => {
    for (const side of [1, -1] as (1 | -1)[]) {
      ctx.beginPath();
      const n = 24;
      for (let i = 0; i <= n; i++) { const x = x0 + (x1 - x0) * (i / n); const p = [U(x), V(vAt(x, y0), side)]; i === 0 ? ctx.moveTo(p[0], p[1]) : ctx.lineTo(p[0], p[1]); }
      for (let i = n; i >= 0; i--) { const x = x0 + (x1 - x0) * (i / n); ctx.lineTo(U(x), V(vAt(x, y1), side)); }
      ctx.closePath();
      ctx.fillStyle = style; ctx.fill();
    }
  };
  const { front, rear, sill, winTop, floor } = cab;
  const FL = front + 0.02, RR = rear - 0.02;
  // ---- headliner: from the crest down to the window tops, per column so the gradient follows the roof
  for (let px = Math.floor(U(FL)); px <= U(RR); px += 4) {
    const x = lay.xOf(px / w), vTop = vAt(x, winTop);
    for (const side of [1, -1] as (1 | -1)[]) {
      const g = actx.createLinearGradient(0, V(0, side), 0, V(vTop, side));
      g.addColorStop(0, '#a7a39a'); g.addColorStop(0.45, '#bdb9b0'); g.addColorStop(1, '#cbc7be');
      actx.fillStyle = g; actx.fillRect(px, Math.min(V(0, side), V(vTop, side)), 4, Math.abs(V(vTop, side) - V(0, side)));
      // perforated headliner vinyl is matte (0.9): at the sidewall's 0.55 the grain normals broke a low sun coming
      // through the windshield into a field of orange sparkles across the whole roof
      rctx.fillStyle = '#e6e6e6'; rctx.fillRect(px, Math.min(V(0, side), V(vTop, side)), 4, Math.abs(V(vTop, side) - V(0, side)));
    }
  }
  // perforation: a fine stagger of darker dots (reads as texture from the seat, not as a grid)
  const vTopMid = vAt(0.5, winTop);
  for (let y = 0; y < vTopMid * h; y += 3) {
    for (let x = U(FL) + ((y / 3) % 2) * 1.5; x < U(RR); x += 3) {
      actx.fillStyle = `rgba(60,55,50,${0.07 + rng.next() * 0.06})`;
      actx.fillRect(x, y, 1, 1); actx.fillRect(x, h - y - 1, 1, 1);
    }
  }
  // stitched longitudinal seams at the crest and either side of it, following the roof's v at those half-widths
  const seam = (ctx: CanvasRenderingContext2D, pts: [number, number][], dark: string, light: string, stitch = true) => {
    ctx.lineWidth = 2.2; ctx.strokeStyle = dark; ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke();
    ctx.lineWidth = 1; ctx.strokeStyle = light; ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y + 2) : ctx.moveTo(x, y + 2))); ctx.stroke();
    if (!stitch) return;
    ctx.fillStyle = 'rgba(245,242,235,0.55)';
    for (let i = 0; i < pts.length - 1; i++) { const [x0, y0] = pts[i], [x1, y1] = pts[i + 1]; for (let f = 0; f < 1; f += 0.25) ctx.fillRect(x0 + (x1 - x0) * f, y0 + (y1 - y0) * f - 4, 2.5, 1); }
  };
  for (const z of [0, 0.30, 0.56]) {
    for (const side of [1, -1] as (1 | -1)[]) {
      if (z === 0 && side < 0) continue;
      const pts: [number, number][] = [];
      for (let x = FL; x >= RR; x -= 0.04) pts.push([U(x), V(z === 0 ? 0.001 : lay.topV(x, z), side)]);
      seam(actx, pts, 'rgba(70,64,58,0.7)', 'rgba(255,252,246,0.35)');
    }
  }
  // cross seams / bows at the pillars
  for (const x of cab.bows) {
    for (const side of [1, -1] as (1 | -1)[]) {
      const vT = vAt(x, winTop);
      seam(actx, [[U(x), V(0, side)], [U(x), V(vT, side)]], 'rgba(70,64,58,0.8)', 'rgba(255,252,246,0.3)', false);
    }
  }
  // ---- window band: dark vinyl trim (the pillars) with a pale ledge along the sill
  band(actx, FL, RR, winTop, sill - 0.005, '#34373c');
  band(actx, FL, RR, sill + 0.035, sill - 0.005, '#6a6e74');
  band(actx, FL, RR, sill + 0.008, sill - 0.005, '#4a4d52');
  band(rctx, FL, RR, winTop, sill, '#909090');
  // ---- sidewall panels: upper vinyl, woven insert, lower vinyl, kick strip; darker toward the floor
  band(actx, FL, RR, sill, floor - 0.05, '#8f8a81');
  band(actx, FL, RR, 0.16, -0.12, '#5e5b55');
  band(actx, FL, RR, floor + 0.12, floor - 0.05, '#2f3135');
  band(rctx, FL, RR, sill, floor, '#7a7a7a');
  band(rctx, FL, RR, 0.16, -0.12, '#dcdcdc');
  band(rctx, FL, RR, floor + 0.12, floor - 0.05, '#a0a0a0');
  // woven insert: two-direction fine hatch
  { const v0 = vAt(0.5, 0.16), v1 = vAt(0.5, -0.12);
    for (const side of [1, -1] as (1 | -1)[]) {
      const ya = Math.min(V(v0, side), V(v1, side)), yb = Math.max(V(v0, side), V(v1, side));
      for (let y = ya; y < yb; y += 3) for (let x = U(FL); x < U(RR); x += 3) {
        actx.fillStyle = ((Math.floor(x / 3) + Math.floor(y / 3)) & 1) ? 'rgba(255,250,240,0.10)' : 'rgba(20,18,15,0.16)';
        actx.fillRect(x, y, 3, 1.5);
      }
    }
  }
  // floor shadow (AO) up the sidewall and under the seats
  for (const side of [1, -1] as (1 | -1)[]) {
    const v0 = vAt(0.5, floor + 0.35), v1 = vAt(0.5, floor - 0.05);
    const g = actx.createLinearGradient(0, V(v0, side), 0, V(v1, side));
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.42)');
    actx.fillStyle = g; actx.fillRect(U(FL), Math.min(V(v0, side), V(v1, side)), U(RR) - U(FL), Math.abs(V(v1, side) - V(v0, side)));
  }
  // ---- door panel: its own vinyl shade, a stitched border 2 cm in, an armrest shadow and a map pocket
  { const d = cab.door;
    band(actx, d.x0, d.x1, sill - 0.002, d.yBot, '#9c968c');
    band(rctx, d.x0, d.x1, sill, d.yBot, '#707070');
    for (const side of [1, -1] as (1 | -1)[]) {
      const rect = (x0: number, x1: number, y0: number, y1: number): [number, number][] => [[U(x0), V(vAt(x0, y0), side)], [U(x1), V(vAt(x1, y0), side)], [U(x1), V(vAt(x1, y1), side)], [U(x0), V(vAt(x0, y1), side)], [U(x0), V(vAt(x0, y0), side)]];
      seam(actx, rect(d.x0 - 0.03, d.x1 + 0.03, sill - 0.03, d.yBot + 0.03), 'rgba(60,55,50,0.75)', 'rgba(255,252,246,0.3)');
      // map pocket: a slab with its own top edge highlight and a shadow beneath
      const pk = rect(d.x0 - 0.12, d.x1 + 0.12, -0.02, d.yBot + 0.10);
      actx.beginPath(); pk.forEach(([x, y], i) => (i ? actx.lineTo(x, y) : actx.moveTo(x, y))); actx.closePath();
      actx.fillStyle = '#7d7870'; actx.fill();
      seam(actx, pk, 'rgba(40,36,32,0.8)', 'rgba(255,252,246,0.4)');
      // armrest shadow band
      const ar = rect(d.x0 - 0.10, d.x1 + 0.12, 0.20, 0.13);
      actx.beginPath(); ar.forEach(([x, y], i) => (i ? actx.lineTo(x, y) : actx.moveTo(x, y))); actx.closePath();
      actx.fillStyle = 'rgba(0,0,0,0.28)'; actx.fill();
    }
  }
  // scuffs and grime: heel marks on the kick strips, hand grime around the door
  grime(actx, rng, w, h, 60, 0.07, '30,26,22');
  for (let i = 0; i < 50; i++) {
    const side = rng.next() < 0.5 ? 1 : -1, x = rng.range(U(front), U(rear)), y = V(vAt(0.5, floor + rng.range(0.0, 0.14)), side as 1 | -1);
    actx.strokeStyle = `rgba(20,18,16,${rng.range(0.1, 0.35)})`; actx.lineWidth = rng.range(0.6, 1.8);
    actx.beginPath(); actx.moveTo(x, y); actx.lineTo(x + rng.range(-14, 14), y + rng.range(-3, 3)); actx.stroke();
  }
  // ---- tileable vinyl grain (height -> normal); the material repeats it many times over the lining
  const S = 256;
  const [gc, gctx] = canvas(S, S);
  gctx.fillStyle = '#808080'; gctx.fillRect(0, 0, S, S);
  for (let i = 0; i < 2600; i++) {
    const x = rng.range(0, S), y = rng.range(0, S), r = rng.range(1.5, 5);
    const g = gctx.createRadialGradient(x, y, 0, x, y, r);
    const up = rng.next() < 0.5;
    g.addColorStop(0, up ? 'rgba(255,255,255,0.28)' : 'rgba(0,0,0,0.28)'); g.addColorStop(1, up ? 'rgba(255,255,255,0)' : 'rgba(0,0,0,0)');
    gctx.fillStyle = g;
    for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) gctx.fillRect(x - r + ox, y - r + oy, r * 2, r * 2);
  }
  // leather-like crease network between the grain bumps (short dark strokes, wrapped so the tile stays seamless)
  gctx.lineCap = 'round';
  for (let i = 0; i < 900; i++) {
    const x = rng.range(0, S), y = rng.range(0, S), a = rng.range(0, Math.PI * 2), l = rng.range(3, 11);
    gctx.strokeStyle = `rgba(0,0,0,${rng.range(0.12, 0.3)})`; gctx.lineWidth = rng.range(0.7, 1.4);
    for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) {
      gctx.beginPath(); gctx.moveTo(x + ox, y + oy); gctx.lineTo(x + ox + Math.cos(a) * l, y + oy + Math.sin(a) * l); gctx.stroke();
    }
  }
  const normal = toTexture(heightToNormal(gc, 2.0), false, 4);
  normal.repeat.set(28, 14);
  return { map: toTexture(ac, true), roughnessMap: toTexture(rc, false, 4), normalMap: normal };
}
