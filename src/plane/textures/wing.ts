import { Rng } from '../../core/seed';
import { canvas, chips, grime, heightToNormal, LIVERY, orangePeelNormal, packRGB, panels, panelVariation, toTexture, wear, type PbrMaps } from './common';

/**
 * Layout of the shared wing / tail paint: the wing occupies texture rows v 0 .. WING_V1 (root .. tip), the tail
 * surfaces the band TAIL_V0 .. 1 at the same metres-per-texel spanwise scale as the wing (TAIL_SPAN metres of
 * span in the band, the tip at v = 1) so their rib lines and rivets come out at the wing's density instead of
 * being squeezed into a tile grid.
 */
export const WING_TEX = { WING_V1: 0.78, TAIL_V0: 0.80, TAIL_SPAN: 2.55 } as const;
/** texture v of span station z on the wing (root 0 .. tip = span) */
export const wingV = (z: number, span: number): number => Math.min(1, Math.max(0, z / span)) * WING_TEX.WING_V1;
/** texture v of span station z on a tail surface whose tip (z = span) lands at the band's tip end */
export const tailV = (z: number, span: number): number => 0.997 - (0.997 - WING_TEX.TAIL_V0) * Math.min(1, Math.max(0, (span - z) / WING_TEX.TAIL_SPAN));

