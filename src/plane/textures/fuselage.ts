import { Rng } from '../../core/seed';
import { canvas, CHEAT_LINE, grime, heightToNormal, LIVERY, orangePeelNormal, packRGB, panels, panelVariation, toTexture, wear, type FuselageLayout, type PbrMaps } from './common';

/**
 * Text painted on both sides of the body so it reads left-to-right from outside. The loft's u runs nose -> tail,
 * so the starboard side (where the nose is to the reader's right) needs a horizontal flip and the port side
 * (v increasing upwards) a vertical flip. Glyphs are stretched by the local v/u scale ratio to stay isotropic.
 */
function bodyText(ctx: CanvasRenderingContext2D, lay: FuselageLayout, w: number, h: number, text: string, x: number, y: number, heightM: number, weight: string, family: string, color: string): void {
  const pxU = w / lay.length;
  const fontPx = heightM / 0.72 * pxU;
  // the glyphs are rendered once in body metres (isotropic), then copied column by column so that every column
  // sits at the local v of the text height and is scaled by the local texels-per-metre: the word follows the
  // sill droop and keeps a constant physical height across stations whose perimeter changes
  const boxH = Math.ceil(fontPx * 1.6);
  const [tc, tctx] = canvas(w, boxH);
  tctx.fillStyle = color;
  tctx.font = `${weight} ${fontPx.toFixed(1)}px ${family}`;
  tctx.textAlign = 'center';
  tctx.textBaseline = 'middle';
  tctx.fillText(text, w / 2, boxH / 2);
  const textW = Math.ceil(tctx.measureText(text).width) + 4;
  const u0 = lay.uOf(x) * w;
  const dvdy = (xs: number): number => {
    const a = lay.vOf(xs, y + 0.01), b = lay.vOf(xs, y - 0.01);
    return a !== null && b !== null ? (b - a) / 0.02 : (h / lay.perimeter(xs)) / h;
  };
  for (const side of [1, -1]) {
    for (let c = -textW / 2; c < textW / 2; c++) {
      // starboard reads left-to-right from outside with the nose to the right, so its columns are mirrored in u
      const du = u0 + (side > 0 ? -c : c);
      const xs = lay.xOf(du / w);
      const v = lay.vOf(xs, y) ?? 0.25;
      const pxPerM = dvdy(xs) * h;                 // texels per metre of height at this column
      const dh = boxH / pxU * pxPerM;              // destination height of the glyph box
      const vc = (side > 0 ? v : 1 - v) * h;
      ctx.save();
      ctx.translate(du, vc);
      ctx.scale(1, side > 0 ? 1 : -1);
      ctx.drawImage(tc, w / 2 + c, 0, 1, boxH, 0, -dh / 2, 1, dh);
      ctx.restore();
    }
  }
}

