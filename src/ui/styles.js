/**
 * Shared UI visual language for Operation Blacksite (MW2019-inspired).
 * One stylesheet, one palette, one motion system — injected once.
 *
 * Palette:  text #e8e6e0 · gold #d8b25a · red #ff4a3a · hairline rgba(255,255,255,.18)
 * Motion:   120–220ms, cubic-bezier(.22,1,.36,1)
 * Fonts:    'Rajdhani' (500/600/700) for UI text, 'Oswald' (variable) for condensed numerals/titles.
 */

let _grainURL = null;

/** Tiny generated noise tile for menu grain (avoids shipping an image). */
export function grainURL() {
  if (_grainURL) return _grainURL;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const img = g.createImageData(128, 128);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 110 + Math.random() * 90;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 18 + Math.random() * 26;
  }
  g.putImageData(img, 0, 0);
  _grainURL = c.toDataURL('image/png');
  return _grainURL;
}

export function ensureStyles() {
  if (document.getElementById('bs-ui-styles')) return;
  const s = document.createElement('style');
  s.id = 'bs-ui-styles';
  s.textContent = CSS.replaceAll('__GRAIN__', grainURL());
  document.head.appendChild(s);
}

const CSS = /* css */ `
/* ================= TOKENS ================= */
#hud, #menus {
  --txt: #e8e6e0;
  --dim: rgba(232, 230, 224, .62);
  --gold: #d8b25a;
  --red: #ff4a3a;
  --line: rgba(255, 255, 255, .18);
  --line-soft: rgba(255, 255, 255, .12);
  --panel: rgba(7, 9, 11, .55);
  --panel-hard: rgba(6, 8, 10, .82);
  --ease: cubic-bezier(.22, 1, .36, 1);
  --shadow-text: 0 1px 3px rgba(0, 0, 0, .65);
  font-family: 'Rajdhani', sans-serif;
  color: var(--txt);
}

/* ================= HUD ROOT ================= */
#hud { position: fixed; inset: 0; pointer-events: none; z-index: 10; opacity: 1; transition: opacity .22s var(--ease); }
#hud.hidden { opacity: 0; }
#hud .num { font-family: 'Oswald', sans-serif; font-variant-numeric: tabular-nums; }
#hud .key {
  display: inline-block; border: 1px solid rgba(255,255,255,.24); border-radius: 2px;
  padding: 0 5px; font-size: 10.5px; font-weight: 600; letter-spacing: .5px; line-height: 15px;
  color: rgba(232,230,224,.58); vertical-align: 1px;
}

/* ---------------- full-screen overlays (bottom of stack) ---------------- */
#hud .desat { position: absolute; inset: 0; background: #7e7e7e; mix-blend-mode: saturation; opacity: 0; }
#hud .dmgvig { position: absolute; inset: 0; opacity: 0;
  background: radial-gradient(ellipse at center, transparent 44%, rgba(150, 12, 6, .62) 100%); }
#hud .lowvig { position: absolute; inset: 0; opacity: 0; }
#hud .lowvig i { position: absolute; inset: 0; display: block;
  background: radial-gradient(ellipse at center, transparent 34%, rgba(110, 4, 2, .58) 96%);
  animation: heartbeat 1.15s ease-in-out infinite; }
@keyframes heartbeat {
  0% { opacity: .55; } 12% { opacity: 1; } 24% { opacity: .62; }
  36% { opacity: .92; } 55% { opacity: .5; } 100% { opacity: .55; }
}
#hud .sprintfx { position: absolute; inset: 0; opacity: 0; transition: opacity .22s var(--ease); }
#hud .sprintfx i { position: absolute; top: 0; bottom: 0; width: 15%; display: block; }
#hud .sprintfx i.l { left: 0; background: linear-gradient(90deg, rgba(8,9,11,.46), transparent 75%); }
#hud .sprintfx i.r { right: 0; background: linear-gradient(-90deg, rgba(8,9,11,.46), transparent 75%); }

/* ---------------- crosshair + hitmarkers ---------------- */
#hud .xhair { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); transition: opacity .12s var(--ease); }
#hud .xhair span { position: absolute; background: rgba(240, 240, 238, .92); box-shadow: 0 0 2px rgba(0,0,0,.85); }
#hud .xhair .t { width: 1.5px; height: 6px; left: -0.75px; top: -12px; }
#hud .xhair .b { width: 1.5px; height: 6px; left: -0.75px; top: 6px; }
#hud .xhair .l { width: 6px; height: 1.5px; left: -12px; top: -0.75px; }
#hud .xhair .r { width: 6px; height: 1.5px; left: 6px; top: -0.75px; }
#hud .xhair .dot { width: 2px; height: 2px; left: -1px; top: -1px; border-radius: 50%; }

#hud .hitwrap { position: absolute; left: 50%; top: 50%; width: 0; height: 0; }
#hud .hm { position: absolute; left: 0; top: 0; width: 0; height: 0; animation: hm-pop .19s var(--ease) forwards; }
#hud .hm span { position: absolute; width: 3px; height: 11px; background: #f6f4ee; box-shadow: 0 0 3px rgba(0,0,0,.8); }
#hud .hm.red span { background: #ff5142; }
#hud .hm .a { transform: translate(-13px, -13px) rotate(-45deg); }
#hud .hm .b { transform: translate(10px, -13px) rotate(45deg); }
#hud .hm .c { transform: translate(-13px, 2px) rotate(45deg); }
#hud .hm .d { transform: translate(10px, 2px) rotate(-45deg); }
@keyframes hm-pop {
  0% { transform: rotate(var(--jit, 0deg)) scale(1.35); opacity: 0; }
  18% { opacity: 1; }
  100% { transform: rotate(var(--jit, 0deg)) scale(.9); opacity: 0; }
}

/* ---------------- score popups (center-right) ---------------- */
#hud .pops { position: absolute; left: calc(50% + 62px); top: 47%; width: 200px; }
#hud .pop { position: absolute; left: 0; white-space: nowrap; font-weight: 700; font-size: 18px;
  letter-spacing: 1.5px; color: #fff; text-shadow: var(--shadow-text);
  animation: pop-rise .8s var(--ease) forwards; }
#hud .pop small { font-size: 11.5px; font-weight: 600; letter-spacing: 2px; color: var(--gold); margin-left: 7px; }
#hud .pop.gold { color: var(--gold); }
@keyframes pop-rise {
  0% { transform: translateY(6px); opacity: 0; }
  12% { opacity: 1; }
  70% { opacity: 1; }
  100% { transform: translateY(-30px); opacity: 0; }
}

/* ---------------- damage direction ring (canvas) ---------------- */
#hud .dmgring { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); width: 380px; height: 380px; }

/* ---------------- minimap (top-left) ---------------- */
#hud .mm { position: absolute; left: 22px; top: 20px; width: 226px; }
#hud .mm .frame { position: relative; width: 226px; height: 154px; border-radius: 6px; overflow: hidden;
  border: 1px solid var(--line); background: rgba(8, 11, 10, .64);
  box-shadow: 0 3px 16px rgba(0,0,0,.45), inset 0 0 0 1px rgba(0,0,0,.35), 0 0 22px rgba(216,178,90,.05); }
#hud .mm canvas { width: 100%; height: 100%; display: block; }
#hud .mm .foot { display: flex; justify-content: space-between; align-items: baseline; margin-top: 4px;
  font-size: 12px; font-weight: 600; letter-spacing: 1.5px; color: rgba(232,230,224,.66);
  text-shadow: 0 1px 3px rgba(0,0,0,.9); }
#hud .mm .foot b { color: var(--txt); font-weight: 700; }

/* ---------------- compass (top-center) ---------------- */
#hud .compass { position: absolute; top: 14px; left: 50%; transform: translateX(-50%);
  width: 480px; height: 58px;
  -webkit-mask-image: linear-gradient(90deg, transparent, #000 15%, #000 85%, transparent);
  mask-image: linear-gradient(90deg, transparent, #000 15%, #000 85%, transparent); }
#hud .compass canvas { width: 100%; height: 100%; display: block; }

/* ---------------- objective banner ---------------- */
#hud .objective { position: absolute; top: 84px; left: 50%; transform: translateX(-50%);
  display: flex; align-items: center; gap: 10px; padding: 6px 16px 6px 13px;
  background: var(--panel); border: 1px solid var(--line-soft); border-left: 3px solid var(--gold);
  border-radius: 2px; opacity: 0; }
#hud .objective.on { animation: obj-in .22s var(--ease) forwards; }
#hud .objective.off { animation: obj-out .22s var(--ease) forwards; }
#hud .objective .t { font-size: 14px; font-weight: 700; letter-spacing: 2.5px; color: var(--txt); }
#hud .objective .s { font-size: 12px; font-weight: 600; letter-spacing: 1.5px; color: rgba(232,230,224,.62); }
@keyframes obj-in { from { opacity: 0; transform: translate(-50%, -6px); } to { opacity: 1; transform: translate(-50%, 0); } }
@keyframes obj-out { from { opacity: 1; } to { opacity: 0; } }

/* ---------------- killfeed (top-right) ---------------- */
#hud .killfeed { position: absolute; right: 22px; top: 20px; display: flex; flex-direction: column;
  align-items: flex-end; gap: 4px; }
#hud .killfeed .row { display: flex; align-items: center; gap: 9px; padding: 3px 11px;
  background: var(--panel); border: 1px solid var(--line-soft); border-radius: 3px;
  font-size: 14px; font-weight: 600; letter-spacing: 1.5px;
  animation: feed-in .18s var(--ease); transition: opacity .3s var(--ease); }
#hud .killfeed .row.dying { opacity: 0; }
#hud .killfeed .you { color: var(--gold); }
#hud .killfeed .them { color: var(--txt); opacity: .88; }
#hud .killfeed svg { display: block; fill: #dcdad4; opacity: .92; }
#hud .killfeed svg.hs { fill: var(--red); opacity: 1; }
@keyframes feed-in { from { opacity: 0; transform: translateX(12px); } to { opacity: 1; transform: translateX(0); } }

/* ---------------- center messages ---------------- */
#hud .msg { position: absolute; left: 50%; top: 27%; transform: translateX(-50%);
  text-align: center; opacity: 0; width: 700px; }
#hud .msg .inner.on { animation: msg-in .2s var(--ease); }
#hud .msg .rule { width: 54px; height: 1px; background: var(--gold); margin: 0 auto 10px; opacity: .9; }
#hud .msg .big { font-family: 'Oswald', sans-serif; font-weight: 500; font-size: 34px;
  letter-spacing: 12px; text-indent: 12px; color: var(--txt); text-shadow: 0 2px 10px rgba(0,0,0,.75); }
#hud .msg .big .au { color: var(--gold); }
#hud .msg .sub { margin-top: 5px; font-size: 14px; font-weight: 700; letter-spacing: 3px;
  color: rgba(238,236,230,.82); text-shadow: 0 1px 4px rgba(0,0,0,.95), 0 0 12px rgba(0,0,0,.5); }
@keyframes msg-in { 0% { transform: scale(1.07); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }

/* ---------------- health (bottom-left) ---------------- */
#hud .hp { position: absolute; left: 24px; bottom: 24px; display: flex; align-items: center; gap: 12px;
  opacity: 0; transition: opacity .2s var(--ease); }
#hud .hp.show { opacity: 1; }
#hud .hp .stance { width: 24px; height: 24px; opacity: .95; }
#hud .hp .stance svg { display: none; fill: #eceae4; filter: drop-shadow(0 1px 2px rgba(0,0,0,.8)); margin: 0 auto; }
#hud .hp .stance svg.on { display: block; }
#hud .hp .segs { display: flex; gap: 3px; }
#hud .hp .segs i { display: block; width: 16px; height: 5px; background: rgba(255,255,255,.18);
  border-radius: 1px; overflow: hidden; position: relative; box-shadow: 0 1px 3px rgba(0,0,0,.55); }
#hud .hp .segs i b { position: absolute; inset: 0; background: rgba(242,241,237,.96); transform-origin: left;
  border-radius: 1px; }
#hud .hp.low .segs i b { background: var(--red); animation: hp-blink .85s ease-in-out infinite; }
@keyframes hp-blink { 0%, 100% { filter: brightness(1); } 50% { filter: brightness(.5); } }

/* ---------------- ammo cluster (bottom-right) ---------------- */
#hud .ammo { position: absolute; right: 26px; bottom: 22px; display: flex; flex-direction: column;
  align-items: flex-end; gap: 7px; text-shadow: var(--shadow-text); transition: opacity .25s var(--ease); }
#hud.dead .ammo, #hud.dead .hp, #hud.dead .objective { opacity: 0 !important; }
#hud.dead .mm, #hud.dead .compass { opacity: .35; }
#hud .mm, #hud .compass { transition: opacity .25s var(--ease); }

#hud .ks { display: flex; gap: 10px; align-items: flex-start; margin-bottom: 16px; }
#hud .ks .slot { position: relative; width: 38px; height: 38px;
  display: flex; align-items: center; justify-content: center; }
#hud .ks .slot svg.icon { fill: var(--txt); opacity: .32; filter: drop-shadow(0 1px 2px rgba(0,0,0,.75)); }
#hud .ks .slot.armed svg.icon { opacity: .62; }
#hud .ks .slot.ready svg.icon { fill: var(--gold); opacity: 1; }
#hud .ks .ring { position: absolute; inset: 0; }
#hud .ks .ring .track { stroke: rgba(255,255,255,.17); }
#hud .ks .ring .prog { stroke: var(--gold); transition: stroke-dashoffset .2s var(--ease); }
#hud .ks .slot.ready .ring .prog { animation: ks-breathe 1.9s ease-in-out infinite;
  filter: drop-shadow(0 0 3px rgba(216,178,90,.55)); }
@keyframes ks-breathe { 0%, 100% { stroke-opacity: 1; } 50% { stroke-opacity: .55; } }
#hud .ks .lockb { position: absolute; right: -3px; bottom: -3px; width: 14px; height: 14px;
  border-radius: 50%; background: rgba(8,10,12,.85); border: 1px solid rgba(255,255,255,.2);
  display: flex; align-items: center; justify-content: center; }
#hud .ks .lockb svg { display: block; fill: rgba(232,230,224,.55); }
#hud .ks .slot .badge { position: absolute; top: -4px; right: -4px; min-width: 14px; height: 14px;
  background: var(--gold); color: #14120c; font-size: 10px; font-weight: 700; line-height: 14px;
  text-align: center; border-radius: 2px; padding: 0 3px; display: none; text-shadow: none; }
#hud .ks .slot.ready .badge { display: block; }
#hud .ks .khint { position: absolute; bottom: -14px; left: 50%; transform: translateX(-50%);
  font-size: 10.5px; font-weight: 700; color: rgba(232,230,224,.45); }
#hud .ks .slot.ready .khint { color: var(--gold); }

#hud .wline { display: flex; align-items: center; gap: 9px; margin-top: 6px; }
#hud .wline .wname { font-size: 14px; font-weight: 700; letter-spacing: 2px; color: var(--txt); }
#hud .wline .wname.switch { animation: msg-in .18s var(--ease); }
#hud .wline .fmode { font-size: 10px; font-weight: 700; letter-spacing: 1.2px; color: rgba(232,230,224,.6);
  border: 1px solid rgba(255,255,255,.2); border-radius: 2px; padding: 1.5px 5px 0.5px; }

#hud .arow { display: flex; align-items: flex-end; gap: 14px; }
#hud .nades { display: flex; align-items: center; gap: 6px; padding-bottom: 7px; }
#hud .nades svg { display: block; fill: var(--txt); opacity: .68; filter: drop-shadow(0 1px 2px rgba(0,0,0,.6)); }
#hud .nades .cnt { font-size: 14px; font-weight: 700; letter-spacing: .5px; color: rgba(232,230,224,.72); }
#hud .magrow { display: flex; align-items: flex-end; gap: 9px; }
#hud .magrow .mag { font-family: 'Oswald', sans-serif; font-weight: 500; font-size: 44px; line-height: .88;
  letter-spacing: .5px; color: var(--txt); font-variant-numeric: tabular-nums; }
#hud .magrow .mag.empty { color: var(--red); }
#hud .magrow .div { width: 1.5px; height: 28px; background: rgba(255,255,255,.22); transform: skewX(-14deg); margin-bottom: 3px; }
#hud .magrow .reserve { font-family: 'Oswald', sans-serif; font-weight: 400; font-size: 17px; line-height: 1;
  color: rgba(232,230,224,.55); margin-bottom: 3px; font-variant-numeric: tabular-nums; }

#hud .reload { width: 168px; height: 14px; position: relative; margin-top: 3px; opacity: 0; transition: opacity .15s var(--ease); }
#hud .reload.on { opacity: 1; }
#hud .reload .track { position: absolute; left: 0; top: 11px; width: 168px; height: 2.5px; background: rgba(255,255,255,.16); }
#hud .reload .fill { position: absolute; left: 0; top: 11px; height: 2.5px; background: var(--gold); }
#hud .reload .lbl { position: absolute; right: 0; top: -4px; font-size: 10.5px; font-weight: 700; letter-spacing: 3px;
  background: linear-gradient(90deg, var(--dim) 30%, #fff 50%, var(--dim) 70%); background-size: 200% 100%;
  -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
  animation: shimmer 1.1s linear infinite; }
@keyframes shimmer { 0% { background-position: 130% 0; } 100% { background-position: -70% 0; } }

/* ---------------- scoreboard (hold TAB) ---------------- */
#hud .sb { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%) scale(.98);
  width: 640px; background: var(--panel-hard); border: 1px solid var(--line);
  border-radius: 4px; opacity: 0; transition: opacity .16s var(--ease), transform .16s var(--ease);
  backdrop-filter: blur(9px); overflow: hidden; }
#hud .sb.on { opacity: 1; transform: translate(-50%, -50%) scale(1); }
#hud .sb .head { display: flex; justify-content: space-between; align-items: baseline;
  padding: 14px 22px 11px; border-bottom: 1px solid var(--line-soft); }
#hud .sb .head .t { font-family: 'Oswald', sans-serif; font-weight: 500; font-size: 19px; letter-spacing: 4px; }
#hud .sb .head .m { font-size: 12px; font-weight: 600; letter-spacing: 1.5px; color: var(--dim); }
#hud .sb .head .m b { color: var(--gold); font-weight: 700; }
#hud .sb table { width: 100%; border-collapse: collapse; }
#hud .sb th { font-size: 11px; font-weight: 700; letter-spacing: 1.8px; color: rgba(232,230,224,.55);
  padding: 10px 22px 7px; text-align: right; }
#hud .sb th:first-child { text-align: left; }
#hud .sb td { padding: 8px 22px 12px; text-align: right; font-family: 'Oswald', sans-serif;
  font-weight: 500; font-size: 22px; color: var(--txt); }
#hud .sb td:first-child { text-align: left; font-family: 'Rajdhani', sans-serif; font-weight: 700;
  font-size: 15px; letter-spacing: 2px; color: var(--gold); }
#hud .sb .foot { padding: 9px 22px; border-top: 1px solid var(--line-soft); font-size: 11px;
  font-weight: 600; letter-spacing: 1.5px; color: rgba(232,230,224,.55); display: flex; justify-content: space-between; }

/* ---------------- KIA / respawn ---------------- */
#hud .kia { position: absolute; inset: 0; display: none; align-items: center; justify-content: center;
  flex-direction: column; background: radial-gradient(ellipse at center, rgba(20,2,1,.25) 30%, rgba(12,1,0,.72) 100%); }
#hud .kia.on { display: flex; }
#hud .kia .flash { position: absolute; inset: 0; background: rgba(200, 22, 12, .4); opacity: 0; }
#hud .kia.on .flash { animation: kia-flash .5s ease-out forwards; }
@keyframes kia-flash { 0% { opacity: 1; } 100% { opacity: 0; } }
#hud .kia .big { font-family: 'Oswald', sans-serif; font-weight: 600; font-size: 74px; letter-spacing: 26px;
  text-indent: 26px; color: var(--red); text-shadow: 0 2px 18px rgba(120,0,0,.6); animation: msg-in .22s var(--ease); }
#hud .kia .sub { margin-top: 10px; font-size: 14px; font-weight: 600; letter-spacing: 3.5px; color: var(--txt); opacity: .8; }
#hud .kia .sub b { color: var(--gold); font-family: 'Oswald', sans-serif; font-weight: 500; }
#hud .blackfade { position: absolute; inset: 0; background: #000; opacity: 0; pointer-events: none; }
#hud .blackfade.fading { transition: opacity .55s ease-out; }

/* ================= MENUS ================= */
#menus .screen { position: fixed; inset: 0; z-index: 50; display: none; overflow: hidden;
  color: var(--txt); font-family: 'Rajdhani', sans-serif; }
#menus .screen.on { display: block; }
#menus .slate { position: absolute; inset: 0;
  background: radial-gradient(ellipse at 28% 18%, #171c22 0%, #0b0e11 58%, #06080a 100%); }
#menus .scan { position: absolute; inset: -60%; opacity: .5; pointer-events: none;
  background: repeating-linear-gradient(125deg, rgba(255,255,255,.015) 0 2px, transparent 2px 11px);
  animation: scan-drift 26s linear infinite; }
@keyframes scan-drift { 0% { transform: translate(0, 0); } 100% { transform: translate(220px, 130px); } }
#menus .grain { position: absolute; inset: 0; pointer-events: none; opacity: .5;
  background-image: url(__GRAIN__); animation: grain-jit .42s steps(3) infinite; }
@keyframes grain-jit { 0% { background-position: 0 0; } 33% { background-position: -38px 22px; }
  66% { background-position: 24px -30px; } 100% { background-position: 0 0; } }
#menus .vig { position: absolute; inset: 0; pointer-events: none;
  background: radial-gradient(ellipse at center, transparent 52%, rgba(0,0,0,.55) 100%); }

#menus .col { position: absolute; inset: 0; display: flex; flex-direction: column;
  align-items: center; justify-content: center; text-align: center; }
#menus .eyebrow { font-size: 12.5px; font-weight: 600; letter-spacing: 6px; color: var(--gold); margin-bottom: 14px; }
#menus .title { font-family: 'Oswald', sans-serif; font-weight: 600; font-size: 64px; letter-spacing: 18px;
  text-indent: 18px; line-height: 1; color: var(--txt); text-shadow: 0 3px 24px rgba(0,0,0,.6); }
#menus .rule { width: 240px; height: 1px; background: linear-gradient(90deg, transparent, var(--gold) 22%, var(--gold) 78%, transparent);
  margin: 22px auto; }
#menus .mode { font-size: 14.5px; font-weight: 600; letter-spacing: 5px; color: var(--dim); }

#menus button { pointer-events: auto; cursor: pointer; position: relative; overflow: hidden;
  background: rgba(255,255,255,.045); color: var(--txt); border: 1px solid rgba(255,255,255,.30);
  font-family: 'Rajdhani', sans-serif; font-weight: 700; font-size: 17px; letter-spacing: 6px; text-indent: 6px;
  padding: 14px 0; width: 280px; transition: border-color .18s var(--ease), background .18s var(--ease), color .18s var(--ease); }
#menus button::after { content: ''; position: absolute; inset: 0; pointer-events: none;
  background: linear-gradient(100deg, transparent 32%, rgba(216,178,90,.34) 50%, transparent 68%);
  transform: translateX(-110%); transition: transform .001s; }
#menus button:hover, #menus button:focus-visible { border-color: var(--gold); background: rgba(216,178,90,.09); color: #fff; }
#menus button:hover::after, #menus button:focus-visible::after { transform: translateX(110%); transition: transform .5s var(--ease); }
#menus button:focus-visible { outline: 1px solid var(--gold); outline-offset: 3px; }
#menus button.ghost { width: 220px; font-size: 14px; padding: 10px 0; opacity: .8; }

#menus .stamp { position: absolute; right: 26px; bottom: 20px; font-size: 11.5px; font-weight: 600;
  letter-spacing: 2.5px; color: rgba(232,230,224,.36); }
#menus .corner { position: absolute; left: 26px; bottom: 20px; font-size: 11.5px; font-weight: 600;
  letter-spacing: 2.5px; color: rgba(232,230,224,.36); }

/* loadout row */
#menus .loadout { display: flex; gap: 12px; margin-top: 34px; }
#menus .card { width: 148px; padding: 13px 0 11px; border: 1px solid var(--line-soft);
  background: rgba(255,255,255,.028); border-radius: 3px; display: flex; flex-direction: column;
  align-items: center; gap: 7px; }
#menus .card svg { fill: var(--txt); opacity: .8; display: block; }
#menus .card .nm { font-size: 14.5px; font-weight: 700; letter-spacing: 2.5px; }
#menus .card .role { font-size: 10px; font-weight: 600; letter-spacing: 2.5px; color: var(--gold); opacity: .9; }

/* controls reference */
#menus .controls { display: grid; grid-template-columns: auto auto; gap: 7px 34px; margin-top: 34px;
  font-size: 12.5px; font-weight: 600; letter-spacing: 1.6px; color: var(--dim); }
#menus .controls .pair { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
#menus .controls .act { opacity: .85; }
#menus .controls .k { color: var(--txt); border: 1px solid rgba(255,255,255,.26); border-radius: 2px;
  padding: 1px 7px 0; font-size: 10.5px; letter-spacing: 1px; white-space: nowrap; }

/* loading */
#menus .loading .col { justify-content: center; }
#menus .lbar { width: 430px; margin-top: 6px; }
#menus .lbar .track { width: 100%; height: 3px; background: rgba(255,255,255,.17); }
#menus .lbar .fill { height: 100%; width: 0%; background: var(--gold); transition: width .25s var(--ease); }
#menus .lbar .meta { display: flex; justify-content: space-between; margin-top: 8px;
  font-size: 11.5px; font-weight: 600; letter-spacing: 2.5px; color: var(--dim); }
#menus .lbar .pct { color: var(--txt); font-family: 'Oswald', sans-serif; font-weight: 400; letter-spacing: 1px; }
#menus .tip { position: absolute; bottom: 64px; left: 0; right: 0; text-align: center;
  font-size: 13px; font-weight: 600; letter-spacing: 2px; color: var(--dim); transition: opacity .3s var(--ease); }
#menus .tip b { color: var(--gold); font-weight: 700; letter-spacing: 3px; margin-right: 10px; }

/* pause */
#menus .pause { background: rgba(5, 7, 9, .48); }
#menus .pause .blur { position: absolute; inset: 0; backdrop-filter: blur(14px) brightness(.62) saturate(.8);
  -webkit-backdrop-filter: blur(14px) brightness(.62) saturate(.8); }
#menus .pause .title { font-size: 44px; letter-spacing: 14px; text-indent: 14px; }
#menus .scoreline { margin-top: 16px; display: flex; gap: 30px; font-size: 13px; font-weight: 600;
  letter-spacing: 2.5px; color: var(--dim); }
#menus .scoreline b { color: var(--txt); font-family: 'Oswald', sans-serif; font-weight: 500; font-size: 17px;
  letter-spacing: 1px; margin-left: 8px; }

/* game over */
#menus .gameover .verdict { font-family: 'Oswald', sans-serif; font-weight: 600; font-size: 74px;
  letter-spacing: 24px; text-indent: 24px; line-height: 1; }
#menus .gameover .verdict.win { color: var(--gold); text-shadow: 0 3px 30px rgba(216,178,90,.25); }
#menus .gameover .verdict.loss { color: var(--red); text-shadow: 0 3px 30px rgba(255,74,58,.2); }
#menus .stats { display: flex; gap: 14px; margin: 34px 0 6px; }
#menus .stat { width: 118px; padding: 13px 0 11px; border: 1px solid var(--line-soft);
  background: rgba(255,255,255,.028); border-radius: 3px; }
#menus .stat .v { font-family: 'Oswald', sans-serif; font-weight: 500; font-size: 27px; }
#menus .stat .l { font-size: 10px; font-weight: 700; letter-spacing: 2.5px; color: var(--dim); margin-top: 3px; }
`;
