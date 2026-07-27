import { fontRootVars, FONT_VARS } from './Fonts';

/**
 * hud.css.ts — every pixel of HUD styling, injected at runtime so index.html
 * stays untouched. One `<style>` element, removed again on dispose().
 *
 * Design language:
 *   • near-white text, a single amber accent, red reserved for danger
 *   • translucent panels, thin bright hairlines, subtle backdrop blur
 *   • uppercase display type, condensed + generously tracked
 *   • everything sized in vmin/clamp so it scales 720p → 4K
 *   • a ~3% safe-area gutter on every edge
 *   • continuous motion lives in CSS keyframes/transitions, not per-frame JS
 */

const STYLE_ID = 'hud-styles';

export function injectHudCss(): () => void {
  if (typeof document === 'undefined') return () => {};
  const existing = document.getElementById(STYLE_ID);
  if (existing) existing.remove();
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = HUD_CSS;
  document.head.appendChild(style);
  return () => style.remove();
}

const D = `var(${FONT_VARS.display})`;
const M = `var(${FONT_VARS.mono})`;

const HUD_CSS = /* css */ `
.hud-root{
  ${fontRootVars()}
  --fg:#eaf2fb;
  --dim:#93a7bb;
  --faint:#5f7186;
  --accent:#ffbf49;
  --accent-2:#ffd98a;
  --accent-ink:#1a1206;
  --danger:#ff4436;
  --good:#57e08a;
  --panel:rgba(9,13,19,.42);
  --panel-solid:rgba(9,13,19,.86);
  --stroke:rgba(176,203,230,.24);
  --stroke-bright:rgba(210,230,250,.5);
  --shadow:0 2px 18px rgba(0,0,0,.55);
  --safe:clamp(10px,3vmin,42px);
  --glow:0 0 10px rgba(255,191,73,.55);

  position:absolute; inset:0; z-index:40;
  pointer-events:none; overflow:hidden;
  font-family:${D};
  color:var(--fg);
  -webkit-font-smoothing:antialiased;
  text-rendering:optimizeLegibility;
  user-select:none;
  contain:layout size style;
  transition:opacity .28s ease;
}
.hud-root, .hud-root *{ box-sizing:border-box; }
.hud-root.hud-hidden{ opacity:0; }
.hud-root.hud-hidden *{ animation-play-state:paused !important; }

/* Condensed display utility — synthesises a narrow face when the resolved
   font isn't itself condensed. */
.hud-cond{ display:inline-block; transform:scaleX(var(${FONT_VARS.condense})); transform-origin:center; }
.hud-cond-l{ transform-origin:left center; }
.hud-cond-r{ transform-origin:right center; }
.hud-num{ font-family:${M}; font-variant-numeric:tabular-nums; font-feature-settings:"tnum" 1,"zero" 1; }

/* ============================ CROSSHAIR ============================ */
.hud-xh{
  position:absolute; left:50%; top:50%;
  width:0; height:0;
  transform:translate(-50%,-50%);
  --gap:7px; --len:12px; --thick:2px; --col:rgba(240,248,255,.98);
  filter:drop-shadow(0 0 2px rgba(0,0,0,.95));
  transition:opacity .12s ease;
}
.hud-xh-t{
  position:absolute; left:0; top:0; background:var(--col);
  border-radius:.5px;
  box-shadow:0 0 0 1px rgba(0,0,0,.85), 0 0 4px rgba(0,0,0,.65);
  transition:background .08s ease;
}
.hud-xh-t.h{ width:var(--len); height:var(--thick); }
.hud-xh-t.v{ width:var(--thick); height:var(--len); }
.hud-xh-t.n{ transform:translate(calc(var(--thick)/-2), calc(-1*(var(--gap) + var(--len)))); }
.hud-xh-t.s{ transform:translate(calc(var(--thick)/-2), var(--gap)); }
.hud-xh-t.w{ transform:translate(calc(-1*(var(--gap) + var(--len))), calc(var(--thick)/-2)); }
.hud-xh-t.e{ transform:translate(var(--gap), calc(var(--thick)/-2)); }
.hud-xh-dot{
  position:absolute; left:0; top:0; width:2.6px; height:2.6px; border-radius:50%;
  background:var(--col); transform:translate(-50%,-50%);
  box-shadow:0 0 0 1px rgba(0,0,0,.85), 0 0 3px rgba(0,0,0,.7);
}
.hud-xh--hit .hud-xh-t{ background:var(--accent); }
.hud-xh--hostile{ --col:#ff6a5a; }

/* ============================ HITMARKER ============================ */
.hud-hit-layer{ position:absolute; left:50%; top:50%; width:0; height:0; }
.hud-hit{
  position:absolute; left:0; top:0; width:0; height:0;
  transform:translate(-50%,-50%);
  --c:rgba(240,248,255,.95); --s:15px; --g:5px; --t:2px;
  animation:hit-pop .26s cubic-bezier(.15,.85,.3,1) forwards;
}
.hud-hit i{ position:absolute; left:0; top:0; background:var(--c); border-radius:1px;
  box-shadow:0 0 3px rgba(0,0,0,.7); }
.hud-hit i.a{ width:var(--s); height:var(--t); transform-origin:0 50%;
  transform:rotate(45deg) translate(var(--g),-50%); }
.hud-hit i.b{ width:var(--s); height:var(--t); transform-origin:0 50%;
  transform:rotate(135deg) translate(var(--g),-50%); }
.hud-hit i.c{ width:var(--s); height:var(--t); transform-origin:0 50%;
  transform:rotate(225deg) translate(var(--g),-50%); }
.hud-hit i.d{ width:var(--s); height:var(--t); transform-origin:0 50%;
  transform:rotate(315deg) translate(var(--g),-50%); }
.hud-hit.hs{ --c:var(--accent); --s:20px; --t:3px; --g:6px; }
.hud-hit.kill{ --c:#ff5647; --s:22px; --t:3px; --g:6px; animation:hit-pop-kill .34s cubic-bezier(.15,.85,.3,1) forwards; }
.hud-hit.hold{ animation:none; opacity:1; }
@keyframes hit-pop{
  0%{ opacity:0; scale:1.55; }
  18%{ opacity:1; scale:1; }
  55%{ opacity:1; scale:1; }
  100%{ opacity:0; scale:.94; }
}
@keyframes hit-pop-kill{
  0%{ opacity:0; scale:1.7; rotate:0deg; }
  16%{ opacity:1; scale:1.05; }
  60%{ opacity:1; scale:1; rotate:0deg; }
  100%{ opacity:0; scale:.9; rotate:14deg; }
}

/* ============================ AMMO PANEL ============================ */
.hud-ammo{
  position:absolute; right:var(--safe); bottom:var(--safe);
  min-width:clamp(180px,17vw,300px);
  padding:clamp(8px,1vmin,16px) clamp(12px,1.3vw,22px);
  text-align:right;
  background:linear-gradient(180deg,rgba(10,14,20,.10),var(--panel));
  border:1px solid var(--stroke);
  border-right:2px solid var(--accent);
  border-radius:3px;
  backdrop-filter:blur(6px); -webkit-backdrop-filter:blur(6px);
  box-shadow:var(--shadow);
  transition:opacity .3s ease, filter .25s ease, border-color .25s ease;
}
.hud-ammo-name{
  font-size:clamp(15px,1.7vw,30px); font-weight:700; letter-spacing:.12em;
  line-height:1; color:var(--fg); text-shadow:0 1px 3px rgba(0,0,0,.8);
}
.hud-ammo-sub{
  margin-top:.28em; font-size:clamp(8px,.72vw,12px); letter-spacing:.24em;
  color:var(--dim);
}
.hud-ammo-sub .fm{ color:var(--accent); }
.hud-ammo-counts{
  display:flex; align-items:baseline; justify-content:flex-end; gap:.18em;
  margin-top:.18em; line-height:.92;
}
.hud-ammo-counts .mag{
  font-family:${M}; font-variant-numeric:tabular-nums; font-feature-settings:"tnum" 1;
  font-size:clamp(34px,4.6vw,74px); font-weight:700; color:var(--fg);
  text-shadow:0 2px 10px rgba(0,0,0,.6); letter-spacing:-.01em;
  transition:color .18s ease;
}
.hud-ammo-counts .sep{ font-size:clamp(15px,1.7vw,28px); color:var(--faint); font-family:${M}; margin:0 .1em; }
.hud-ammo-counts .res{
  font-family:${M}; font-variant-numeric:tabular-nums;
  font-size:clamp(15px,1.8vw,30px); font-weight:600; color:var(--dim);
}
.hud-ammo-counts .mag.pop{ animation:num-pop .22s ease; }
@keyframes num-pop{ 0%{ transform:translateY(-.06em); opacity:.55; } 100%{ transform:none; opacity:1; } }

.hud-ammo-bar{ display:flex; gap:2px; justify-content:flex-end; margin-top:.55em; height:clamp(5px,.6vh,9px); }
.hud-mag-t{ flex:1 1 auto; max-width:8px; background:var(--accent);
  border-radius:1px; box-shadow:0 0 4px rgba(255,191,73,.35);
  transition:opacity .12s ease, background .12s ease; }
.hud-mag-t.spent{ opacity:.16; background:var(--dim); box-shadow:none; }
.hud-ammo-meter{ position:relative; margin-top:.55em; height:clamp(5px,.6vh,9px);
  background:rgba(255,255,255,.09); border-radius:2px; overflow:hidden; }
.hud-ammo-meter i{ position:absolute; inset:0; transform-origin:left;
  background:linear-gradient(90deg,var(--accent),var(--accent-2));
  box-shadow:0 0 6px rgba(255,191,73,.4); transition:transform .12s ease; }

.hud-ammo.low{ border-right-color:var(--danger); }
.hud-ammo.low .mag{ color:var(--danger); animation:low-flash 1s steps(1) infinite; }
@keyframes low-flash{ 50%{ color:#ffb0a8; } }
.hud-ammo.reloading{ filter:saturate(.5) brightness(.82); }
.hud-ammo.reloading .hud-ammo-counts .mag{ color:var(--dim); }

.hud-ammo-arc{ position:absolute; left:14px; bottom:14px; width:clamp(28px,3vw,46px); height:clamp(28px,3vw,46px);
  opacity:0; transition:opacity .18s ease; }
.hud-ammo.reloading .hud-ammo-arc{ opacity:1; }
.hud-ammo-arc svg{ width:100%; height:100%; transform:rotate(-90deg); }
.hud-ammo-arc .trk{ fill:none; stroke:rgba(255,255,255,.14); stroke-width:3; }
.hud-ammo-arc .prg{ fill:none; stroke:var(--accent); stroke-width:3; stroke-linecap:round;
  filter:drop-shadow(0 0 3px rgba(255,191,73,.6)); }

/* ============================ HEALTH / VIGNETTE ============================ */
.hud-health{ position:absolute; inset:0; --dmg:0; }
.hud-vig{ position:absolute; inset:0;
  background:radial-gradient(ellipse 120% 90% at 50% 50%,
     transparent 42%, rgba(150,6,6,.30) 78%, rgba(120,0,0,.62) 100%);
  opacity:calc(var(--dmg)); transition:opacity .35s ease; }
.hud-vig.pulse{ animation:heart 1.05s ease-in-out infinite; }
@keyframes heart{ 0%,100%{ filter:none; } 40%{ filter:brightness(1.55) saturate(1.3); } 55%{ filter:brightness(1); } }
.hud-hitflash{ position:absolute; inset:0; opacity:0;
  background:radial-gradient(ellipse 130% 100% at var(--fx,50%) var(--fy,50%),
     rgba(255,60,44,.5), transparent 46%); }
.hud-hitflash.go{ animation:hitflash .5s ease-out; }
@keyframes hitflash{ 0%{ opacity:.9; } 100%{ opacity:0; } }
.hud-regen{ position:absolute; inset:0; opacity:0;
  background:radial-gradient(ellipse 120% 90% at 50% 100%, rgba(90,220,150,.16), transparent 55%);
  transition:opacity .5s ease; }
.hud-regen.on{ opacity:1; animation:regen-breathe 2.2s ease-in-out infinite; }
@keyframes regen-breathe{ 0%,100%{ opacity:.5; } 50%{ opacity:1; } }
.hud-warn{ position:absolute; left:50%; bottom:20%; transform:translateX(-50%);
  font-size:clamp(11px,1vw,16px); letter-spacing:.4em; color:var(--danger);
  text-shadow:0 0 12px rgba(255,40,30,.7); opacity:0; }
.hud-warn.on{ opacity:1; animation:warn-blink 1.05s steps(1) infinite; }
@keyframes warn-blink{ 50%{ opacity:.25; } }

/* ============================ DAMAGE DIRECTION ============================ */
.hud-dmg-layer{ position:absolute; left:50%; top:50%; width:0; height:0; }
.hud-dmg{ position:absolute; left:0; top:0; width:0; height:0;
  animation:dmg-fade 1.5s ease-out forwards; }
.hud-dmg svg{ position:absolute; left:50%; top:50%;
  width:clamp(96px,13vmin,190px); height:clamp(96px,13vmin,190px);
  transform:translate(-50%,-50%); overflow:visible; }
.hud-dmg .arc{ fill:url(#hud-dmg-grad); filter:drop-shadow(0 0 7px rgba(255,50,40,.85)); }
.hud-dmg.hold{ animation:none; opacity:1; }
@keyframes dmg-fade{ 0%{ opacity:0; scale:.82; } 12%{ opacity:1; scale:1; } 60%{ opacity:.85; } 100%{ opacity:0; scale:1.04; } }

/* ============================ MINIMAP ============================ */
.hud-map{ position:absolute; left:var(--safe); top:var(--safe);
  width:clamp(126px,15vmin,240px); aspect-ratio:1/1;
  border-radius:6px;
  background:linear-gradient(155deg,rgba(14,20,28,.62),rgba(6,10,15,.78));
  border:1px solid var(--stroke);
  box-shadow:var(--shadow), inset 0 0 0 1px rgba(255,255,255,.04);
  padding:6px; transition:opacity .3s ease;
}
.hud-map::before{ content:''; position:absolute; inset:0; border-radius:6px;
  border:1px solid rgba(255,191,73,.16); pointer-events:none;
  box-shadow:inset 0 0 22px rgba(0,0,0,.55); }
.hud-map-cv{ display:block; width:100%; height:100%; border-radius:4px; }
.hud-map-tag{ position:absolute; left:9px; top:7px; font-size:clamp(7px,.6vw,10px);
  letter-spacing:.24em; color:var(--dim); text-shadow:0 1px 2px #000; }
.hud-map-coord{ position:absolute; right:9px; bottom:6px; font-family:${M};
  font-size:clamp(7px,.55vw,10px); letter-spacing:.06em; color:var(--faint); }

/* ============================ KILLFEED ============================ */
.hud-feed{ position:absolute; right:var(--safe); top:var(--safe);
  display:flex; flex-direction:column; align-items:flex-end; gap:5px; }
.hud-feed-row{ display:flex; align-items:center; gap:.5em;
  padding:.28em .6em; border-radius:3px;
  background:var(--panel); border:1px solid var(--stroke);
  border-right:2px solid rgba(255,80,70,.75);
  backdrop-filter:blur(4px); -webkit-backdrop-filter:blur(4px);
  font-size:clamp(10px,.92vw,15px); letter-spacing:.1em; white-space:nowrap;
  box-shadow:var(--shadow);
  animation:feed-in .28s cubic-bezier(.2,.8,.25,1) both;
}
.hud-feed-row.out{ animation:feed-out .3s ease forwards; }
.hud-feed-row.mine{ border-right-color:var(--accent); }
.hud-feed-row .k{ color:var(--fg); font-weight:700; }
.hud-feed-row.mine .k{ color:var(--accent); text-shadow:0 0 8px rgba(255,191,73,.4); }
.hud-feed-row .v{ color:#ff6a5a; font-weight:700; }
.hud-feed-row .wpn{ display:inline-flex; align-items:center; color:var(--dim); }
.hud-feed-row .wpn svg{ width:clamp(22px,2.3vw,38px); height:auto; fill:currentColor; }
.hud-feed-row .hs{ color:var(--accent); display:inline-flex; }
.hud-feed-row .hs svg{ width:clamp(11px,1vw,16px); height:clamp(11px,1vw,16px); fill:currentColor;
  filter:drop-shadow(0 0 4px rgba(255,191,73,.6)); }
@keyframes feed-in{ 0%{ opacity:0; transform:translateX(26px); } 100%{ opacity:1; transform:none; } }
@keyframes feed-out{ 0%{ opacity:1; } 100%{ opacity:0; transform:translateX(10px); } }

/* ============================ KILLSTREAK BAR ============================ */
.hud-ks{ position:absolute; left:var(--safe); bottom:var(--safe);
  display:flex; flex-direction:column; gap:.5em; }
.hud-ks-prog{ display:flex; align-items:center; gap:.6em; }
.hud-ks-prog .lbl{ font-size:clamp(8px,.7vw,12px); letter-spacing:.22em; color:var(--dim); }
.hud-ks-prog .lbl b{ color:var(--accent); font-weight:700; }
.hud-ks-track{ position:relative; width:clamp(120px,12vw,210px); height:6px;
  background:rgba(255,255,255,.09); border-radius:3px; overflow:hidden;
  border:1px solid var(--stroke); }
.hud-ks-track i{ position:absolute; inset:0; transform-origin:left; transform:scaleX(0);
  background:linear-gradient(90deg,var(--accent),var(--accent-2));
  box-shadow:0 0 8px rgba(255,191,73,.5); transition:transform .45s cubic-bezier(.2,.8,.25,1); }
.hud-ks-track .ticks{ position:absolute; inset:0; }
.hud-ks-track .ticks u{ position:absolute; top:0; bottom:0; width:1px; background:rgba(6,10,15,.7); }
.hud-ks-icons{ display:flex; gap:.5em; }
.hud-ks-icon{ position:relative; display:flex; align-items:center; gap:.35em;
  padding:.3em .55em; border-radius:3px;
  background:var(--panel); border:1px solid var(--stroke);
  backdrop-filter:blur(4px); -webkit-backdrop-filter:blur(4px);
  animation:ks-icon-in .3s ease both; }
.hud-ks-icon.ready{ border-color:var(--accent); box-shadow:0 0 12px rgba(255,191,73,.25); }
.hud-ks-icon.ready::after{ content:''; position:absolute; inset:0; border-radius:3px;
  border:1px solid var(--accent); animation:ks-ready 1.4s ease-in-out infinite; }
@keyframes ks-ready{ 0%,100%{ opacity:.3; } 50%{ opacity:.9; } }
.hud-ks-icon svg{ width:clamp(16px,1.6vw,26px); height:clamp(16px,1.6vw,26px); fill:var(--accent); }
.hud-ks-icon .key{ font-family:${M}; font-size:clamp(9px,.8vw,13px); font-weight:700;
  color:var(--accent-ink); background:var(--accent); border-radius:2px;
  padding:.05em .35em; letter-spacing:.02em; }
.hud-ks-icon .nm{ font-size:clamp(8px,.7vw,12px); letter-spacing:.14em; color:var(--fg); }
@keyframes ks-icon-in{ 0%{ opacity:0; transform:translateY(8px) scale(.9); } 100%{ opacity:1; transform:none; } }

.hud-ks-banner{ position:absolute; left:0; right:0; top:24%;
  display:flex; flex-direction:column; align-items:center; gap:.2em;
  opacity:0; transform:translateY(-24px); pointer-events:none; }
.hud-ks-banner.show{ animation:banner 3.4s cubic-bezier(.18,.9,.2,1) both; }
.hud-ks-banner .flash{ position:absolute; left:50%; top:50%; width:60vw; height:3px;
  transform:translate(-50%,-50%); background:linear-gradient(90deg,transparent,var(--accent),transparent);
  box-shadow:0 0 24px 6px rgba(255,191,73,.6); }
.hud-ks-banner .big{ font-size:clamp(26px,4.4vw,72px); font-weight:700; letter-spacing:.14em;
  color:var(--fg); text-shadow:0 0 26px rgba(255,191,73,.55),0 3px 10px rgba(0,0,0,.7); }
.hud-ks-banner .big b{ color:var(--accent); }
.hud-ks-banner .cue{ font-size:clamp(11px,1.2vw,20px); letter-spacing:.34em; color:var(--accent); }
.hud-ks-banner .cue kbd{ font-family:${M}; background:var(--accent); color:var(--accent-ink);
  padding:.06em .4em; border-radius:3px; font-weight:700; margin:0 .15em; }
@keyframes banner{
  0%{ opacity:0; transform:translateY(-34px) scale(.96); letter-spacing:.5em; }
  12%{ opacity:1; transform:translateY(0) scale(1); }
  82%{ opacity:1; transform:translateY(0) scale(1); }
  100%{ opacity:0; transform:translateY(-14px) scale(1.02); }
}

/* ============================ OBJECTIVE MARKERS ============================ */
.hud-obj-layer{ position:absolute; inset:0; }
.hud-obj{ position:absolute; left:0; top:0; transform:translate(-50%,-50%);
  display:flex; flex-direction:column; align-items:center; gap:2px;
  filter:drop-shadow(0 1px 3px rgba(0,0,0,.85)); will-change:transform; }
.hud-obj .dia{ width:clamp(12px,1.3vw,20px); height:clamp(12px,1.3vw,20px);
  border:2px solid var(--accent); background:rgba(255,191,73,.12);
  transform:rotate(45deg); box-shadow:0 0 10px rgba(255,191,73,.35);
  display:flex; align-items:center; justify-content:center; }
.hud-obj .dia b{ transform:rotate(-45deg); color:var(--accent); font-size:.7em; font-weight:700; }
.hud-obj .dist{ font-family:${M}; font-size:clamp(8px,.72vw,12px); letter-spacing:.08em;
  color:var(--accent-2); text-shadow:0 1px 2px #000; }
.hud-obj .cap{ font-size:clamp(8px,.66vw,11px); letter-spacing:.2em; color:var(--fg); }
.hud-obj.edge .dia{ border-radius:50%; }
.hud-obj.threat{ }
.hud-obj.threat .dia{ border-color:var(--danger); background:rgba(255,60,44,.14);
  box-shadow:0 0 10px rgba(255,60,44,.4); transform:rotate(45deg) scale(.82); }
.hud-obj.threat .dia b{ color:var(--danger); }

/* ============================ SCOPE OVERLAY ============================ */
.hud-scope{ position:absolute; inset:0; opacity:0; pointer-events:none;
  transition:opacity .12s linear; }
.hud-scope.show{ opacity:1; }
.hud-scope .mask{ position:absolute; inset:0;
  background:radial-gradient(circle at 50% 50%,
     transparent calc(38vmin - 2px), rgba(0,0,0,.72) calc(38vmin), #000 calc(38vmin + 8px));
}
.hud-scope .fringe{ position:absolute; inset:0; mix-blend-mode:screen; opacity:.5;
  background:radial-gradient(circle at 50% 50%,
     transparent calc(38vmin - 14px), rgba(80,0,255,.20) calc(38vmin - 6px),
     rgba(255,0,60,.18) 38vmin, transparent calc(38vmin + 2px)); }
.hud-scope .glass{ position:absolute; left:50%; top:50%; width:76vmin; height:76vmin;
  transform:translate(-50%,-50%); border-radius:50%;
  box-shadow:inset 0 0 60px rgba(0,0,0,.6), inset 0 0 4px rgba(180,210,255,.35),
     0 0 0 3px rgba(10,14,20,.9), 0 0 0 4px rgba(120,150,180,.25);
  animation:breathe 5.5s ease-in-out infinite; }
.hud-scope .glint{ position:absolute; left:50%; top:50%; width:76vmin; height:76vmin;
  transform:translate(-50%,-50%); border-radius:50%; overflow:hidden; }
.hud-scope .glint::before{ content:''; position:absolute; top:-30%; left:-30%; width:60%; height:160%;
  background:linear-gradient(105deg,transparent,rgba(190,220,255,.14),transparent);
  transform:rotate(18deg); animation:glint 6s ease-in-out infinite; }
.hud-scope .reticle{ position:absolute; left:50%; top:50%; width:76vmin; height:76vmin;
  transform:translate(-50%,-50%); animation:breathe 5.5s ease-in-out infinite; }
.hud-scope .reticle svg{ width:100%; height:100%; }
.hud-scope .reticle line, .hud-scope .reticle circle{ stroke:rgba(15,20,26,.92); }
.hud-scope .reticle .dot{ fill:rgba(15,20,26,.92); }
@keyframes breathe{ 0%,100%{ transform:translate(-50%,-50%) scale(1); } 50%{ transform:translate(-50.4%,-49.6%) scale(1.006); } }
@keyframes glint{ 0%,70%{ transform:translate(-40%,0) rotate(18deg); opacity:0; }
   80%{ opacity:1; } 100%{ transform:translate(240%,0) rotate(18deg); opacity:0; } }

/* ============================ TOP OBJECTIVE + NOTIFY ============================ */
.hud-objective{ position:absolute; left:50%; top:calc(var(--safe) + .2vmin); transform:translateX(-50%);
  display:flex; flex-direction:column; align-items:center; gap:.2em; text-align:center; }
.hud-objective .cap{ font-size:clamp(8px,.66vw,11px); letter-spacing:.42em; color:var(--accent); }
.hud-objective .txt{ font-size:clamp(12px,1.3vw,22px); letter-spacing:.14em; color:var(--fg);
  text-shadow:0 1px 6px rgba(0,0,0,.8); }
.hud-objective .txt.swap{ animation:obj-swap .4s ease; }
@keyframes obj-swap{ 0%{ opacity:0; transform:translateY(-6px); } 100%{ opacity:1; } }

.hud-notify{ position:absolute; left:50%; top:16%; transform:translateX(-50%);
  display:flex; flex-direction:column; align-items:center; gap:6px; }
.hud-toast{ display:flex; flex-direction:column; align-items:center;
  padding:.4em 1.1em; border-radius:3px;
  background:var(--panel); border:1px solid var(--stroke); border-top:2px solid var(--accent);
  backdrop-filter:blur(5px); -webkit-backdrop-filter:blur(5px); box-shadow:var(--shadow);
  animation:toast 3.2s cubic-bezier(.2,.8,.25,1) both; }
.hud-toast .t{ font-size:clamp(12px,1.2vw,20px); letter-spacing:.16em; font-weight:700; color:var(--fg); }
.hud-toast .s{ font-size:clamp(8px,.72vw,12px); letter-spacing:.22em; color:var(--dim); margin-top:.2em; }
.hud-toast.good{ border-top-color:var(--good); } .hud-toast.good .t{ color:#c9f7dc; }
.hud-toast.bad{ border-top-color:var(--danger); } .hud-toast.bad .t{ color:#ffc9c3; }
@keyframes toast{ 0%{ opacity:0; transform:translateY(-10px) scale(.98); } 10%{ opacity:1; transform:none; }
   85%{ opacity:1; } 100%{ opacity:0; transform:translateY(-6px); } }

/* ============================ STATS READOUT ============================ */
.hud-stats{ position:absolute; left:var(--safe);
  top:calc(var(--safe) + clamp(126px,15vmin,240px) + 8px);
  padding:.4em .7em; border-radius:3px; text-align:left;
  background:var(--panel); border:1px solid var(--stroke); border-left:2px solid var(--accent);
  backdrop-filter:blur(4px); -webkit-backdrop-filter:blur(4px);
  font-family:${M}; font-size:clamp(9px,.72vw,12px); letter-spacing:.03em; line-height:1.55;
  color:var(--dim); display:none; white-space:nowrap; }
.hud-stats.on{ display:block; }
.hud-stats b{ color:var(--accent); font-weight:700; }
.hud-stats .g{ color:var(--good); } .hud-stats .r{ color:var(--danger); }

/* ============================ PAUSE MENU ============================ */
.hud-menu{ position:absolute; inset:0; z-index:60; display:none;
  pointer-events:auto;
  background:radial-gradient(ellipse at center,rgba(6,10,15,.78),rgba(3,5,8,.94));
  backdrop-filter:blur(9px); -webkit-backdrop-filter:blur(9px);
  opacity:0; transition:opacity .26s ease; }
.hud-menu.open{ display:grid; grid-template-columns:minmax(220px,26vw) 1fr; opacity:1; }
.hud-menu .rail{ border-right:1px solid var(--stroke);
  padding:clamp(24px,5vh,64px) clamp(20px,2.4vw,44px);
  display:flex; flex-direction:column; gap:clamp(8px,1.2vh,16px);
  background:linear-gradient(180deg,rgba(10,14,20,.4),transparent); }
.hud-menu .brand{ margin-bottom:clamp(14px,3vh,40px); }
.hud-menu .brand h1{ font-size:clamp(22px,2.6vw,40px); font-weight:700; letter-spacing:.14em;
  background:linear-gradient(180deg,#fff,#93a7bb); -webkit-background-clip:text; background-clip:text;
  -webkit-text-fill-color:transparent; }
.hud-menu .brand p{ font-size:clamp(8px,.7vw,12px); letter-spacing:.42em; color:var(--accent); margin-top:.3em; }
.hud-nav{ appearance:none; border:0; background:transparent; cursor:pointer;
  text-align:left; font-family:${D}; color:var(--dim);
  font-size:clamp(15px,1.5vw,24px); font-weight:600; letter-spacing:.14em; text-transform:uppercase;
  padding:.35em .1em .35em .8em; position:relative; transition:color .16s ease, padding .16s ease; outline:none; }
.hud-nav::before{ content:''; position:absolute; left:0; top:50%; height:0%; width:3px;
  background:var(--accent); transform:translateY(-50%); transition:height .18s ease; box-shadow:var(--glow); }
.hud-nav:hover, .hud-nav:focus-visible{ color:var(--fg); padding-left:1.05em; }
.hud-nav.active{ color:var(--fg); }
.hud-nav.active::before{ height:64%; }
.hud-nav.danger:hover{ color:#ffb0a8; } .hud-nav.danger.active::before{ background:var(--danger); }

.hud-menu .page{ padding:clamp(24px,5vh,64px) clamp(24px,3vw,60px); overflow-y:auto; }
.hud-menu .page h2{ font-size:clamp(13px,1.2vw,20px); letter-spacing:.34em; color:var(--accent);
  margin:2em 0 1.2em; padding-bottom:.5em; border-bottom:1px solid var(--stroke); }
.hud-menu .page h2:first-child{ margin-top:0; }
.hud-set{ display:grid; grid-template-columns:minmax(120px,14vw) 1fr auto; align-items:center;
  gap:1.2em; padding:.7em 0; border-bottom:1px solid rgba(255,255,255,.05); }
.hud-set .name{ font-size:clamp(11px,1vw,16px); letter-spacing:.12em; color:var(--fg); }
.hud-set .name small{ display:block; color:var(--faint); letter-spacing:.08em; font-size:.78em; margin-top:.2em; }
.hud-set .val{ font-family:${M}; font-size:clamp(11px,.9vw,15px); color:var(--accent); min-width:3.4em; text-align:right; }

/* custom range */
.hud-range{ -webkit-appearance:none; appearance:none; width:100%; height:4px; border-radius:2px;
  background:linear-gradient(90deg,var(--accent) var(--p,50%),rgba(255,255,255,.14) var(--p,50%));
  outline:none; cursor:pointer; }
.hud-range::-webkit-slider-thumb{ -webkit-appearance:none; width:15px; height:15px; border-radius:50%;
  background:var(--fg); border:2px solid var(--accent); box-shadow:0 0 8px rgba(255,191,73,.5),0 1px 3px rgba(0,0,0,.6);
  transition:transform .1s ease; }
.hud-range::-webkit-slider-thumb:hover{ transform:scale(1.18); }
.hud-range::-moz-range-thumb{ width:15px; height:15px; border-radius:50%; background:var(--fg);
  border:2px solid var(--accent); box-shadow:0 0 8px rgba(255,191,73,.5); }

/* custom toggle */
.hud-toggle{ position:relative; width:46px; height:22px; border-radius:12px; cursor:pointer;
  background:rgba(255,255,255,.1); border:1px solid var(--stroke); transition:background .18s ease, border-color .18s ease; }
.hud-toggle i{ position:absolute; top:1px; left:1px; width:18px; height:18px; border-radius:50%;
  background:var(--dim); transition:transform .18s cubic-bezier(.2,.9,.2,1), background .18s ease; }
.hud-toggle.on{ background:rgba(255,191,73,.22); border-color:var(--accent); }
.hud-toggle.on i{ transform:translateX(24px); background:var(--accent); box-shadow:0 0 8px rgba(255,191,73,.6); }

/* segmented */
.hud-seg{ display:flex; gap:2px; background:rgba(255,255,255,.06); border:1px solid var(--stroke);
  border-radius:4px; padding:2px; }
.hud-seg button{ appearance:none; border:0; background:transparent; cursor:pointer; color:var(--dim);
  font-family:${D}; font-size:clamp(9px,.8vw,13px); letter-spacing:.12em; text-transform:uppercase;
  padding:.4em .7em; border-radius:3px; transition:color .14s ease, background .14s ease; outline:none; }
.hud-seg button:hover{ color:var(--fg); }
.hud-seg button.sel{ color:var(--accent-ink); background:var(--accent); font-weight:700; box-shadow:0 0 8px rgba(255,191,73,.4); }

.hud-menu .foot{ margin-top:1.4em; font-size:clamp(9px,.75vw,12px); letter-spacing:.16em; color:var(--faint); }
.hud-menu .foot kbd{ font-family:${M}; color:var(--dim); border:1px solid var(--stroke); border-radius:3px; padding:.05em .35em; }

/* loadout list */
.hud-load{ display:flex; flex-direction:column; gap:8px; }
.hud-load .w{ display:flex; align-items:center; gap:1em; padding:.7em 1em; border-radius:4px;
  background:var(--panel); border:1px solid var(--stroke); border-left:2px solid transparent; cursor:pointer;
  transition:border-color .16s ease, background .16s ease; }
.hud-load .w:hover, .hud-load .w.sel{ border-left-color:var(--accent); background:rgba(255,191,73,.06); }
.hud-load .w svg{ width:clamp(40px,4vw,72px); height:auto; fill:var(--dim); }
.hud-load .w.sel svg, .hud-load .w:hover svg{ fill:var(--accent); }
.hud-load .w .meta .nm{ font-size:clamp(13px,1.2vw,20px); font-weight:700; letter-spacing:.1em; color:var(--fg); }
.hud-load .w .meta .cl{ font-size:clamp(8px,.7vw,12px); letter-spacing:.2em; color:var(--dim); margin-top:.2em; }
.hud-load .w .meta .cl .fm{ color:var(--accent); }

@media (max-width:720px){ .hud-menu.open{ grid-template-columns:1fr; } .hud-menu .rail{ border-right:0; } }
`;