/** Fuselage: u = nose(0) .. tail(1), v = top(0) .. starboard(0.25) .. belly(0.5) .. port(0.75) .. top(1). */
export function fuselageMaps(lay: FuselageLayout): PbrMaps {
  const w = 2048, h = 1024;
  const rng = new Rng('fuselage-paint');
  const [ac, actx] = canvas(w, h);
  const [hc, hctx] = canvas(w, h);
  const [rc, rctx] = canvas(w, h);
  hctx.fillStyle = '#808080'; hctx.fillRect(0, 0, w, h);
  actx.fillStyle = LIVERY.upper; actx.fillRect(0, 0, w, h);
  // livery bands follow body heights: white above the sill, a navy cheat band with a red pinstripe, yellow below
  const cols: { px: number; cheatTop: number; cheatBot: number; pinBot: number }[] = [];
  const vLow = (x: number, y: number) => lay.vOf(x, y) ?? 0.5;
  for (let px = 0; px <= w; px += 8) {
    const x = lay.xOf(px / w), ys = lay.sillY(x);
    cols.push({ px, cheatTop: vLow(x, ys - CHEAT_LINE.top), cheatBot: vLow(x, ys - CHEAT_LINE.bottom), pinBot: vLow(x, ys - CHEAT_LINE.pin) });
  }
  const band = (top: (c: typeof cols[0]) => number, bot: (c: typeof cols[0]) => number, color: string, side: 1 | -1) => {
    const V = (v: number) => (side > 0 ? v : 1 - v) * h;
    actx.beginPath();
    actx.moveTo(cols[0].px, V(top(cols[0])));
    for (const c of cols) actx.lineTo(c.px, V(top(c)));
    for (let i = cols.length - 1; i >= 0; i--) actx.lineTo(cols[i].px, V(bot(cols[i])));
    actx.closePath();
    actx.fillStyle = color;
    actx.fill();
  };
  // yellow lower body: from the starboard pinstripe around the belly to the port pinstripe
  band((c) => c.pinBot, (c) => 1 - c.pinBot, LIVERY.lower, 1);
  for (const side of [1, -1] as (1 | -1)[]) {
    band((c) => c.cheatTop, (c) => c.cheatBot, LIVERY.cheat, side);
    band((c) => c.cheatBot, (c) => c.pinBot, LIVERY.pin, side);
  }
  // the cheat band and pinstripe are vinyl decals: their edges stand a film's thickness proud of the paint (a
  // hairline ridge in the height map, so the edge catches a highlight above and a shadow below the clear coat)
  const edgeRidge = (v: (c: typeof cols[0]) => number, side: 1 | -1) => {
    const V = (x: number) => (side > 0 ? x : 1 - x) * h;
    hctx.strokeStyle = '#a8a8a8'; hctx.lineWidth = 2.0;
    hctx.beginPath(); hctx.moveTo(cols[0].px, V(v(cols[0]))); for (const c of cols) hctx.lineTo(c.px, V(v(c))); hctx.stroke();
    actx.strokeStyle = 'rgba(0,0,0,0.16)'; actx.lineWidth = 1.2;
    actx.beginPath(); actx.moveTo(cols[0].px, V(v(cols[0])) + (side > 0 ? 1.5 : -1.5)); for (const c of cols) actx.lineTo(c.px, V(v(c)) + (side > 0 ? 1.5 : -1.5)); actx.stroke();
  };
  for (const side of [1, -1] as (1 | -1)[]) { edgeRidge((c) => c.cheatTop, side); edgeRidge((c) => c.cheatBot, side); edgeRidge((c) => c.pinBot, side); }
  // anti-glare panel on the cowl top ahead of the windshield (straddles the v = 0/1 seam: one strip per side)
  const glare: [number, number][] = [];
  for (let x = 2.32; x <= 3.7; x += 0.1) glare.push([lay.uOf(x) * w, lay.topV(x, x > 3.4 ? 0.45 - (x - 3.4) * 0.9 : 0.45) * h]);
  actx.fillStyle = '#2a2d31';
  for (const side of [1, -1]) {
    const edge = side > 0 ? 0 : h;
    actx.beginPath();
    actx.moveTo(glare[0][0], edge);
    for (const [px, py] of glare) actx.lineTo(px, side > 0 ? py : h - py);
    actx.lineTo(glare[glare.length - 1][0], edge);
    actx.closePath();
    actx.fill();
  }
  // nose bowl (u 0 .. the bowl / cowl joint at x 4.22): bare polished aluminium (metalness from the packed map), with
  // faint circumferential brush marks; the joint itself is a raised lap edge with a ring of Dzus fasteners behind it
  const ringU = lay.uOf(4.22) * w;
  actx.fillStyle = '#c4c8cc'; actx.fillRect(0, 0, ringU, h);
  for (let i = 0; i < 60; i++) {
    const y = rng.range(0, h), a = rng.range(0.05, 0.16), light = rng.next() < 0.5;
    actx.fillStyle = light ? `rgba(255,255,255,${a})` : `rgba(60,64,70,${a})`;
    actx.fillRect(0, y, ringU, rng.range(1, 3));
  }
  hctx.fillStyle = '#5c5c5c'; hctx.fillRect(ringU - 3, 0, 3, h);
  actx.fillStyle = 'rgba(20,20,25,0.45)'; actx.fillRect(ringU - 2, 0, 2, h);
  /** Dzus fastener: a 12 mm dished button with a slot, drawn as a dark ring in the albedo and a dimple in the height map */
  const dzus = (x: number, y: number) => {
    hctx.fillStyle = '#6a6a6a'; hctx.beginPath(); hctx.arc(x, y, 2.6, 0, 7); hctx.fill();
    hctx.fillStyle = '#9a9a9a'; hctx.beginPath(); hctx.arc(x, y, 1.2, 0, 7); hctx.fill();
    actx.fillStyle = 'rgba(25,25,30,0.55)'; actx.beginPath(); actx.arc(x, y, 2.6, 0, 7); actx.fill();
    actx.fillStyle = 'rgba(200,200,205,0.55)'; actx.beginPath(); actx.arc(x, y, 1.5, 0, 7); actx.fill();
    actx.fillStyle = 'rgba(25,25,30,0.7)'; actx.fillRect(x - 1.6, y - 0.5, 3.2, 1);
  };
  for (let y = 12; y < h; y += 34) dzus(ringU + 9, y);
  // cowl side panels: the joint lines of the upper and lower panels along each side of the cowl (x 4.22 .. 3.20)
  // with their fastener rows, so the cowl reads as removable sheet-metal panels and not as one lofted shell
  const cowlAftU = lay.uOf(3.20) * w;
  for (const side of [1, -1]) {
    for (const vv of [0.125, 0.36]) {
      const y = (side > 0 ? vv : 1 - vv) * h;
      hctx.strokeStyle = '#5a5a5a'; hctx.lineWidth = 2; hctx.beginPath(); hctx.moveTo(ringU, y); hctx.lineTo(cowlAftU, y); hctx.stroke();
      actx.strokeStyle = 'rgba(20,20,25,0.35)'; actx.lineWidth = 1.5; actx.beginPath(); actx.moveTo(ringU, y); actx.lineTo(cowlAftU, y); actx.stroke();
      for (let x = ringU + 26; x < cowlAftU - 8; x += 30) dzus(x, y + (vv < 0.2 ? 6 : -6) * side);
    }
  }
  // registration on the white rear fuselage above the cheat line (clear of the float struts from the quarter views)
  // and the operator script under the cabin windows (both sides, readable)
  bodyText(actx, lay, w, h, LIVERY.registration, -3.05, 0.45, 0.15, 'bold', '"Helvetica Neue", Arial, sans-serif', LIVERY.cheat);
  bodyText(actx, lay, w, h, 'BAHÍA VISTA AIR TAXI', -0.25, 0.10, 0.085, 'bold italic', 'Georgia, "Times New Roman", serif', LIVERY.cheat);
  bodyText(hctx, lay, w, h, LIVERY.registration, -3.05, 0.45, 0.15, 'bold', '"Helvetica Neue", Arial, sans-serif', '#9a9a9a');
  bodyText(hctx, lay, w, h, 'BAHÍA VISTA AIR TAXI', -0.25, 0.10, 0.085, 'bold italic', 'Georgia, "Times New Roman", serif', '#9a9a9a');
  // panel lines / rivets
  const stations = [3.9, 3.2, 2.32, 1.85, 0.0, -0.9, -1.6, -2.6, -3.7, -4.7].map((x) => lay.uOf(x));
  const stringers = [0.12, 0.2, 0.3, 0.42, 0.5, 0.58, 0.7, 0.8, 0.88];
  panels(hctx, actx, w, h, stations, stringers, 26);
  // door outline under the door window (both sides) with a handle
  hctx.strokeStyle = '#3a3a3a'; hctx.lineWidth = 3;
  actx.strokeStyle = 'rgba(20,20,25,0.35)'; actx.lineWidth = 2;
  const du0 = lay.uOf(1.77) * w, du1 = lay.uOf(0.95) * w;
  for (const side of [1, -1]) {
    const v0 = lay.vOf(1.3, 0.40) ?? 0.2, v1 = lay.vOf(1.3, -0.42) ?? 0.4;
    const y0 = (side > 0 ? v0 : 1 - v0) * h, y1 = (side > 0 ? v1 : 1 - v1) * h;
    const top = Math.min(y0, y1), hh = Math.abs(y1 - y0);
    hctx.strokeRect(du0, top, du1 - du0, hh);
    actx.strokeRect(du0, top, du1 - du0, hh);
    const hv = lay.vOf(1.0, 0.05) ?? 0.25;
    actx.fillStyle = '#8a8f94'; actx.fillRect(du1 - 40, (side > 0 ? hv : 1 - hv) * h - 4, 22, 8);
  }
  // exhaust staining: a streak trailing aft from the exhaust stubs (starboard side, low), darkest at the stubs and
  // widening as it fades; the roughness map gets the same streak (soot is matte)
  const stubU = lay.uOf(2.75), stubV = vLow(2.75, -0.5), sootEndU = lay.uOf(-0.9);
  const sootStreak = (ctx: CanvasRenderingContext2D, rgb: string, a0: number) => {
    const soot = ctx.createLinearGradient(stubU * w, 0, sootEndU * w, 0);
    soot.addColorStop(0, `rgba(${rgb},${a0})`); soot.addColorStop(0.3, `rgba(${rgb},${a0 * 0.5})`); soot.addColorStop(1, `rgba(${rgb},0)`);
    ctx.fillStyle = soot;
    ctx.beginPath();
    ctx.moveTo(stubU * w, (stubV - 0.022) * h); ctx.lineTo(sootEndU * w, (stubV - 0.065) * h);
    ctx.lineTo(sootEndU * w, (stubV + 0.065) * h); ctx.lineTo(stubU * w, (stubV + 0.022) * h);
    ctx.closePath(); ctx.fill();
  };
  sootStreak(actx, '25,22,20', 0.72);
  // soot has a ragged, streaky texture: darker filaments inside the plume
  for (let i = 0; i < 40; i++) {
    const x0 = (stubU + rng.range(0, 0.02)) * w, y0 = (stubV + rng.range(-0.02, 0.02)) * h, len = rng.range(60, 400);
    const sg = actx.createLinearGradient(x0, 0, x0 + len, 0);
    sg.addColorStop(0, `rgba(20,18,16,${rng.range(0.15, 0.4)})`); sg.addColorStop(1, 'rgba(20,18,16,0)');
    actx.fillStyle = sg; actx.fillRect(x0, y0, len, rng.range(1, 3));
  }
  // oil streaks under the cowl (belly, v 0.5) trailing aft from the cowl seams and the cowl flap hinges
  for (let i = 0; i < 30; i++) {
    const x0 = lay.uOf(rng.range(2.9, 4.0)) * w, y0 = (0.5 + rng.range(-0.08, 0.08)) * h, len = rng.range(50, 220);
    const og = actx.createLinearGradient(x0, 0, x0 + len, 0);
    og.addColorStop(0, `rgba(35,30,22,${rng.range(0.2, 0.45)})`); og.addColorStop(1, 'rgba(35,30,22,0)');
    actx.fillStyle = og; actx.fillRect(x0, y0 - rng.range(1, 2), len, rng.range(2, 5));
  }
  // general grime and faint belly streaks along the airflow
  grime(actx, rng, w, h, 140, 0.08);
  for (let i = 0; i < 60; i++) {
    const x = rng.range(w * 0.1, w * 0.9), y = rng.range(h * 0.42, h * 0.58);
    actx.strokeStyle = `rgba(40,35,30,${rng.range(0.05, 0.2)})`;
    actx.lineWidth = rng.range(1, 3);
    actx.beginPath(); actx.moveTo(x, y); actx.lineTo(x + rng.range(30, 160), y + rng.range(-3, 3)); actx.stroke();
  }
  // sun-faded top: slightly lighter/desaturated
  actx.fillStyle = 'rgba(255,255,255,0.05)'; actx.fillRect(0, 0, w, h * 0.12); actx.fillRect(0, h * 0.88, w, h * 0.12);
  // roughness of the base coat under the clear coat: painted aluminium ~0.40, varying panel by panel (+-0.05) and
  // with wear (rubbed paint around the door handles, the boarding steps and the cowl fasteners, spray-dulled
  // belly, sun-chalked roof), rivet seams a touch rougher; the cowl ring 0.5, soot and grime rougher, scratches
  rctx.fillStyle = '#666666'; rctx.fillRect(0, 0, w, h);
  panelVariation(rctx, w, h, stations, stringers, rng, 13, 'all', { seam: 3, seamAmp: 18 });
  for (const side of [1, -1]) {
    const V = (v: number) => (side > 0 ? v : 1 - v) * h;
    wear(rctx, lay.uOf(1.0) * w, V(vLow(1.0, 0.05)), 70, 45, 34);                // door handle
    wear(rctx, lay.uOf(1.3) * w, V(vLow(1.3, -0.45)), 90, 40, 40);               // boarding step
    wear(rctx, lay.uOf(1.35) * w, V(vLow(1.35, 0.30)), 130, 30, 18);            // sill rub under the door window
    wear(rctx, lay.uOf(3.55) * w, V(vLow(3.55, 0.3)), 120, 60, 16);             // cowl fasteners
  }
  rctx.fillStyle = 'rgba(255,255,255,0.10)'; rctx.fillRect(0, h * 0.44, w, h * 0.12);   // spray-dulled belly
  rctx.fillStyle = 'rgba(255,255,255,0.05)'; rctx.fillRect(0, 0, w, h * 0.08); rctx.fillRect(0, h * 0.92, w, h * 0.08); // sun-chalked roof
  // polished bowl: roughness ~0.30 with the brush marks as streaks of 0.22 .. 0.40 (a hand-polished bowl is never
  // a mirror; the streaks stretch the sun's highlight around it)
  rctx.fillStyle = '#4d4d4d'; rctx.fillRect(0, 0, ringU, h);
  for (let i = 0; i < 90; i++) {
    const y = rng.range(0, h), a = rng.range(0.10, 0.30), light = rng.next() < 0.5;
    rctx.fillStyle = light ? `rgba(255,255,255,${a})` : `rgba(0,0,0,${a})`;
    rctx.fillRect(0, y, ringU, rng.range(1, 4));
  }
  sootStreak(rctx, '170,170,170', 0.7);
  // packed clear coat (R) / roughness (G) / metalness (B): the bowl is bare metal with no clear coat, the anti-glare
  // panel is a flat lacquer with a third of the coat's gloss, everything else is the clear-coated livery
  const [mc, mctx] = canvas(w, h);
  const [kc, kctx] = canvas(w, h);
  mctx.fillStyle = '#000000'; mctx.fillRect(0, 0, w, h);
  mctx.fillStyle = '#ffffff'; mctx.fillRect(0, 0, ringU - 3, h);
  kctx.fillStyle = '#ffffff'; kctx.fillRect(0, 0, w, h);
  kctx.fillStyle = '#000000'; kctx.fillRect(0, 0, ringU - 3, h);
  kctx.fillStyle = '#555555';
  for (const side of [1, -1]) {
    const edge = side > 0 ? 0 : h;
    kctx.beginPath();
    kctx.moveTo(glare[0][0], edge);
    for (const [px, py] of glare) kctx.lineTo(px, side > 0 ? py : h - py);
    kctx.lineTo(glare[glare.length - 1][0], edge);
    kctx.closePath();
    kctx.fill();
  }
  grime(rctx, rng, w, h, 160, 0.25, '150,150,150');
  for (let i = 0; i < 400; i++) {
    rctx.strokeStyle = `rgba(120,120,120,${rng.range(0.2, 0.5)})`;
    rctx.lineWidth = 1;
    const x = rng.range(0, w), y = rng.range(0, h);
    rctx.beginPath(); rctx.moveTo(x, y); rctx.lineTo(x + rng.range(-40, 40), y + rng.range(-6, 6)); rctx.stroke();
  }
  // clearcoat roughness (green channel): the engine cowl is polished a little glossier than the cabin/tail paint,
  // the matte anti-glare panel has no gloss to speak of and the soot streak dulls the coat
  const [cc, cctx] = canvas(w / 4, h / 4);
  cctx.scale(0.25, 0.25);
  cctx.fillStyle = 'rgb(0,36,0)'; cctx.fillRect(0, 0, w, h);
  // the gloss is what the eye reads: panels differ by up to +-0.035 in clear-coat roughness (0.10 .. 0.18), the
  // seams and the worn zones are duller, the belly is matted by spray and the roof by the sun
  panelVariation(cctx, w, h, stations, stringers, rng, 9, 'g', { seam: 8, seamAmp: 16 });
  for (const side of [1, -1]) {
    const V = (v: number) => (side > 0 ? v : 1 - v) * h;
    wear(cctx, lay.uOf(1.0) * w, V(vLow(1.0, 0.05)), 70, 45, 30, 'g');
    wear(cctx, lay.uOf(1.3) * w, V(vLow(1.3, -0.45)), 90, 40, 36, 'g');
    wear(cctx, lay.uOf(1.35) * w, V(vLow(1.35, 0.30)), 130, 30, 14, 'g');
  }
  cctx.fillStyle = 'rgba(0,255,0,0.05)'; cctx.fillRect(0, h * 0.44, w, h * 0.12);
  cctx.fillStyle = 'rgba(0,255,0,0.04)'; cctx.fillRect(0, 0, w, h * 0.08); cctx.fillRect(0, h * 0.92, w, h * 0.08);
  cctx.fillStyle = 'rgb(0,16,0)'; cctx.fillRect(0, 0, lay.uOf(3.15) * w, h);
  cctx.fillStyle = 'rgb(0,120,0)';
  for (const side of [1, -1]) {
    const edge = side > 0 ? 0 : h;
    cctx.beginPath();
    cctx.moveTo(glare[0][0], edge);
    for (const [px, py] of glare) cctx.lineTo(px, side > 0 ? py : h - py);
    cctx.lineTo(glare[glare.length - 1][0], edge);
    cctx.closePath();
    cctx.fill();
  }
  sootStreak(cctx, '0,110,0', 0.8);
  const packed = toTexture(packRGB(kc, rc, mc), false);
  return { map: toTexture(ac, true), roughnessMap: packed, metalnessMap: packed, clearcoatMap: packed, normalMap: toTexture(heightToNormal(hc, 2.4), false), clearcoatRoughnessMap: toTexture(cc, false), clearcoatNormalMap: orangePeelNormal(rng, 64, 32) };
}