/** Wing (both halves) and tail: u chordwise (0 trailing edge -> 0.5 leading edge -> 1 trailing), v spanwise. */
export function wingMaps(): PbrMaps {
  const w = 1024, h = 1024;
  const rng = new Rng('wing-paint');
  const [ac, actx] = canvas(w, h);
  const [hc, hctx] = canvas(w, h);
  const [rc, rctx] = canvas(w, h);
  const W1 = WING_TEX.WING_V1, T0 = WING_TEX.TAIL_V0;
  const wy = (v: number) => v * W1 * h;      // wing-relative v (0 root .. 1 tip) -> canvas row
  const ty = (m: number) => (1 - (1 - T0) * (1 - m / WING_TEX.TAIL_SPAN)) * h; // tail: metres from the root end of the band
  hctx.fillStyle = '#808080'; hctx.fillRect(0, 0, w, h);
  // white upper surface (u < 0.5), cream underside (u > 0.5) so the wing reads as a thin flat panel from below
  actx.fillStyle = LIVERY.upper; actx.fillRect(0, 0, w, h);
  actx.fillStyle = LIVERY.under; actx.fillRect(w * 0.5, 0, w * 0.5, wy(1));
  // yellow wingtip with a navy band and red pinstripe, yellow leading-edge stripe
  actx.fillStyle = LIVERY.lower; actx.fillRect(0, wy(0.905), w, wy(1) - wy(0.905));
  actx.fillStyle = LIVERY.cheat; actx.fillRect(0, wy(0.885), w, wy(0.905) - wy(0.885));
  actx.fillStyle = LIVERY.pin; actx.fillRect(0, wy(0.876), w, wy(0.885) - wy(0.876));
  // leading-edge stripe: 5% chord over the top, 1.5% under (u 0.5 is the leading edge), so the wing keeps a thin
  // yellow edge instead of a yellow nose when seen from below
  actx.fillStyle = LIVERY.lower; actx.fillRect(w * 0.475, 0, w * 0.0325, h);
  // rib lines spanwise every ~0.55 m, spar and hinge lines chordwise
  const ribs: number[] = [];
  for (let v = 0.04; v < 0.87; v += 0.075) ribs.push(v * W1);
  panels(hctx, actx, w, h, [0.14, 0.33, 0.5, 0.67, 0.86], ribs, 22, { y1: wy(1) });
  // walkway by the root and a fuel cap on the upper surface
  actx.fillStyle = '#2a2d31'; actx.fillRect(w * 0.30, wy(0.12), w * 0.11, wy(0.20) - wy(0.12));
  actx.fillStyle = '#6d7277'; actx.beginPath(); actx.arc(w * 0.40, wy(0.27), 9, 0, 7); actx.fill();
  // ---- underside (u > 0.5): the side the pilot and the dock see. Extra rivet rows along the ribs, screwed
  // inspection panels, the fuel drains with their stain trails, the strut fittings' doubler plates, a fuel
  // vent, and airflow-aligned grime streaks running from the leading edge aft
  { const ux = (f: number) => w * (0.5 + 0.5 * f); // f: chord fraction from the leading edge (0) to the trailing edge (1)
    // denser rivet rows along every rib on the underside (the stringersV rows above are shared with the top)
    for (const rv of ribs) {
      const y = rv * h;
      for (let x = ux(0.03); x < ux(0.98); x += 11) {
        hctx.fillStyle = '#b4b4b4'; hctx.beginPath(); hctx.arc(x, y - 5, 1.4, 0, 7); hctx.fill();
        actx.fillStyle = 'rgba(0,0,0,0.09)'; actx.beginPath(); actx.arc(x, y - 4, 1.1, 0, 7); actx.fill();
      }
    }
    // inspection panels: 9 cm rounded plates with four screws, staggered along the spar lines
    const plate = (x: number, y: number, pw: number, ph: number) => {
      actx.fillStyle = 'rgba(0,0,0,0.10)'; actx.beginPath(); actx.roundRect(x - pw / 2, y - ph / 2, pw, ph, 3); actx.fill();
      actx.strokeStyle = 'rgba(30,30,35,0.4)'; actx.lineWidth = 1.2; actx.beginPath(); actx.roundRect(x - pw / 2, y - ph / 2, pw, ph, 3); actx.stroke();
      hctx.strokeStyle = '#6a6a6a'; hctx.lineWidth = 1.6; hctx.beginPath(); hctx.roundRect(x - pw / 2, y - ph / 2, pw, ph, 3); hctx.stroke();
      for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        const px = x + sx * (pw / 2 - 4), py = y + sy * (ph / 2 - 4);
        hctx.fillStyle = '#5a5a5a'; hctx.beginPath(); hctx.arc(px, py, 1.8, 0, 7); hctx.fill();
        actx.fillStyle = 'rgba(0,0,0,0.35)'; actx.beginPath(); actx.arc(px, py, 1.5, 0, 7); actx.fill();
      }
    };
    for (const [f, v, pw, ph] of [[0.42, 0.10, 20, 16], [0.75, 0.16, 16, 16], [0.42, 0.26, 20, 16], [0.75, 0.34, 16, 16], [0.42, 0.43, 20, 16], [0.75, 0.52, 16, 16], [0.42, 0.61, 20, 16], [0.75, 0.70, 16, 16], [0.42, 0.79, 20, 16]]) plate(ux(f), wy(v), pw, ph);
    // strut fitting doublers at the spar / strut stations (model.ts strutZ 2.9 m of the 7.3 m span)
    for (const f of [0.30, 0.66]) plate(ux(f), wy(2.9 / 7.3), 30, 22);
    // fuel drains: a dark boss with a pale stain trail blown aft by the slipstream; fuel vent tube by the tank
    for (const [f, v] of [[0.36, 0.14], [0.36, 0.30]]) {
      const x = ux(f), y = wy(v);
      const g = actx.createLinearGradient(x, 0, ux(f + 0.45), 0);
      g.addColorStop(0, 'rgba(120,105,70,0.30)'); g.addColorStop(0.3, 'rgba(120,105,70,0.14)'); g.addColorStop(1, 'rgba(120,105,70,0)');
      actx.fillStyle = g; actx.beginPath(); actx.moveTo(x, y - 3); actx.lineTo(ux(f + 0.45), y - 9); actx.lineTo(ux(f + 0.45), y + 9); actx.lineTo(x, y + 3); actx.closePath(); actx.fill();
      actx.fillStyle = '#3b3d40'; actx.beginPath(); actx.arc(x, y, 3.2, 0, 7); actx.fill();
      hctx.fillStyle = '#404040'; hctx.beginPath(); hctx.arc(x, y, 3.5, 0, 7); hctx.fill();
    }
    actx.fillStyle = '#4a4d50'; actx.fillRect(ux(0.55) - 2, wy(0.22) - 7, 4, 14);
    // grime streaks along the airflow (from the leading edge aft), heavier toward the root and behind the fittings
    for (let i = 0; i < 70; i++) {
      const v = rng.range(0.02, 0.86), f0 = rng.range(0.05, 0.6), len = rng.range(0.1, 0.4);
      const g = actx.createLinearGradient(ux(f0), 0, ux(f0 + len), 0);
      const a = rng.range(0.04, 0.12) * (1.4 - v);
      g.addColorStop(0, `rgba(70,65,60,${a})`); g.addColorStop(1, 'rgba(70,65,60,0)');
      actx.fillStyle = g; actx.fillRect(ux(f0), wy(v), ux(f0 + len) - ux(f0), rng.range(1, 3));
    }
  }
  // ---- tail band: one colour both sides, yellow tip cap with the navy / red bands, ribs every 0.55 m at half the
  // wing's line strength (the fin is seen close up from the rear quarter: crisp tiles read as a grid)
  const tipM = WING_TEX.TAIL_SPAN - 0.26, cheatM = tipM - 0.05, pinM = cheatM - 0.025;
  actx.fillStyle = LIVERY.lower; actx.fillRect(0, ty(tipM), w, h - ty(tipM));
  actx.fillStyle = LIVERY.cheat; actx.fillRect(0, ty(cheatM), w, ty(tipM) - ty(cheatM));
  actx.fillStyle = LIVERY.pin; actx.fillRect(0, ty(pinM), w, ty(cheatM) - ty(pinM));
  const tailRibs: number[] = [];
  for (let m = 0.12; m < pinM - 0.1; m += 0.55) tailRibs.push(ty(m) / h);
  panels(hctx, actx, w, h, [0.3, 0.7], tailRibs, 36, { y0: T0 * h, strength: 0.5 });
  // elevator trim tabs (both elevators, both faces): hinge line 13 cm ahead of the trailing edge and the two side
  // gaps, on the stabiliser's rows only (the elevator spans z 0.12 .. 2.28 of a 2.45 m half span; the rudder's rows
  // start at v 0.877 and are not touched). Drawn as a groove in the height map and a dark line in the albedo.
  {
    const span = 2.45, z0 = 0.38, z1 = 0.88, chordAt = (z: number) => 1.05 - 0.25 * (z / span);
    const vAt = (z: number) => (0.997 - (0.997 - T0) * ((span - z) / WING_TEX.TAIL_SPAN)) * h;
    const uTop = (z: number) => 0.5 * (0.13 / chordAt(z)) * w;
    for (const [ctx, style, lw] of [[hctx, '#484848', 2.2], [actx, 'rgba(20,20,25,0.55)', 1.6]] as const) {
      ctx.strokeStyle = style; ctx.lineWidth = lw;
      for (const mirror of [false, true]) {
        const U = (u: number) => (mirror ? w - u : u);
        ctx.beginPath();
        ctx.moveTo(U(0), vAt(z0)); ctx.lineTo(U(uTop(z0)), vAt(z0)); ctx.lineTo(U(uTop(z1)), vAt(z1)); ctx.lineTo(U(0), vAt(z1));
        ctx.stroke();
      }
    }
  }
  // packed clear coat (R) / roughness (G) / metalness (B) companions of the roughness canvas: chips down to the metal
  // along the leading edges (stones, spray, ice) and around the strut fittings and the fuel cap; the walkway grit has
  // no clear coat and the stripe decals keep theirs
  const [mc, mctx] = canvas(w, h);
  const [kc, kctx] = canvas(w, h);
  mctx.fillStyle = '#000000'; mctx.fillRect(0, 0, w, h);
  kctx.fillStyle = '#ffffff'; kctx.fillRect(0, 0, w, h);
  chips(actx, mctx, kctx, rng, w * 0.5, wy(0.5), 7, wy(0.5), 260, 1.4);
  chips(actx, mctx, kctx, rng, w * 0.5, (T0 + 0.5 * (1 - T0)) * h, 5, 0.5 * (1 - T0) * h, 60, 1.2);
  for (const f of [0.30, 0.66]) chips(actx, mctx, kctx, rng, w * (0.5 + 0.5 * f), wy(2.9 / 7.3), 26, 18, 18, 1.5);
  chips(actx, mctx, kctx, rng, w * 0.40, wy(0.27), 16, 16, 10, 1.4);
  grime(actx, rng, w, h, 80, 0.06);
  // base coat: ~0.38 varying per skin panel (spar / rib bays), rougher along the rivet seams, chipped and rubbed
  // along the leading edge, the walkway is anti-slip grit, the underside a touch duller than the top coat
  const spars = [0.14, 0.33, 0.5, 0.67, 0.86];
  rctx.fillStyle = '#606060'; rctx.fillRect(0, 0, w, h);
  panelVariation(rctx, w, h, spars, ribs, rng, 13, 'all', { y1: wy(1), seam: 3, seamAmp: 18 });
  panelVariation(rctx, w, h, [0.3, 0.7], tailRibs, rng, 11, 'all', { y0: T0 * h, seam: 3, seamAmp: 14 });
  rctx.fillStyle = 'rgba(255,255,255,0.16)'; rctx.fillRect(w * 0.47, 0, w * 0.06, h);
  rctx.fillStyle = '#9a9a9a'; rctx.fillRect(w * 0.30, wy(0.12), w * 0.11, wy(0.20) - wy(0.12));
  rctx.fillStyle = 'rgba(255,255,255,0.10)'; rctx.fillRect(w * 0.5, 0, w * 0.5, wy(1));
  // strut fittings and the fuel cap get handled: rubbed paint
  for (const f of [0.30, 0.66]) wear(rctx, w * (0.5 + 0.5 * f), wy(2.9 / 7.3), 40, 30, 30);
  wear(rctx, w * 0.40, wy(0.27), 30, 30, 26);
  grime(rctx, rng, w, h, 90, 0.2, '150,150,150');
  kctx.fillStyle = '#000000'; kctx.fillRect(w * 0.30, wy(0.12), w * 0.11, wy(0.20) - wy(0.12));
  // clear-coat roughness (green): the upper surfaces (u < 0.5) face the sun all day and chalk to 0.24, the
  // undersides stay a waxed 0.11, the tail (both faces in the same band) sits between at 0.16; +-0.05 per skin
  // panel, dull seams, matte walkway, the chipped leading edge duller still
  const [cc, cctx] = canvas(w / 4, h / 4);
  cctx.scale(0.25, 0.25);
  cctx.fillStyle = 'rgb(0,61,0)'; cctx.fillRect(0, 0, w * 0.5, wy(1));
  cctx.fillStyle = 'rgb(0,28,0)'; cctx.fillRect(w * 0.5, 0, w * 0.5, wy(1));
  cctx.fillStyle = 'rgb(0,41,0)'; cctx.fillRect(0, T0 * h, w, h - T0 * h);
  panelVariation(cctx, w, h, spars, ribs, rng, 13, 'g', { y1: wy(1), seam: 8, seamAmp: 16 });
  panelVariation(cctx, w, h, [0.3, 0.7], tailRibs, rng, 10, 'g', { y0: T0 * h, seam: 8, seamAmp: 12 });
  cctx.fillStyle = 'rgba(0,255,0,0.12)'; cctx.fillRect(w * 0.47, 0, w * 0.06, h);
  cctx.fillStyle = 'rgb(0,150,0)'; cctx.fillRect(w * 0.30, wy(0.12), w * 0.11, wy(0.20) - wy(0.12));
  for (const f of [0.30, 0.66]) wear(cctx, w * (0.5 + 0.5 * f), wy(2.9 / 7.3), 40, 30, 26, 'g');
  const packed = toTexture(packRGB(kc, rc, mc), false);
  return { map: toTexture(ac, true), roughnessMap: packed, metalnessMap: packed, clearcoatMap: packed, normalMap: toTexture(heightToNormal(hc, 2.0), false), clearcoatRoughnessMap: toTexture(cc, false), clearcoatNormalMap: orangePeelNormal(rng, 24, 48) };
}
