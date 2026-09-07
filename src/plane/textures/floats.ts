import { Rng } from '../../core/seed';
import { FLOAT_V } from '../geometry/floats';
import { canvas, chips, grime, heightToNormal, LIVERY, packRGB, panels, panelVariation, toTexture, wear, type PbrMaps } from './common';

/**
 * Floats: u bow..stern, v around the hull as laid out by `floatHull` (deck 0-0.12 to the rolled edge, side
 * 0.12-0.22 to the chine, bottom 0.22-0.5 to the keel, port mirrored). A working EDO finish rather than the
 * fuselage's livery: dark olive-grey topsides chalked by the sun toward the deck edge, near-black bottom paint
 * scuffed grey along the keel and the step, a pale grey boot-top just above the chine with the algae / scum line
 * over it (heavier aft), a dark anti-slip walkway edged in the livery yellow, riveted frames every half metre,
 * inspection plates on the sides, dock rash at the bow and the deck edge, paint chipped to bare metal at the stem.
 * The wet band below the waterline is live (floatPaint's wet-line shader), the painted band is only the stain.
 */
export function floatMaps(): PbrMaps {
  const w = 1024, h = 512;
  const rng = new Rng('float-paint-dark');
  const [ac, actx] = canvas(w, h);
  const [hc, hctx] = canvas(w, h);
  const [rc, rctx] = canvas(w, h);
  const [mc, mctx] = canvas(w, h);
  const [cc, cctx] = canvas(w, h);
  const { edge: EDGE, chine: CHINE } = FLOAT_V;
  const WALK = 0.085;   // walkway edge (v): the anti-slip covers the flat of the deck, the rolled edge is hull paint
  const BOOT0 = CHINE - 0.026, BOOT1 = CHINE + 0.012; // boot-top: ~8 cm above the chine, wrapping a little under it
  /** row of hull-side v (0 = crown .. 0.5 = keel) on the starboard (top) or port (bottom) half */
  const V = (side: number, v: number) => (side > 0 ? v : 1 - v) * h;
  /** fill a v band on both halves */
  const band = (ctx: CanvasRenderingContext2D, v0: number, v1: number, style: string | CanvasGradient) => {
    ctx.fillStyle = style;
    ctx.fillRect(0, v0 * h, w, (v1 - v0) * h);
    ctx.fillRect(0, (1 - v1) * h, w, (v1 - v0) * h);
  };
  /** vertical gradient between two v values, drawn on both halves (colour stops as [offset, rgba]) */
  const vGrad = (ctx: CanvasRenderingContext2D, v0: number, v1: number, stops: [number, string][]) => {
    for (const side of [1, -1]) {
      const g = ctx.createLinearGradient(0, V(side, v0), 0, V(side, v1));
      for (const [o, c] of stops) g.addColorStop(o, c);
      ctx.fillStyle = g;
      ctx.fillRect(0, Math.min(V(side, v0), V(side, v1)), w, Math.abs(V(side, v1) - V(side, v0)));
    }
  };
  // hull length 5.7 m (x 2.95 .. -2.75): u of a body station
  const uOf = (x: number) => (2.95 - x) / 5.7;

  // ------------------------------------------------------------ albedo
  hctx.fillStyle = '#808080'; hctx.fillRect(0, 0, w, h);
  actx.fillStyle = '#3a3e3a'; actx.fillRect(0, 0, w, h);                      // topsides: dark olive-grey
  vGrad(actx, EDGE, CHINE, [[0, 'rgba(96,101,94,0.55)'], [0.35, 'rgba(96,101,94,0.12)'], [1, 'rgba(96,101,94,0)']]); // sun-chalked toward the deck edge
  band(actx, CHINE, 0.5, '#1d1f1e');                                          // bottom: near-black antifouling
  vGrad(actx, 0.44, 0.5, [[0, 'rgba(90,88,82,0)'], [0.6, 'rgba(90,88,82,0.35)'], [1, 'rgba(120,118,110,0.6)']]); // keel scuffed grey
  band(actx, BOOT0, BOOT1, '#9c9e92');                                         // pale boot-top
  band(actx, WALK, EDGE, '#3f433f');                                           // deck outside the walkway: hull paint, a shade lighter
  band(actx, 0, WALK, '#4a4d4f');                                              // anti-slip walkway: dark grey grit
  band(actx, WALK - 0.006, WALK, LIVERY.lower);                                // yellow edge stripe along the walkway
  // step-here bands across the walkway at the strut stations
  for (const x of [1.6, -0.9]) {
    actx.fillStyle = LIVERY.lower;
    for (const side of [1, -1]) actx.fillRect(uOf(x + 0.20) * w, Math.min(V(side, 0), V(side, WALK)), (0.06 / 5.7) * w, Math.abs(V(side, WALK) - V(side, 0)));
    for (const side of [1, -1]) actx.fillRect(uOf(x - 0.14) * w, Math.min(V(side, 0), V(side, WALK)), (0.06 / 5.7) * w, Math.abs(V(side, WALK) - V(side, 0)));
  }
  // anti-slip grit: a dense speckle of lighter and darker grains on the walkway (albedo and height)
  for (let i = 0; i < 26000; i++) {
    const side = rng.next() < 0.5 ? 1 : -1, v = rng.range(0, WALK - 0.006), x = rng.range(0, w), y = V(side, v);
    const l = rng.next() < 0.5;
    actx.fillStyle = l ? `rgba(150,152,150,${rng.range(0.10, 0.3)})` : `rgba(10,10,12,${rng.range(0.15, 0.4)})`;
    actx.fillRect(x, y, 1.2, 1.2);
    hctx.fillStyle = l ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.25)';
    hctx.fillRect(x, y, 1.2, 1.2);
  }
  // algae / scum line: a green-brown stain over the boot-top and a little below the chine, heavier toward the stern
  for (const side of [1, -1]) {
    const g = actx.createLinearGradient(0, V(side, CHINE - 0.032), 0, V(side, CHINE + 0.03));
    g.addColorStop(0, 'rgba(70,84,60,0)'); g.addColorStop(0.35, 'rgba(70,84,60,0.28)'); g.addColorStop(0.6, 'rgba(60,70,50,0.35)'); g.addColorStop(1, 'rgba(60,70,50,0)');
    actx.fillStyle = g;
    actx.fillRect(0, Math.min(V(side, CHINE - 0.032), V(side, CHINE + 0.03)), w, Math.abs(V(side, CHINE + 0.03) - V(side, CHINE - 0.032)));
    const along = actx.createLinearGradient(0, 0, w, 0);
    along.addColorStop(0, 'rgba(58,70,48,0)'); along.addColorStop(0.5, 'rgba(58,70,48,0.10)'); along.addColorStop(1, 'rgba(58,70,48,0.30)');
    actx.fillStyle = along;
    actx.fillRect(0, Math.min(V(side, CHINE - 0.026), V(side, CHINE + 0.02)), w, Math.abs(V(side, CHINE + 0.02) - V(side, CHINE - 0.026)));
  }
  // drips and streaks hanging from the scum line, rust weeps under the deck-edge fittings
  for (let i = 0; i < 160; i++) {
    const side = rng.next() < 0.5 ? 1 : -1;
    const x = rng.range(0, w), y0 = V(side, rng.range(CHINE - 0.03, CHINE - 0.02)), len = rng.range(6, 30) * -side;
    actx.strokeStyle = `rgba(52,64,44,${rng.range(0.08, 0.28)})`;
    actx.lineWidth = rng.range(1, 3);
    actx.beginPath(); actx.moveTo(x, y0); actx.lineTo(x + rng.range(-3, 3), y0 + len); actx.stroke();
  }
  for (let i = 0; i < 24; i++) {
    const side = rng.next() < 0.5 ? 1 : -1;
    const x = rng.range(0, w), y0 = V(side, rng.range(EDGE, EDGE + 0.01)), len = rng.range(8, 36) * side;
    actx.strokeStyle = `rgba(120,70,35,${rng.range(0.10, 0.28)})`;
    actx.lineWidth = rng.range(1, 2.5);
    actx.beginPath(); actx.moveTo(x, y0); actx.lineTo(x + rng.range(-2, 2), y0 + len); actx.stroke();
  }
  // frames every ~0.5 m along the hull, stringer seams at the deck edge, mid-side, chine and mid-bottom; rivets
  const frames = [2.6, 2.1, 1.6, 1.1, 0.6, 0.1, -0.35, -0.85, -1.35, -1.85, -2.35].map(uOf);
  panels(hctx, actx, w, h, frames, [EDGE, 0.17, 1 - 0.17, 1 - EDGE, 0.36, 1 - 0.36], 12, { strength: 0.9 });
  // rivets read as light catching the heads on a dark hull: a white dot above each seam's dark shadow
  for (const u of frames) for (const off of [-7, 7]) for (let y = 6; y < h; y += 12) {
    actx.fillStyle = 'rgba(210,214,210,0.16)'; actx.beginPath(); actx.arc(u * w + off, y - 0.8, 1.1, 0, Math.PI * 2); actx.fill();
  }
  hctx.strokeStyle = '#4a4a4a'; hctx.lineWidth = 2.5;
  for (const v of [CHINE, 1 - CHINE]) { hctx.beginPath(); hctx.moveTo(0, v * h); hctx.lineTo(w, v * h); hctx.stroke(); }
  // the boot-top's paint edge stands a hair proud; the walkway's edge too
  hctx.strokeStyle = '#6a6a6a'; hctx.lineWidth = 1.2;
  for (const v of [BOOT0, 1 - BOOT0, WALK, 1 - WALK]) { hctx.beginPath(); hctx.moveTo(0, v * h); hctx.lineTo(w, v * h); hctx.stroke(); }
  // inspection plates on the sides (22 x 14 cm, eight screws) and the step's reinforcing plate
  const plate = (x: number, v0: number, lenM: number, vh: number) => {
    const pw = (lenM / 5.7) * w, ph = vh * h;
    for (const side of [1, -1]) {
      const x0 = uOf(x) * w, y0 = Math.min(V(side, v0), V(side, v0 + vh));
      actx.fillStyle = 'rgba(0,0,0,0.18)'; actx.fillRect(x0 - 1, y0 - 1, pw + 2, ph + 2);
      actx.fillStyle = 'rgba(120,124,118,0.10)'; actx.fillRect(x0, y0, pw, ph);
      hctx.strokeStyle = '#5c5c5c'; hctx.lineWidth = 1.6; hctx.strokeRect(x0, y0, pw, ph);
      for (let k = 0; k < 8; k++) {
        const t = k / 8, sx = k < 4 ? x0 + 3 + (pw - 6) * (t * 2) : x0 + 3 + (pw - 6) * ((t - 0.5) * 2), sy = k < 4 ? y0 + 3 : y0 + ph - 3;
        hctx.fillStyle = '#a0a0a0'; hctx.beginPath(); hctx.arc(sx, sy, 1.3, 0, Math.PI * 2); hctx.fill();
        actx.fillStyle = 'rgba(200,200,200,0.25)'; actx.beginPath(); actx.arc(sx, sy, 1.1, 0, Math.PI * 2); actx.fill();
      }
    }
  };
  for (const x of [2.1, 0.45, -1.05, -2.05]) plate(x, 0.145, 0.22, 0.03);
  plate(-0.30, CHINE + 0.01, 0.14, 0.24); // step doubler on the bottom, just aft of the step
  // amphibious wheel wells: the door seams around each well on the bottom, split along the keel (main wheels
  // behind the step, nose wheels in the forefoot); with the gear up the wheel group is hidden, so in flight these
  // seams are all that says the floats are amphibious. Bottom v runs CHINE at the chine .. 0.5 at the keel.
  const well = (x0: number, x1: number, halfW: number, beam: number) => {
    const v0 = CHINE + (0.5 - CHINE) * (1 - halfW / beam);
    const u0 = uOf(x1) * w, u1 = uOf(x0) * w, y0 = v0 * h, y1 = (1 - v0) * h;
    actx.fillStyle = 'rgba(0,0,0,0.10)'; actx.fillRect(u0, y0, u1 - u0, y1 - y0);
    actx.strokeStyle = 'rgba(0,0,0,0.55)'; actx.lineWidth = 1.6;
    actx.strokeRect(u0, y0, u1 - u0, y1 - y0);
    actx.beginPath(); actx.moveTo(u0, h / 2); actx.lineTo(u1, h / 2); actx.stroke();
    hctx.strokeStyle = '#3c3c3c'; hctx.lineWidth = 2.2;
    hctx.strokeRect(u0, y0, u1 - u0, y1 - y0);
    hctx.beginPath(); hctx.moveTo(u0, h / 2); hctx.lineTo(u1, h / 2); hctx.stroke();
    // piano hinges along the outboard seams
    hctx.strokeStyle = '#9a9a9a'; hctx.lineWidth = 1.2;
    for (const y of [y0 + 3, y1 - 3]) { hctx.beginPath(); hctx.moveTo(u0 + 4, y); hctx.lineTo(u1 - 4, y); hctx.stroke(); }
  };
  well(-1.25, -0.55, 0.15, 0.415);
  well(2.02, 2.58, 0.10, 0.31);
  // dock rash: light scuffs along the deck edge and the upper sides, densest at the bow and around the step
  for (let i = 0; i < 320; i++) {
    const side = rng.next() < 0.5 ? 1 : -1, nearBow = rng.next() < 0.35;
    const u = nearBow ? rng.range(0, 0.12) : rng.next() < 0.3 ? rng.range(0.55, 0.62) : rng.range(0, 1);
    const v = rng.range(EDGE - 0.01, EDGE + 0.05), x = u * w, y = V(side, v), len = rng.range(4, 30), a = rng.range(0.10, 0.4);
    actx.strokeStyle = `rgba(150,152,146,${a})`; actx.lineWidth = rng.range(0.6, 1.8);
    actx.beginPath(); actx.moveTo(x, y); actx.lineTo(x + len, y + rng.range(-3, 3)); actx.stroke();
  }
  // bare metal where the paint is knocked off: the stem, the deck-edge corners at the bow, the step's edge
  chips(actx, mctx, cctx, rng, 6, V(1, 0.15), 6, 40, 40, 2.0);
  chips(actx, mctx, cctx, rng, 6, V(-1, 0.15), 6, 40, 40, 2.0);
  for (const side of [1, -1]) chips(actx, mctx, cctx, rng, rng.range(20, 90), V(side, EDGE), 40, 5, 22, 1.8);
  for (const side of [1, -1]) chips(actx, mctx, cctx, rng, uOf(-0.35) * w, V(side, 0.36), 4, 40, 18, 1.6);
  grime(actx, rng, w, h, 110, 0.10, '40,40,36');
  grime(actx, rng, w, h, 40, 0.08, '110,112,104');

  // ------------------------------------------------------------ roughness (G) / metalness (B) / clear coat (R)
  // matte working finishes: topsides 0.62 varying panel by panel, bottom 0.72, boot-top 0.55, walkway grit 0.86;
  // no metal anywhere but the chips; a faint sheen of old enamel on the topsides only
  rctx.fillStyle = '#9e9e9e'; rctx.fillRect(0, 0, w, h);
  band(rctx, CHINE, 0.5, '#b8b8b8');
  band(rctx, BOOT0, BOOT1, '#8c8c8c');
  panelVariation(rctx, w, h, frames, [EDGE, CHINE, 1 - CHINE, 1 - EDGE, 0.36, 1 - 0.36], rng, 11, 'all', { seam: 3, seamAmp: 18 });
  mctx.fillStyle = '#000000'; mctx.fillRect(0, 0, w, h);
  cctx.fillStyle = '#000000'; cctx.fillRect(0, 0, w, h);
  band(cctx, EDGE, CHINE, '#262626');
  band(cctx, BOOT0, BOOT1, '#303030');
  // the scum band is slightly glossier than the dry paint (the live wet band adds the real gloss below the water)
  for (const side of [1, -1]) {
    const g = rctx.createLinearGradient(0, V(side, CHINE - 0.03), 0, V(side, CHINE + 0.03));
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.4, 'rgba(0,0,0,0.14)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    rctx.fillStyle = g;
    rctx.fillRect(0, Math.min(V(side, CHINE - 0.03), V(side, CHINE + 0.03)), w, Math.abs(V(side, CHINE + 0.03) - V(side, CHINE - 0.03)));
  }
  grime(rctx, rng, w, h, 90, 0.2, '170,170,170');
  // scuffs are duller than the paint around them
  for (let i = 0; i < 200; i++) {
    const side = rng.next() < 0.5 ? 1 : -1, v = rng.range(EDGE - 0.01, EDGE + 0.05), y = V(side, v);
    const x = rng.range(0, w), len = rng.range(6, 36), a = rng.range(0.15, 0.4);
    rctx.strokeStyle = `rgba(220,220,220,${a})`; rctx.lineWidth = rng.range(0.8, 2.2);
    rctx.beginPath(); rctx.moveTo(x, y); rctx.lineTo(x + len, y + rng.range(-3, 3)); rctx.stroke();
  }
  // chips are bare, uncoated metal (drawn into mctx / cctx above); redraw them on the roughness too
  // walkway and its yellow stripe last so nothing painted bleeds onto them
  band(rctx, 0, WALK, '#dcdcdc');
  band(rctx, WALK - 0.006, WALK, '#a8a8a8');
  band(cctx, 0, WALK, '#000000');
  for (let i = 0; i < 140; i++) {
    const side = rng.next() < 0.5 ? 1 : -1, v = rng.range(0.0, WALK - 0.01), y = V(side, v);
    wear(rctx, rng.range(0, w), y, rng.range(10, 40), rng.range(3, 8), rng.range(-40, 25));
  }
  const packed = toTexture(packRGB(cc, rc, mc), false);
  return { map: toTexture(ac, true), roughnessMap: packed, metalnessMap: packed, clearcoatMap: packed, normalMap: toTexture(heightToNormal(hc, 2.2), false) };
}
