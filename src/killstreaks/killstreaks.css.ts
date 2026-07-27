/**
 * killstreaks.css.ts — all DOM/CSS the killstreak systems need, injected as a
 * single stylesheet so nothing here touches `index.html` or `src/ui`.
 *
 * The targeting overlay is a crisp DOM layer that frames the world-space
 * reticle with genuine military-UI chrome (corner brackets, SATCOM status,
 * live coordinate + ETA readouts, a designate/abort prompt). It sits *under*
 * the HUD's own z-index band so it never fights the HUD another agent owns.
 */

const STYLE_ID = 'killstreak-styles';

export const KS = {
  root: 'ks-root',
  targeting: 'ks-targeting',
  scan: 'ks-scan',
  brackets: 'ks-brackets',
  status: 'ks-status',
  statusDot: 'ks-status-dot',
  readout: 'ks-readout',
  prompt: 'ks-prompt',
  abort: 'ks-abort',
  toast: 'ks-toast',
  capture: 'ks-capture',
  captureBar: 'ks-capture-bar',
  captureFill: 'ks-capture-fill',
  concussion: 'ks-concussion',
  show: 'is-shown',
} as const;

const CSS = /* css */ `
.${KS.root}{position:fixed;inset:0;pointer-events:none;z-index:40;
  font-family:"SFMono-Regular",ui-monospace,"Roboto Mono",Menlo,Consolas,monospace;
  color:#8dff9e;text-shadow:0 0 6px rgba(60,255,120,.35);}

/* ---- Targeting overlay -------------------------------------------------- */
.${KS.targeting}{position:absolute;inset:0;opacity:0;transition:opacity .25s ease;
  background:
    radial-gradient(120% 90% at 50% 46%,rgba(0,0,0,0) 52%,rgba(2,10,4,.55) 100%),
    repeating-linear-gradient(0deg,rgba(0,0,0,0) 0 2px,rgba(0,20,6,.16) 2px 4px);}
.${KS.targeting}.${KS.show}{opacity:1;}

/* animated scan sweep */
.${KS.scan}{position:absolute;left:0;right:0;height:34%;top:-34%;
  background:linear-gradient(180deg,rgba(120,255,150,0) 0%,rgba(120,255,150,.10) 70%,rgba(150,255,170,.22) 100%);
  animation:ks-sweep 3.4s linear infinite;mix-blend-mode:screen;}
@keyframes ks-sweep{0%{top:-34%}100%{top:100%}}

/* corner brackets forming a designation frame */
.${KS.brackets}{position:absolute;left:8%;right:8%;top:9%;bottom:12%;}
.${KS.brackets}::before,.${KS.brackets}::after,
.${KS.brackets} > i::before,.${KS.brackets} > i::after{content:"";position:absolute;width:44px;height:44px;
  border:2px solid rgba(140,255,160,.7);filter:drop-shadow(0 0 4px rgba(80,255,120,.5));}
.${KS.brackets}::before{left:0;top:0;border-right:0;border-bottom:0;}
.${KS.brackets}::after{right:0;top:0;border-left:0;border-bottom:0;}
.${KS.brackets} > i::before{left:0;bottom:0;border-right:0;border-top:0;}
.${KS.brackets} > i::after{right:0;bottom:0;border-left:0;border-top:0;}

.${KS.status}{position:absolute;left:9%;top:6.2%;font-size:13px;letter-spacing:.22em;
  display:flex;align-items:center;gap:9px;text-transform:uppercase;}
.${KS.statusDot}{width:9px;height:9px;border-radius:50%;background:#63ff8a;
  box-shadow:0 0 10px #63ff8a;animation:ks-blink 1.1s steps(1) infinite;}
@keyframes ks-blink{50%{opacity:.25}}

.${KS.readout}{position:absolute;right:9%;top:6.2%;text-align:right;font-size:12px;
  line-height:1.55;letter-spacing:.12em;white-space:pre;opacity:.92;}
.${KS.readout} b{color:#e9ffd0;font-weight:600;}

.${KS.prompt}{position:absolute;left:0;right:0;bottom:7.5%;text-align:center;
  font-size:15px;letter-spacing:.28em;text-transform:uppercase;
  animation:ks-pulse 1.4s ease-in-out infinite;}
.${KS.prompt} kbd{display:inline-block;min-width:1.5em;margin:0 .2em;padding:2px 7px;
  border:1px solid rgba(150,255,170,.55);border-radius:4px;color:#eafff0;
  background:rgba(30,80,40,.35);font-weight:600;box-shadow:inset 0 0 8px rgba(80,255,120,.2);}
.${KS.abort}{color:#ffb27a;text-shadow:0 0 6px rgba(255,140,60,.4);}
@keyframes ks-pulse{50%{opacity:.5}}

/* ---- Capture prompt (care package) ------------------------------------- */
.${KS.capture}{position:absolute;left:0;right:0;bottom:24%;text-align:center;opacity:0;
  transition:opacity .2s ease;color:#ffe08a;text-shadow:0 0 8px rgba(255,180,40,.45);
  font-size:15px;letter-spacing:.2em;text-transform:uppercase;
  font-family:ui-monospace,monospace;}
.${KS.capture}.${KS.show}{opacity:1;}
.${KS.capture} kbd{display:inline-block;margin:0 .25em;padding:2px 8px;border:1px solid rgba(255,200,90,.6);
  border-radius:4px;background:rgba(90,60,10,.4);color:#fff3cf;font-weight:700;}
.${KS.captureBar}{width:190px;height:6px;margin:10px auto 0;border:1px solid rgba(255,200,90,.5);
  border-radius:3px;overflow:hidden;background:rgba(0,0,0,.35);}
.${KS.captureFill}{height:100%;width:0%;background:linear-gradient(90deg,#ffb52e,#ffe08a);
  box-shadow:0 0 8px rgba(255,180,40,.6);}

/* ---- Danger-close concussion flash ------------------------------------- */
.${KS.concussion}{position:absolute;inset:0;opacity:0;pointer-events:none;
  background:radial-gradient(120% 110% at 50% 50%,rgba(255,255,255,0) 40%,rgba(255,240,220,.0) 60%,rgba(120,20,10,.0) 100%);
  box-shadow:inset 0 0 220px rgba(160,30,15,.0);mix-blend-mode:screen;}
`;

/** Inject the killstreak stylesheet exactly once. */
export function ensureKillstreakStyles(): void {
  if (typeof document === 'undefined') return;
  if (document.getElementById(STYLE_ID)) return;
  const el = document.createElement('style');
  el.id = STYLE_ID;
  el.textContent = CSS;
  document.head.appendChild(el);
}
