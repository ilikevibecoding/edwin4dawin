/**
 * The UI's one stylesheet, injected from TypeScript.
 *
 * Everything is sized from `--u`, a viewport-derived unit clamped at both ends,
 * so the whole HUD scales from 720p to 4K without a single fixed pixel size in a
 * layout position. Animation is restricted to `transform` and `opacity`; nothing
 * here animates a property that would force layout.
 */
import { COLOR, FONT } from './Theme';

const STYLE_ID = 'ob-ui-style';

const CSS = `
.ob-ui {
  /* Every size in the HUD is a multiple of this. 1vmin tracks the shorter axis,
     so an ultrawide window does not inflate the chrome, and the clamp keeps the
     readouts legible at 720p without letting them bloat at 4K. */
  --u: clamp(8.4px, 1.18vmin, 21px);
  --edge: calc(var(--u) * 2.4);
  --gap: calc(var(--u) * 0.8);
  --radius: calc(var(--u) * 0.25);

  --accent: ${COLOR.accent};
  --accent-soft: ${COLOR.accentSoft};
  --accent-faint: ${COLOR.accentFaint};
  --danger: ${COLOR.danger};
  --warn: ${COLOR.warn};
  --friendly: ${COLOR.friendly};
  --txt: ${COLOR.text};
  --dim: ${COLOR.dim};
  --faint: ${COLOR.faint};

  --line: rgba(255, 255, 255, 0.115);
  --line-strong: rgba(255, 255, 255, 0.24);
  --panel: rgba(8, 11, 14, 0.4);
  --panel-deep: rgba(6, 8, 11, 0.78);
  --inner: inset 0 0 0 1px rgba(255, 255, 255, 0.045);
  --shade: 0 calc(var(--u) * 0.2) calc(var(--u) * 1.4) rgba(0, 0, 0, 0.5);
  --blur: blur(calc(var(--u) * 0.55)) saturate(1.12);

  --t-micro: calc(var(--u) * 0.94);
  --t-small: calc(var(--u) * 1.12);
  --t-body: calc(var(--u) * 1.32);
  --t-head: calc(var(--u) * 1.9);
  --t-big: calc(var(--u) * 3.1);

  --f-cond: ${FONT.condensed};
  --f-body: ${FONT.body};
  --f-mono: ${FONT.mono};

  --ease: cubic-bezier(0.22, 0.61, 0.24, 1);
  --ease-slam: cubic-bezier(0.12, 0.9, 0.18, 1);

  position: absolute;
  inset: 0;
  overflow: hidden;
  font-family: var(--f-body);
  color: var(--txt);
  font-size: var(--t-body);
  line-height: 1.15;
  -webkit-font-smoothing: antialiased;
  /* Isolates the HUD's layout from the page and lets the compositor treat it as
     one layer. Size containment is deliberately left out: the box is sized by
     its inset rather than by content, and asking for it buys nothing while
     risking a zero-height layer if that ever changes. */
  contain: layout style paint;
}
.ob-ui.no-blur { --blur: none; }
.ob-ui *,
.ob-ui *::before,
.ob-ui *::after { box-sizing: border-box; }

.ob-ui .lbl {
  font-family: var(--f-mono);
  font-size: var(--t-micro);
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--dim);
}
.ob-ui .n {
  font-family: var(--f-cond);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.01em;
}
.ob-ui .panel {
  background: var(--panel);
  border: 1px solid var(--line);
  box-shadow: var(--inner), var(--shade);
  backdrop-filter: var(--blur);
  -webkit-backdrop-filter: var(--blur);
}

/* Corner brackets: four 1px L-shapes, the cheapest way to make a rectangle
   read as an instrument rather than as a div. */
.ob-ui .brackets::before,
.ob-ui .brackets::after {
  content: '';
  position: absolute;
  width: calc(var(--u) * 1.1);
  height: calc(var(--u) * 1.1);
  border: 1px solid var(--accent-soft);
  pointer-events: none;
  /* Above whatever the element is framing: on the minimap the corners would
     otherwise be painted over by the map canvas. */
  z-index: 3;
}
.ob-ui .brackets::before {
  top: -1px;
  left: -1px;
  border-right: 0;
  border-bottom: 0;
}
.ob-ui .brackets::after {
  right: -1px;
  bottom: -1px;
  border-left: 0;
  border-top: 0;
}

/* ======================================================================== */
/* HUD shell                                                                 */
/* ======================================================================== */

.ob-hud {
  --chrome: 1;
  position: absolute;
  inset: 0;
  opacity: 1;
  transition: opacity 0.28s var(--ease);
}
.ob-hud.hidden { opacity: 0; }
.ob-hud > * { position: absolute; }

/* The instrument chrome dims together, leaving the reticle, hitmarkers and
   screen effects at full strength — those are feedback, not furniture. */
.ob-mm,
.ob-cmp,
.ob-kf,
.ob-ammo,
.ob-bl {
  opacity: var(--chrome);
  transition: opacity 0.26s var(--ease);
}

/* Another module has taken the device: the killstreak tablet or the door gun,
   both of which are full-screen instruments carrying their own symbology, and
   both of which composite below #ui-root. The chrome would sit on top of them
   describing a weapon the player is not currently holding and a position they
   are not currently standing in. Three things stay: the centre callout, which
   is the channel those instruments use to tell the player what the controls
   are; the screen effects, because being shot still matters; and the scope
   surround, which the door gun asks for by name through setScopeOverlay and
   expects to compose over its own sight. */
.ob-hud.standdown .ob-mm,
.ob-hud.standdown .ob-cmp,
.ob-hud.standdown .ob-kf,
.ob-hud.standdown .ob-ammo,
.ob-hud.standdown .ob-bl,
.ob-hud.standdown .ob-reticle,
.ob-hud.standdown .ob-markers {
  opacity: 0;
}

.ob-bl {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: calc(var(--u) * 0.8);
}

.ob-hud .region-tl { top: var(--edge); left: var(--edge); }
.ob-hud .region-tc { top: var(--edge); left: 50%; transform: translateX(-50%); }
.ob-hud .region-tr { top: var(--edge); right: var(--edge); }
.ob-hud .region-bl { bottom: var(--edge); left: var(--edge); }
.ob-hud .region-br { bottom: var(--edge); right: var(--edge); }
.ob-hud .region-bc { bottom: var(--edge); left: 50%; transform: translateX(-50%); }

/* ---- reticle / hitmarker / damage arcs (one canvas) -------------------- */
/* Sized to the widest cone the crosshair can open to plus the damage-arc ring,
   and no further: this canvas is cleared and repainted on any frame the reticle
   moves, so every pixel of slack is per-frame rasterisation for nothing. */
.ob-reticle {
  top: 50%;
  left: 50%;
  width: min(46vmin, 44vh);
  height: min(46vmin, 44vh);
  transform: translate(-50%, -50%);
  opacity: 1;
  transition: opacity 0.12s linear;
}
.ob-reticle.faded { opacity: 0; }

/* ---- full-screen feedback layers --------------------------------------- */
.ob-fx {
  inset: 0;
  pointer-events: none;
}
/* These are plain alpha layers rather than blend modes on purpose: the HUD root
   is a contained, isolated stacking context, so a blend mode here would resolve
   against a transparent backdrop and degrade to normal compositing anyway. */
.ob-fx-damage,
.ob-fx-low,
.ob-fx-grit {
  position: absolute;
  inset: 0;
  opacity: 0;
  will-change: opacity;
}
/* Blood at the very edge of the frame, heaviest at the sides.

   The radii are both quoted against the box, so 50% puts the midpoint of every
   edge at exactly the last colour stop and the corners past it. Anything larger
   pushes the strong end of the ramp off-screen: at 118% the left edge of a 16:9
   frame lands at 0.42 of the gradient, which is inside the transparent stop —
   the vignette is then computed, composited, and invisible. */
.ob-fx-damage {
  background:
    radial-gradient(56% 56% at 50% 50%, rgba(0, 0, 0, 0) 40%, rgba(104, 8, 5, 0.42) 76%, rgba(126, 9, 6, 0.86) 100%),
    radial-gradient(42% 46% at 0% 50%, rgba(122, 10, 7, 0.5), transparent 70%),
    radial-gradient(42% 46% at 100% 50%, rgba(122, 10, 7, 0.5), transparent 70%);
}
.ob-fx-low {
  background:
    radial-gradient(58% 58% at 50% 50%, rgba(0, 0, 0, 0) 34%, rgba(88, 4, 2, 0.46) 74%, rgba(52, 2, 1, 0.95) 100%);
  backdrop-filter: saturate(0.42) blur(1.4px) brightness(0.92);
  -webkit-backdrop-filter: saturate(0.42) blur(1.4px) brightness(0.92);
}
.ob-fx-low.beat { animation: ob-beat 1.05s var(--ease) infinite; }
@keyframes ob-beat {
  0%, 100% { transform: scale(1); }
  8% { transform: scale(1.035); }
  20% { transform: scale(1.004); }
  30% { transform: scale(1.022); }
  46% { transform: scale(1); }
}
/* Suppression: dust and grit, a fast flicker rather than a smooth fade. */
.ob-fx-grit {
  background-image:
    radial-gradient(circle at 18% 26%, rgba(255, 255, 255, 0.07) 0 1px, transparent 1.6px),
    radial-gradient(circle at 62% 71%, rgba(255, 255, 255, 0.06) 0 1px, transparent 1.6px),
    radial-gradient(circle at 83% 34%, rgba(255, 255, 255, 0.05) 0 1px, transparent 1.6px),
    radial-gradient(58% 58% at 50% 50%, transparent 40%, rgba(20, 16, 12, 0.62) 100%);
  background-size: 7px 7px, 11px 11px, 13px 13px, 100% 100%;
  animation: ob-grit 0.14s steps(2, end) infinite;
}
@keyframes ob-grit {
  0% { background-position: 0 0, 0 0, 0 0, 0 0; }
  50% { background-position: 3px 2px, -2px 4px, 5px -3px, 0 0; }
  100% { background-position: -2px 5px, 4px -1px, -4px 2px, 0 0; }
}

/* ---- minimap ----------------------------------------------------------- */
.ob-mm { --mm: calc(var(--u) * 15.4); width: var(--mm); }
.ob-mm-frame {
  position: relative;
  width: var(--mm);
  height: var(--mm);
  overflow: hidden;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  box-shadow: var(--inner), var(--shade);
}
.ob-mm-frame canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
}
.ob-mm-grad {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: radial-gradient(62% 62% at 50% 50%, transparent 58%, rgba(4, 6, 8, 0.55) 100%);
}
.ob-mm-badge {
  position: absolute;
  top: calc(var(--u) * 0.4);
  right: calc(var(--u) * 0.4);
  display: flex;
  align-items: center;
  gap: calc(var(--u) * 0.3);
  padding: calc(var(--u) * 0.1) calc(var(--u) * 0.42);
  background: rgba(6, 8, 11, 0.66);
  border: 1px solid var(--line);
}
.ob-mm-pip {
  width: calc(var(--u) * 0.44);
  height: calc(var(--u) * 0.44);
  background: var(--danger);
  transform: rotate(45deg);
}
.ob-mm-badge .n { font-size: calc(var(--u) * 1.15); line-height: 1; }
.ob-mm-bar {
  display: flex;
  align-items: center;
  height: calc(var(--u) * 1.9);
  margin-top: calc(var(--u) * 0.45);
  padding: 0 calc(var(--u) * 0.6);
  background: var(--panel-deep);
  border: 1px solid var(--line);
  border-left: calc(var(--u) * 0.24) solid var(--accent-soft);
  box-shadow: var(--inner), var(--shade);
  backdrop-filter: var(--blur);
  -webkit-backdrop-filter: var(--blur);
}
.ob-mm-place {
  flex: 1 1 auto;
  min-width: 0;
  font-family: var(--f-cond);
  font-size: var(--t-small);
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ---- compass ----------------------------------------------------------- */
/* Tall enough for three bands: marker labels, marker glyphs and cardinals over
   the tick rule. Sized off --u rather than a fraction of itself so the canvas
   geometry below can stay in the same units. */
.ob-cmp {
  width: min(44vw, calc(var(--u) * 50));
  height: calc(var(--u) * 4.8);
}
.ob-cmp-inner {
  position: relative;
  width: 100%;
  height: 100%;
  -webkit-mask-image: linear-gradient(90deg, transparent, #000 9%, #000 91%, transparent);
  mask-image: linear-gradient(90deg, transparent, #000 9%, #000 91%, transparent);
}
.ob-cmp-inner canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
}
.ob-cmp-needle {
  position: absolute;
  left: 50%;
  bottom: 0;
  width: 0;
  height: 0;
  transform: translateX(-50%);
  border-left: calc(var(--u) * 0.42) solid transparent;
  border-right: calc(var(--u) * 0.42) solid transparent;
  border-bottom: calc(var(--u) * 0.5) solid var(--accent);
  filter: drop-shadow(0 0 calc(var(--u) * 0.4) rgba(216, 255, 74, 0.6));
}
.ob-cmp-heading {
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  margin-top: calc(var(--u) * 0.2);
  padding: calc(var(--u) * 0.08) calc(var(--u) * 0.5);
  font-family: var(--f-mono);
  font-size: var(--t-small);
  font-weight: 600;
  letter-spacing: 0.14em;
  color: var(--accent);
  background: rgba(6, 9, 12, 0.72);
  border: 1px solid var(--line);
  box-shadow: var(--inner);
}

/* ---- killfeed ---------------------------------------------------------- */
.ob-kf {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: calc(var(--u) * 0.34);
  width: calc(var(--u) * 34);
}
.ob-kf-row {
  display: flex;
  align-items: center;
  gap: calc(var(--u) * 0.55);
  max-width: 100%;
  padding: calc(var(--u) * 0.28) calc(var(--u) * 0.6);
  background: rgba(8, 11, 14, 0.42);
  border: 1px solid var(--line);
  border-left: calc(var(--u) * 0.18) solid var(--danger);
  box-shadow: var(--inner);
  backdrop-filter: var(--blur);
  -webkit-backdrop-filter: var(--blur);
  animation: ob-kf-in 0.26s var(--ease-slam) both;
}
.ob-kf-row.out { animation: ob-kf-out 0.4s var(--ease) both; }
.ob-kf-row.local {
  border-left-color: var(--accent);
  background: rgba(24, 32, 10, 0.5);
}
.ob-kf-row.victim { border-left-color: var(--warn); }
@keyframes ob-kf-in {
  from { opacity: 0; transform: translateX(calc(var(--u) * 1.6)); }
  to { opacity: 1; transform: none; }
}
@keyframes ob-kf-out {
  from { opacity: 1; transform: none; }
  to { opacity: 0; transform: translateX(calc(var(--u) * 0.9)) scale(0.97); }
}
.ob-kf-name {
  font-family: var(--f-cond);
  font-size: var(--t-small);
  font-weight: 600;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ob-kf-row.local .ob-kf-you { color: var(--accent); }
.ob-kf-victim { color: rgba(232, 237, 242, 0.72); }
.ob-kf-icon {
  display: flex;
  align-items: center;
  flex: 0 0 auto;
}
.ob-kf-icon svg {
  width: calc(var(--u) * 3.1);
  height: calc(var(--u) * 1.15);
  display: block;
}
.ob-kf-icon svg path { fill: rgba(232, 237, 242, 0.88); }
.ob-kf-row.local .ob-kf-icon svg path { fill: var(--accent); }
.ob-kf-hs {
  width: calc(var(--u) * 1.15);
  height: calc(var(--u) * 1.15);
  flex: 0 0 auto;
}
.ob-kf-hs svg { width: 100%; height: 100%; display: block; }
.ob-kf-hs svg path { fill: var(--warn); }

/* ---- ammo -------------------------------------------------------------- */
.ob-ammo {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: calc(var(--u) * 0.3);
  min-width: calc(var(--u) * 18);
  text-shadow: 0 1px calc(var(--u) * 0.25) rgba(0, 0, 0, 0.9);
}
/* The ammo count is deliberately unpanelled, which leaves it exposed over a
   sunlit wall; a corner scrim buys the contrast back without boxing it in. */
.ob-ammo::before {
  content: '';
  position: absolute;
  inset: calc(var(--u) * -2) calc(var(--u) * -2.6) calc(var(--u) * -2.2) calc(var(--u) * -3);
  z-index: -1;
  background: radial-gradient(120% 130% at 92% 78%, rgba(4, 6, 8, 0.62) 0%, rgba(4, 6, 8, 0) 74%);
  pointer-events: none;
}
.ob-ammo.empty { animation: ob-shake 0.34s var(--ease) 1; }
@keyframes ob-shake {
  0% { transform: translate3d(0, 0, 0); }
  22% { transform: translate3d(calc(var(--u) * -0.35), calc(var(--u) * 0.16), 0); }
  48% { transform: translate3d(calc(var(--u) * 0.3), calc(var(--u) * -0.12), 0); }
  72% { transform: translate3d(calc(var(--u) * -0.16), 0, 0); }
  100% { transform: translate3d(0, 0, 0); }
}
.ob-ammo-head {
  display: flex;
  align-items: baseline;
  gap: calc(var(--u) * 0.7);
}
.ob-ammo-name {
  font-family: var(--f-cond);
  font-size: var(--t-body);
  font-weight: 600;
  letter-spacing: 0.13em;
  text-transform: uppercase;
}
.ob-ammo-mode {
  font-family: var(--f-mono);
  font-size: var(--t-micro);
  letter-spacing: 0.18em;
  color: var(--accent);
  padding: 0 calc(var(--u) * 0.3);
  border: 1px solid var(--accent-faint);
}
.ob-ammo-main {
  position: relative;
  display: flex;
  align-items: baseline;
  gap: calc(var(--u) * 0.35);
  padding-right: calc(var(--u) * 0.1);
}
.ob-ammo-mag {
  font-size: calc(var(--u) * 5);
  line-height: 0.86;
  font-weight: 700;
  text-shadow: 0 calc(var(--u) * 0.1) calc(var(--u) * 0.9) rgba(0, 0, 0, 0.7);
  transition: color 0.12s linear;
}
.ob-ammo.low .ob-ammo-mag { color: var(--warn); }
.ob-ammo.dry .ob-ammo-mag { color: var(--danger); }
.ob-ammo-sep {
  font-family: var(--f-cond);
  font-size: calc(var(--u) * 2);
  color: var(--faint);
  transform: translateY(calc(var(--u) * -0.2));
}
.ob-ammo-res {
  font-size: calc(var(--u) * 2.1);
  color: var(--dim);
  transform: translateY(calc(var(--u) * -0.14));
}
/* In the gutter to the left of the numerals rather than wrapped around them.
   Wrapped, it has to be wider than the widest count, and a belt-fed hundred is
   wider than anything that fits the corner — so it either clipped off the right
   of the screen or drew straight through the digits. Out here it is the same
   size whatever the weapon, and there is nothing to its left to collide with. */
.ob-ammo-arc {
  position: absolute;
  right: calc(100% + var(--u) * 1);
  top: 50%;
  width: calc(var(--u) * 4.4);
  height: calc(var(--u) * 4.4);
  transform: translateY(-50%) rotate(-90deg);
  opacity: 0;
  transition: opacity 0.14s linear;
  pointer-events: none;
}
.ob-ammo.reloading .ob-ammo-arc { opacity: 1; }
.ob-ammo-arc circle {
  fill: none;
  stroke-linecap: round;
  transform-origin: 50% 50%;
}
/* Heavier than a ring this size would normally take: at 4.4 units across, a
   2-unit stroke in a 100-unit viewBox lands on one physical pixel at 720p. */
.ob-ammo-arc .track { stroke: rgba(255, 255, 255, 0.14); stroke-width: 4; }
.ob-ammo-arc .fill {
  stroke: var(--accent);
  stroke-width: 5.5;
  filter: drop-shadow(0 0 calc(var(--u) * 0.18) rgba(216, 255, 74, 0.5));
}
/* The strip is given a fixed width and the pips share it, so a 7-round magazine
   and a 30-round one occupy the same space and a glance reads the proportion
   rather than the count. Gap is a third of the pitch, which is the least that
   still resolves as separate marks at 720p. */
.ob-ammo-pips {
  display: flex;
  gap: calc(var(--u) * 0.22);
  width: calc(var(--u) * 18);
  height: calc(var(--u) * 0.6);
  margin-top: calc(var(--u) * 0.26);
}
.ob-ammo-pip {
  flex: 1 1 0;
  min-width: 1px;
  height: 100%;
  /* Held under the numeral. A thirty-pip strip is a long line and it is the
     widest mark in the corner, so at full accent it out-shouts the count it is
     there to qualify — and a full magazine is the state that least needs the
     player's attention. The warning state below takes the strip back to full. */
  background: rgba(216, 255, 74, 0.52);
  transition: opacity 0.1s linear, background-color 0.1s linear;
}
.ob-ammo-pip.spent { background: rgba(255, 255, 255, 0.14); }
.ob-ammo.low .ob-ammo-pip:not(.spent) { background: var(--warn); }
.ob-ammo.dry .ob-ammo-pip { background: rgba(255, 255, 255, 0.14); }
.ob-ammo-foot {
  display: flex;
  align-items: center;
  gap: calc(var(--u) * 0.9);
  margin-top: calc(var(--u) * 0.3);
}
/* Brighter than the shared label tone: this row is the only unpanelled text in
   the HUD, so it has to hold up against a sunlit wall behind it. */
.ob-ammo-foot .lbl { color: rgba(226, 232, 240, 0.78); }
.ob-ammo-nade {
  display: flex;
  align-items: center;
  gap: calc(var(--u) * 0.42);
}
.ob-ammo-nade svg {
  width: calc(var(--u) * 1.15);
  height: calc(var(--u) * 1.4);
  display: block;
}
.ob-ammo-nade svg path { fill: rgba(226, 232, 240, 0.78); }

/* ---- vitals ------------------------------------------------------------ */
/* Panelled and edge-coded rather than bare text: it is the readout the player
   checks under pressure, so it has to be findable without being read. */
.ob-vit {
  width: calc(var(--u) * 22);
  padding: calc(var(--u) * 0.55) calc(var(--u) * 0.8) calc(var(--u) * 0.7);
  background: var(--panel-deep);
  border: 1px solid var(--line);
  border-left: calc(var(--u) * 0.24) solid var(--accent);
  box-shadow: var(--inner), var(--shade);
  backdrop-filter: var(--blur);
  -webkit-backdrop-filter: var(--blur);
  transition: border-color 0.2s linear;
}
.ob-vit.hurt { border-left-color: var(--warn); }
.ob-vit.critical { border-left-color: var(--danger); }
.ob-vit-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--gap);
  padding-bottom: calc(var(--u) * 0.42);
  margin-bottom: calc(var(--u) * 0.42);
  border-bottom: 1px solid var(--line);
}
.ob-vit-state { color: var(--txt); letter-spacing: 0.16em; }
/* Number, regen glyph and bar on one baseline: the number answers "how much",
   the bar answers "how many more hits", and they are read as one instrument. */
.ob-vit-body {
  display: flex;
  align-items: flex-end;
  gap: calc(var(--u) * 0.55);
}
.ob-vit-num {
  font-size: calc(var(--u) * 3.4);
  font-weight: 700;
  line-height: 0.78;
  min-width: calc(var(--u) * 5);
  transition: color 0.15s linear;
}
.ob-vit.hurt .ob-vit-num { color: var(--warn); }
.ob-vit.critical .ob-vit-num { color: var(--danger); }
.ob-vit-regen {
  flex: 0 0 auto;
  width: calc(var(--u) * 0.9);
  font-family: var(--f-cond);
  font-size: calc(var(--u) * 1.7);
  font-weight: 700;
  line-height: 0.8;
  color: var(--accent);
  opacity: 0;
  transition: opacity 0.2s linear;
}
.ob-vit.regen .ob-vit-regen { opacity: 1; animation: ob-crit 1.4s var(--ease) infinite; }
.ob-vit-segs {
  flex: 1 1 auto;
  display: flex;
  gap: calc(var(--u) * 0.2);
  height: calc(var(--u) * 0.62);
  transform: translateY(calc(var(--u) * -0.16));
}
.ob-vit-seg {
  flex: 1 1 0;
  background: var(--accent);
  box-shadow: 0 0 calc(var(--u) * 0.3) rgba(216, 255, 74, 0.35);
  transition: background-color 0.16s linear, opacity 0.16s linear;
}
.ob-vit-seg.spent { background: rgba(255, 255, 255, 0.13); box-shadow: none; }
.ob-vit.hurt .ob-vit-seg:not(.spent) { background: var(--warn); box-shadow: none; }
.ob-vit.critical .ob-vit-seg:not(.spent) {
  background: var(--danger);
  animation: ob-crit 0.9s var(--ease) infinite;
}
@keyframes ob-crit {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.45; }
}

/* ---- score / streak ---------------------------------------------------- */
.ob-stk {
  display: flex;
  flex-direction: column;
  gap: calc(var(--u) * 0.5);
  width: calc(var(--u) * 22);
}
/* Score line and streak progress are one instrument, divided by a rule rather
   than by a gap: they are read together and two floating boxes read as clutter. */
.ob-stk-panel {
  background: var(--panel-deep);
  border: 1px solid var(--line);
  border-left: calc(var(--u) * 0.24) solid var(--accent-soft);
  box-shadow: var(--inner), var(--shade);
  backdrop-filter: var(--blur);
  -webkit-backdrop-filter: var(--blur);
  overflow: hidden;
}
.ob-stk-score {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: calc(var(--u) * 0.6);
  padding: calc(var(--u) * 0.45) calc(var(--u) * 0.7);
  border-bottom: 1px solid var(--line);
}
.ob-stk-cell {
  display: flex;
  flex-direction: column;
  gap: calc(var(--u) * 0.1);
}
.ob-stk-cell:not(:first-child) { align-items: flex-end; }
.ob-stk-cell .lbl { font-size: calc(var(--u) * 0.8); letter-spacing: 0.16em; }
.ob-stk-cell .n { font-size: calc(var(--u) * 1.6); line-height: 0.9; }
.ob-stk-cell:first-child .n { font-size: calc(var(--u) * 1.9); color: var(--accent); }
.ob-stk-next {
  position: relative;
  display: flex;
  align-items: center;
  gap: calc(var(--u) * 0.6);
  padding: calc(var(--u) * 0.5) calc(var(--u) * 0.7) calc(var(--u) * 0.62);
  overflow: hidden;
}
.ob-stk-next svg { width: calc(var(--u) * 2.1); height: calc(var(--u) * 2.1); display: block; }
.ob-stk-next svg [stroke] { stroke: var(--accent); }
.ob-stk-next svg [fill]:not([fill='none']) { fill: var(--accent); }
.ob-stk-next-text { display: flex; flex-direction: column; gap: calc(var(--u) * 0.14); }
.ob-stk-name {
  font-family: var(--f-cond);
  font-size: var(--t-small);
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}
.ob-stk-sub { font-family: var(--f-mono); font-size: var(--t-micro); letter-spacing: 0.12em; color: var(--dim); }
.ob-stk-bar {
  position: absolute;
  left: 0;
  bottom: 0;
  height: calc(var(--u) * 0.16);
  width: 100%;
  background: rgba(255, 255, 255, 0.08);
}
.ob-stk-bar i {
  display: block;
  height: 100%;
  width: 100%;
  background: var(--accent);
  transform-origin: 0 50%;
  transform: scaleX(var(--p, 0));
  transition: transform 0.3s var(--ease);
}
.ob-stk-tray { display: flex; gap: calc(var(--u) * 0.4); }
.ob-stk-slot {
  position: relative;
  width: calc(var(--u) * 3.4);
  height: calc(var(--u) * 3.4);
  display: grid;
  place-items: center;
  /* Bottom padding is the height of the hotkey chip. The glyph then centres in
     what is left rather than under the chip, which was cutting the corner off
     every silhouette that used its full 24-unit box. */
  padding: calc(var(--u) * 0.3) calc(var(--u) * 0.3) calc(var(--u) * 1.1);
  background: var(--panel);
  border: 1px solid var(--line);
  box-shadow: var(--inner);
  backdrop-filter: var(--blur);
  -webkit-backdrop-filter: var(--blur);
}
.ob-stk-slot svg { width: 100%; height: 100%; }
.ob-stk-slot svg [stroke] { stroke: var(--txt); }
.ob-stk-slot svg [fill]:not([fill='none']) { fill: var(--txt); }
.ob-stk-slot.ready { border-color: var(--accent-soft); }
.ob-stk-slot.ready svg [stroke] { stroke: var(--accent); }
.ob-stk-slot.ready svg [fill]:not([fill='none']) { fill: var(--accent); }
.ob-stk-slot.fresh { animation: ob-pulse 1.1s var(--ease) infinite; }
@keyframes ob-pulse {
  0%, 100% { box-shadow: var(--inner), 0 0 0 0 rgba(216, 255, 74, 0.4); }
  50% { box-shadow: var(--inner), 0 0 0 calc(var(--u) * 0.4) rgba(216, 255, 74, 0); }
}
/* A chip rather than loose text in the corner: the hotkey is the one thing on
   the tile a player has to read, and a dim glyph over a busy tile is not read. */
.ob-stk-key {
  position: absolute;
  right: 0;
  bottom: 0;
  min-width: calc(var(--u) * 1.15);
  padding: 0 calc(var(--u) * 0.2);
  text-align: center;
  font-family: var(--f-mono);
  font-size: calc(var(--u) * 0.82);
  line-height: calc(var(--u) * 1.15);
  color: var(--txt);
  background: rgba(6, 8, 11, 0.82);
  border-top: 1px solid var(--line);
  border-left: 1px solid var(--line);
}
.ob-stk-slot.ready .ob-stk-key { color: var(--accent); }

/* ---- killstreak selection --------------------------------------------- */
/* Low and centred. This opens with the targeting tablet, whose own aim point and
   grid symbology own the middle of the screen; a row of cards across the centre
   sits exactly where the player is trying to paint. The bottom band is free
   while the tablet is up, because the HUD stands down for it. */
.ob-ksel {
  left: 50%;
  top: auto;
  bottom: 11%;
  transform: translate(-50%, 0) scale(0.94);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: calc(var(--u) * 0.7);
  padding: var(--gap);
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.18s var(--ease), transform 0.18s var(--ease), visibility 0.18s;
}
.ob-ksel.open { opacity: 1; visibility: visible; transform: translate(-50%, 0) scale(1); }
/* A caption, so the row reads as one instrument rather than as loose tiles that
   happen to have landed in the middle of the screen. */
.ob-ksel-head {
  padding: calc(var(--u) * 0.14) calc(var(--u) * 0.7);
  font-family: var(--f-mono);
  font-size: var(--t-micro);
  letter-spacing: 0.32em;
  /* Optical centring: the tracking leaves a gap after the last letter that the
     cards below it do not have. */
  text-indent: 0.32em;
  text-transform: uppercase;
  color: var(--accent);
  /* Chipped like the compass heading rather than left as bare text. It lands
     mid-screen over whatever the player happens to be looking at, and a shadow
     alone does not hold a 0.32em mono caption against a sunlit wall. */
  background: rgba(6, 9, 12, 0.82);
  border: 1px solid var(--line);
  box-shadow: var(--inner);
}
.ob-ksel-row { display: flex; gap: var(--gap); }
.ob-ksel-card {
  width: calc(var(--u) * 12);
  padding: var(--gap);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: calc(var(--u) * 0.5);
  background: var(--panel-deep);
  border: 1px solid var(--line);
  box-shadow: var(--inner), var(--shade);
  backdrop-filter: var(--blur);
  -webkit-backdrop-filter: var(--blur);
}
/* Still a message the player has to read, so dimmed rather than nearly gone. */
.ob-ksel-card.locked { width: calc(var(--u) * 18); opacity: 0.72; }
.ob-ksel-card svg { width: calc(var(--u) * 3.4); height: calc(var(--u) * 3.4); }
.ob-ksel-card svg [stroke] { stroke: var(--accent); }
.ob-ksel-card svg [fill]:not([fill='none']) { fill: var(--accent); }
.ob-ksel-card.locked svg [stroke] { stroke: var(--dim); }
.ob-ksel-card.locked svg [fill]:not([fill='none']) { fill: var(--dim); }

/* ---- announcements & toasts ------------------------------------------- */
.ob-ann {
  left: 50%;
  top: 26%;
  width: min(80vw, calc(var(--u) * 62));
  transform: translateX(-50%);
  text-align: center;
  opacity: 0;
  visibility: hidden;
}
/* A soft scrim, not a panel. The callout lands over whatever the player happens
   to be looking at — most often the sky, which is exactly where unbacked text
   at this size disappears. A vertical ramp masked at both ends fades out on all
   four sides, where a radial gradient reads as a smudge over a flat sky. */
.ob-ann::before {
  content: '';
  position: absolute;
  inset: calc(var(--u) * -2.2) calc(var(--u) * -6);
  background: linear-gradient(
    180deg,
    rgba(3, 5, 7, 0) 0%,
    rgba(3, 5, 7, 0.6) 30%,
    rgba(3, 5, 7, 0.6) 70%,
    rgba(3, 5, 7, 0) 100%
  );
  -webkit-mask-image: linear-gradient(90deg, transparent, #000 26%, #000 74%, transparent);
  mask-image: linear-gradient(90deg, transparent, #000 26%, #000 74%, transparent);
  pointer-events: none;
}
.ob-ann.show { visibility: visible; animation: ob-ann-in 0.42s var(--ease-slam) forwards; }
.ob-ann.hide { visibility: visible; animation: ob-ann-out 0.34s var(--ease) forwards; }
@keyframes ob-ann-in {
  0% { opacity: 0; transform: translateX(-50%) scale(1.16); }
  55% { opacity: 1; }
  100% { opacity: 1; transform: translateX(-50%) scale(1); }
}
@keyframes ob-ann-out {
  from { opacity: 1; transform: translateX(-50%) scale(1); }
  to { opacity: 0; transform: translateX(-50%) scale(0.985); }
}
.ob-ann-main {
  position: relative;
  font-family: var(--f-cond);
  font-weight: 700;
  font-size: var(--t-big);
  line-height: 1;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  text-shadow: 0 calc(var(--u) * 0.2) calc(var(--u) * 1.6) rgba(0, 0, 0, 0.85);
}
.ob-ann.show .ob-ann-main { animation: ob-ann-track 0.85s var(--ease) forwards; }
@keyframes ob-ann-track {
  from { letter-spacing: 0.42em; }
  to { letter-spacing: 0.14em; }
}
.ob-ann-rule {
  height: 1px;
  margin: calc(var(--u) * 0.6) auto calc(var(--u) * 0.5);
  width: 62%;
  background: linear-gradient(90deg, transparent, var(--accent-soft) 22%, var(--accent) 50%, var(--accent-soft) 78%, transparent);
  transform: scaleX(0);
  transform-origin: 50% 50%;
}
.ob-ann.show .ob-ann-rule { animation: ob-rule 0.6s 0.06s var(--ease) forwards; }
@keyframes ob-rule { to { transform: scaleX(1); } }
.ob-ann-sub {
  position: relative;
  font-family: var(--f-mono);
  font-size: var(--t-small);
  letter-spacing: 0.3em;
  text-transform: uppercase;
  color: var(--txt);
  /* Sits over whatever the world happens to be: a sky, a wall, a muzzle flash.
     The shadow is what keeps it readable over all three. */
  text-shadow: 0 calc(var(--u) * 0.12) calc(var(--u) * 0.9) rgba(0, 0, 0, 0.95);
}
.ob-ann-sub.empty { display: none; }
/* The sweep travels a full banner-width past its own box, so it has to be
   clipped: parked at the end of the animation it is otherwise a pale band
   hanging off the right of the screen, visible even under a scope blackout. */
.ob-ann-sweep {
  position: absolute;
  inset: calc(var(--u) * -1) 0;
  overflow: hidden;
  pointer-events: none;
}
.ob-ann-sweep::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(
    100deg,
    transparent 42%,
    rgba(255, 255, 255, 0.14) 50%,
    transparent 58%
  );
  transform: translateX(-120%);
}
.ob-ann.show .ob-ann-sweep::after { animation: ob-sweep 0.9s 0.1s var(--ease) forwards; }
@keyframes ob-sweep { to { transform: translateX(120%); } }
.ob-ann.warn .ob-ann-main { color: #ffe4a0; }
.ob-ann.warn .ob-ann-rule {
  background: linear-gradient(90deg, transparent, rgba(255, 176, 32, 0.5) 22%, var(--warn) 50%, rgba(255, 176, 32, 0.5) 78%, transparent);
}

/* Top of the bottom-left column, so the stack grows away from the persistent
   readouts instead of floating unanchored in the middle of the frame. */
.ob-toasts {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: calc(var(--u) * 0.34);
  width: calc(var(--u) * 22);
  margin-bottom: calc(var(--u) * 0.3);
}
.ob-toast {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: calc(var(--u) * 0.1);
  padding: calc(var(--u) * 0.42) calc(var(--u) * 0.62);
  background: var(--panel-deep);
  border: 1px solid var(--line);
  border-left: calc(var(--u) * 0.24) solid var(--line-strong);
  box-shadow: var(--inner), var(--shade);
  backdrop-filter: var(--blur);
  -webkit-backdrop-filter: var(--blur);
  animation: ob-toast-in 0.24s var(--ease-slam) both;
}
.ob-toast.out { animation: ob-toast-out 0.32s var(--ease) both; }
@keyframes ob-toast-in {
  from { opacity: 0; transform: translateX(calc(var(--u) * -1.2)); }
  to { opacity: 1; transform: none; }
}
@keyframes ob-toast-out {
  from { opacity: 1; transform: none; }
  to { opacity: 0; transform: translateX(calc(var(--u) * -0.7)); }
}
.ob-toast.warn { border-left-color: var(--warn); }
.ob-toast.reward { border-left-color: var(--accent); }
.ob-toast-main {
  font-family: var(--f-cond);
  font-size: var(--t-small);
  font-weight: 600;
  letter-spacing: 0.13em;
  text-transform: uppercase;
}
.ob-toast.reward .ob-toast-main { color: var(--accent); }
.ob-toast-sub { font-family: var(--f-mono); font-size: var(--t-micro); letter-spacing: 0.1em; color: var(--dim); }

/* ---- world markers ---------------------------------------------------- */
.ob-markers { inset: 0; }
.ob-marker {
  position: absolute;
  top: 0;
  left: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: calc(var(--u) * 0.2);
  will-change: transform;
  transition: opacity 0.2s linear;
}
.ob-marker-glyph {
  position: relative;
  width: calc(var(--u) * 1.5);
  height: calc(var(--u) * 1.5);
  border: 1px solid var(--accent);
  transform: rotate(45deg);
  box-shadow: 0 0 calc(var(--u) * 0.7) rgba(216, 255, 74, 0.35), var(--inner);
}
.ob-marker-glyph::after {
  content: '';
  position: absolute;
  inset: calc(var(--u) * 0.32);
  background: var(--accent);
}
.ob-marker.streak .ob-marker-glyph { border-color: var(--warn); }
.ob-marker.streak .ob-marker-glyph::after { background: var(--warn); }
/* A UAV contact. Red, and no caption: the drone paints up to four at once, and
   four labels reading HOSTILE across the middle of the screen is a wall of text
   where a red diamond and a range already say the whole thing. */
.ob-marker.hostile .ob-marker-glyph { border-color: var(--danger); }
.ob-marker.hostile .ob-marker-glyph::after { background: var(--danger); }
.ob-marker.hostile .ob-marker-arrow svg path { fill: var(--danger); }
.ob-marker.hostile .ob-marker-label { display: none; }
/* Off screen the arrow is the marker. It is drawn centred on the diamond, so
   leaving both up stacks a solid chevron on an outlined square and the pair
   reads as neither — the diamond is taken out of sight rather than out of the
   layout, which would drag the arrow down onto the caption. */
.ob-marker.offscreen .ob-marker-glyph { border-color: transparent; box-shadow: none; }
.ob-marker.offscreen .ob-marker-glyph::after { opacity: 0; }
.ob-marker.offscreen .ob-marker-label { opacity: 0.85; }
.ob-marker-arrow {
  position: absolute;
  left: 50%;
  top: 50%;
  width: calc(var(--u) * 3.4);
  height: calc(var(--u) * 3.4);
  margin: calc(var(--u) * -1.7) 0 0 calc(var(--u) * -1.7);
  opacity: 0;
}
.ob-marker.offscreen .ob-marker-arrow { opacity: 1; }
.ob-marker-arrow svg { width: 100%; height: 100%; }
.ob-marker-arrow svg path { fill: var(--accent); }
.ob-marker.streak .ob-marker-arrow svg path { fill: var(--warn); }
/* Rimmed rather than drop-shadowed: a marker can land on a white wall as easily
   as on the ground, and a shadow only defends one side. */
.ob-marker-label {
  font-family: var(--f-cond);
  font-size: calc(var(--u) * 1.08);
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  white-space: nowrap;
  text-shadow:
    0 0 calc(var(--u) * 0.16) #000,
    0 0 calc(var(--u) * 0.34) rgba(0, 0, 0, 0.95),
    0 1px calc(var(--u) * 0.2) #000;
}
/* Neutral whatever the marker is, because the glyph above it already carries the
   colour. A range in danger red over a sunlit wall is a rimmed dark-on-light
   string at ten pixels, which is the one thing on the marker that has to be read
   rather than recognised. */
.ob-marker-dist {
  font-family: var(--f-mono);
  font-size: calc(var(--u) * 0.92);
  letter-spacing: 0.1em;
  color: var(--txt);
  text-shadow:
    0 0 calc(var(--u) * 0.16) #000,
    0 0 calc(var(--u) * 0.34) rgba(0, 0, 0, 0.95),
    0 1px calc(var(--u) * 0.2) #000;
}

/* ---- scope ------------------------------------------------------------
   Sized entirely from --r, the aperture radius the weapons module derives from
   the optic's magnification, so the mask can only ever sit just outside the
   modelled tube rather than cutting into the sight picture. */
.ob-scope {
  --r: 30vh;
  inset: 0;
  opacity: 0;
  visibility: hidden;
}
.ob-scope.live { visibility: visible; }
.ob-scope > * {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
/* Default surround: the ocular bell shading the frame around a prism sight,
   which leaves the rifle and the world in shot. */
.ob-scope-mask {
  background: radial-gradient(
    circle at 50% 50%,
    transparent calc(var(--r) * 1.015),
    rgba(4, 5, 7, 0.34) calc(var(--r) * 1.55),
    rgba(2, 3, 4, 0.66) 100%
  );
}
/* Above 3x the optic owns the frame. Cross-faded rather than swapped so the
   surround does not snap shut halfway through the ADS ramp. */
.ob-scope-mask::after {
  content: '';
  position: absolute;
  inset: 0;
  opacity: 0;
  transition: opacity 0.22s linear;
  background: radial-gradient(
    circle at 50% 50%,
    transparent calc(var(--r) * 1.015),
    rgba(0, 0, 0, 0.94) calc(var(--r) * 1.06),
    #000 calc(var(--r) * 1.17)
  );
}
.ob-scope-mask.blackout::after { opacity: 1; }
/* Lens roll-off inside the glass: real ocular groups lose light at the edge. */
.ob-scope-vig::after {
  content: '';
  position: absolute;
  inset: 0;
  opacity: 0;
  transition: opacity 0.22s linear;
  background: radial-gradient(
    circle at 50% 50%,
    rgba(0, 0, 0, 0) 34%,
    rgba(0, 0, 0, 0.16) calc(var(--r) * 0.86),
    rgba(0, 0, 0, 0.46) calc(var(--r) * 0.995),
    rgba(0, 0, 0, 0) calc(var(--r) * 1.02)
  );
}
.ob-scope-vig.dimmed::after { opacity: 1; }
/* A thermal sight is a rectangular sensor read out on a screen, so none of the
   round-tube treatment applies to it: no ocular vignette, no chromatic rim, and
   no circular surround, which over a full-frame sensor reads as a smudge rather
   than as a mask. The canvas draws the sensor bezel over the top. */
.ob-scope[data-kind='thermal'] .ob-scope-lens,
.ob-scope[data-kind='thermal'] .ob-scope-vig { display: none; }
.ob-scope[data-kind='thermal'] .ob-scope-mask { background: none; }
/* The white-hot grade, and the one place the UI reaches through to the rendered
   frame. Only under the grade class, which the HUD clears whenever the module driving
   the sight is already compositing a graded frame below the UI root — in the
   shipped game that is the door gunner, and doing this over the top of its crush
   would be a second full-screen backdrop pass that changes nothing on screen.
   A thermal image is not a grey picture, it is a picture with the midtones taken
   out of it, so the contrast lift matters more than the desaturation. */
.ob-scope[data-kind='thermal'].grade .ob-scope-mask {
  backdrop-filter: grayscale(1) contrast(1.5) brightness(1.04);
  -webkit-backdrop-filter: grayscale(1) contrast(1.5) brightness(1.04);
}
/* Sensor readout artefacts, painted rather than filtered: a scanline comb and a
   corner falloff. Both are cheap, and both are what sells the picture as coming
   off a detector rather than out of a lens. */
.ob-scope[data-kind='thermal'].grade .ob-scope-mask::before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    repeating-linear-gradient(
      to bottom,
      rgba(0, 0, 0, 0.16) 0,
      rgba(0, 0, 0, 0.16) 1px,
      transparent 1px,
      transparent 3px
    ),
    radial-gradient(ellipse 62% 62% at 50% 50%, transparent 42%, rgba(0, 0, 0, 0.5) 100%);
}
/* Chromatic fringe exactly at the rim, cool outside and warm inside. A real
   ocular fringes over two or three pixels, so the band is kept narrow and faint
   — widen it and the tube reads as a rainbow halo rather than as glass. */
.ob-scope-lens {
  background: radial-gradient(
    circle at 50% 50%,
    transparent calc(var(--r) * 0.976),
    rgba(96, 176, 255, 0.16) calc(var(--r) * 0.99),
    rgba(255, 112, 184, 0.13) calc(var(--r) * 1.003),
    transparent calc(var(--r) * 1.012)
  );
}
.ob-scope-marks {
  width: 100%;
  height: 100%;
  display: block;
}
/* Below the tube, in the surround. Inside the glass it competes with the sight
   picture, which is the one thing the overlay must not do.
   Only on the tube. On a 2.6x prism the surround is a thin shadow ring, so this
   would land on the modelled housing rather than clear of it, and the sensor
   sights are not aimed from the eye position the rangefinder casts from. */
.ob-scope-read {
  inset: auto auto auto 50%;
  top: 50%;
  transform: translate(-50%, calc(var(--r) * 1.08));
  display: none;
  gap: calc(var(--u) * 2.2);
  font-family: var(--f-mono);
  font-size: var(--t-small);
  letter-spacing: 0.2em;
  color: rgba(226, 232, 240, 0.8);
  text-shadow: 0 1px 3px #000;
}
.ob-scope[data-kind='sniper'] .ob-scope-read {
  display: flex;
  color: rgba(216, 255, 74, 0.7);
}

/* ---- debug readout ---------------------------------------------------- */
.ob-debug {
  bottom: var(--edge);
  left: 50%;
  transform: translateX(-50%);
  display: none;
  gap: calc(var(--u) * 1.2);
  padding: calc(var(--u) * 0.4) calc(var(--u) * 0.8);
  font-family: var(--f-mono);
  font-size: var(--t-micro);
  letter-spacing: 0.08em;
  color: rgba(226, 232, 240, 0.8);
  background: rgba(6, 8, 11, 0.72);
  border: 1px solid var(--line);
  white-space: pre;
}
.ob-debug.show { display: flex; }
.ob-debug b { color: var(--accent); font-weight: 400; }

/* ======================================================================== */
/* Menus                                                                     */
/* ======================================================================== */

.ob-menu {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  background: radial-gradient(120% 90% at 50% 0%, rgba(9, 13, 17, 0.72), rgba(3, 4, 6, 0.9));
  backdrop-filter: blur(calc(var(--u) * 1.1)) saturate(0.85) brightness(0.72);
  -webkit-backdrop-filter: blur(calc(var(--u) * 1.1)) saturate(0.85) brightness(0.72);
  transition: opacity 0.24s var(--ease), visibility 0.24s;
  cursor: default;
}
.ob-menu.open { opacity: 1; visibility: visible; pointer-events: auto; }
.ob-menu::after {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background-image: repeating-linear-gradient(
    0deg,
    rgba(255, 255, 255, 0.022) 0 1px,
    transparent 1px 3px
  );
}
.ob-menu-body {
  position: relative;
  transform: translateY(calc(var(--u) * 1.2));
  transition: transform 0.28s var(--ease);
  max-height: 92vh;
  display: flex;
  flex-direction: column;
}
.ob-menu.open .ob-menu-body { transform: none; }

.ob-title {
  font-family: var(--f-cond);
  font-weight: 700;
  font-size: clamp(34px, 7vw, 92px);
  line-height: 0.95;
  letter-spacing: 0.13em;
  margin: 0;
  text-transform: uppercase;
  background: linear-gradient(180deg, #ffffff 0%, #8e9aa6 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  filter: drop-shadow(0 6px 30px rgba(0, 0, 0, 0.8));
}
.ob-sub {
  font-family: var(--f-mono);
  font-size: var(--t-small);
  letter-spacing: 0.42em;
  text-transform: uppercase;
  color: var(--dim);
  margin-top: calc(var(--u) * -0.4);
  padding-left: 0.42em;
}
.ob-h2 {
  font-family: var(--f-cond);
  font-weight: 700;
  font-size: var(--t-head);
  letter-spacing: 0.2em;
  text-transform: uppercase;
  margin: 0;
}
.ob-hr {
  height: 1px;
  background: linear-gradient(90deg, var(--accent-soft), rgba(255, 255, 255, 0.06) 70%, transparent);
  margin: var(--gap) 0;
}

.ob-card {
  position: relative;
  padding: calc(var(--u) * 2.2);
  background: rgba(9, 12, 16, 0.72);
  border: 1px solid var(--line);
  box-shadow: var(--inner), 0 calc(var(--u) * 1.4) calc(var(--u) * 4) rgba(0, 0, 0, 0.6);
  backdrop-filter: var(--blur);
  -webkit-backdrop-filter: var(--blur);
}

.ob-btn {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--gap);
  width: 100%;
  padding: calc(var(--u) * 0.85) calc(var(--u) * 1.1);
  font-family: var(--f-cond);
  font-size: var(--t-body);
  font-weight: 600;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  text-align: left;
  color: var(--txt);
  background: rgba(255, 255, 255, 0.028);
  border: 1px solid var(--line);
  cursor: pointer;
  transition: background-color 0.14s linear, color 0.14s linear, transform 0.14s var(--ease), border-color 0.14s linear;
}
.ob-btn::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: calc(var(--u) * 0.18);
  background: var(--accent);
  transform: scaleY(0);
  transform-origin: 50% 50%;
  transition: transform 0.16s var(--ease);
}
.ob-btn:hover,
.ob-btn:focus-visible {
  background: rgba(216, 255, 74, 0.1);
  border-color: var(--accent-soft);
  transform: translateX(calc(var(--u) * 0.24));
  outline: none;
}
.ob-btn:hover::before,
.ob-btn:focus-visible::before { transform: scaleY(1); }
.ob-btn > i {
  font-family: var(--f-mono);
  font-style: normal;
  font-size: var(--t-micro);
  letter-spacing: 0.16em;
  color: var(--dim);
}
/* Carries its emphasis in the fill, the size and the tracking rather than in
   its alignment: centring one item in a left-aligned stack breaks the column
   the other four buttons share. */
.ob-btn.primary {
  background: rgba(216, 255, 74, 0.14);
  border-color: var(--accent-soft);
  font-size: var(--t-head);
  letter-spacing: 0.26em;
  color: #f2ffcf;
}
.ob-btn.primary:hover { background: rgba(216, 255, 74, 0.22); }
.ob-btn.ghost { background: none; }

.ob-rows { display: flex; flex-direction: column; }
.ob-rows.two {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  column-gap: calc(var(--u) * 2.6);
}
.ob-rows.two .ob-row { grid-template-columns: 1fr auto; }
.ob-row {
  display: grid;
  grid-template-columns: 1fr minmax(calc(var(--u) * 16), calc(var(--u) * 22));
  align-items: center;
  gap: var(--gap);
  padding: calc(var(--u) * 0.62) calc(var(--u) * 0.2);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}
.ob-row:hover { background: rgba(255, 255, 255, 0.022); }
.ob-row-label {
  display: flex;
  flex-direction: column;
  gap: calc(var(--u) * 0.1);
}
.ob-row-name {
  font-family: var(--f-cond);
  font-size: var(--t-body);
  font-weight: 500;
  letter-spacing: 0.11em;
  text-transform: uppercase;
}
.ob-row-hint { font-family: var(--f-body); font-size: var(--t-micro); color: var(--dim); letter-spacing: 0.02em; }
.ob-row-ctl { display: flex; align-items: center; justify-content: flex-end; gap: calc(var(--u) * 0.5); }

.ob-seg { display: flex; border: 1px solid var(--line); }
.ob-seg button {
  flex: 1 1 0;
  padding: calc(var(--u) * 0.42) calc(var(--u) * 0.5);
  font-family: var(--f-mono);
  font-size: var(--t-micro);
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--dim);
  background: none;
  border: 0;
  cursor: pointer;
  transition: background-color 0.12s linear, color 0.12s linear;
}
.ob-seg button + button { border-left: 1px solid var(--line); }
.ob-seg button:hover { color: var(--txt); background: rgba(255, 255, 255, 0.05); }
.ob-seg button.on { color: #10140a; background: var(--accent); font-weight: 700; }

.ob-sw {
  position: relative;
  width: calc(var(--u) * 3.4);
  height: calc(var(--u) * 1.5);
  border: 1px solid var(--line);
  background: rgba(255, 255, 255, 0.05);
  cursor: pointer;
  padding: 0;
}
.ob-sw i {
  position: absolute;
  top: calc(var(--u) * 0.2);
  left: calc(var(--u) * 0.2);
  width: calc(var(--u) * 1.05);
  height: calc(var(--u) * 1.05);
  background: var(--dim);
  transition: transform 0.16s var(--ease), background-color 0.16s linear;
}
.ob-sw.on { border-color: var(--accent-soft); background: rgba(216, 255, 74, 0.13); }
.ob-sw.on i { transform: translateX(calc(var(--u) * 1.85)); background: var(--accent); }

.ob-sl { display: flex; align-items: center; gap: calc(var(--u) * 0.6); width: 100%; }
.ob-sl input[type='range'] {
  -webkit-appearance: none;
  appearance: none;
  flex: 1 1 auto;
  height: calc(var(--u) * 1.2);
  background: none;
  cursor: pointer;
}
.ob-sl input[type='range']::-webkit-slider-runnable-track {
  height: calc(var(--u) * 0.22);
  background: linear-gradient(
    90deg,
    var(--accent) 0 calc(var(--p, 0) * 100%),
    rgba(255, 255, 255, 0.14) calc(var(--p, 0) * 100%) 100%
  );
}
.ob-sl input[type='range']::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: calc(var(--u) * 0.42);
  height: calc(var(--u) * 1.2);
  margin-top: calc(var(--u) * -0.49);
  background: var(--txt);
  border: 0;
  box-shadow: 0 0 calc(var(--u) * 0.5) rgba(0, 0, 0, 0.6);
}
.ob-sl input[type='range']::-moz-range-track {
  height: calc(var(--u) * 0.22);
  background: rgba(255, 255, 255, 0.14);
}
.ob-sl input[type='range']::-moz-range-thumb {
  width: calc(var(--u) * 0.42);
  height: calc(var(--u) * 1.2);
  border: 0;
  border-radius: 0;
  background: var(--txt);
}
.ob-sl-val {
  font-family: var(--f-mono);
  font-size: var(--t-micro);
  letter-spacing: 0.1em;
  color: var(--accent);
  min-width: calc(var(--u) * 3.6);
  text-align: right;
}

.ob-tabs { display: flex; gap: calc(var(--u) * 0.3); }
.ob-tab {
  padding: calc(var(--u) * 0.5) calc(var(--u) * 1.1);
  font-family: var(--f-mono);
  font-size: var(--t-micro);
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--dim);
  background: none;
  border: 0;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  transition: color 0.14s linear, border-color 0.14s linear;
}
.ob-tab:hover { color: var(--txt); }
.ob-tab.on { color: var(--accent); border-bottom-color: var(--accent); }

.ob-scroll {
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-width: thin;
  scrollbar-color: rgba(216, 255, 74, 0.4) transparent;
}
.ob-scroll::-webkit-scrollbar { width: calc(var(--u) * 0.5); }
.ob-scroll::-webkit-scrollbar-thumb { background: rgba(216, 255, 74, 0.35); }
.ob-scroll::-webkit-scrollbar-track { background: rgba(255, 255, 255, 0.09); }

.ob-menu-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: calc(var(--u) * 1.6);
}
.ob-pane-label {
  display: block;
  margin: calc(var(--u) * 0.5) 0 calc(var(--u) * 0.3);
  color: var(--accent);
  opacity: 0.75;
}

/* ---- pause ------------------------------------------------------------ */
.ob-pause-card { width: min(88vw, calc(var(--u) * 50)); }
.ob-pause-card .ob-h2 { font-size: calc(var(--u) * 2.3); }
.ob-pause-card .ob-btn { padding: calc(var(--u) * 1.05) calc(var(--u) * 1.2); }
.ob-pause-list { display: flex; flex-direction: column; gap: calc(var(--u) * 0.5); }
.ob-pause-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: calc(var(--u) * 0.6);
}
.ob-pause-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: calc(var(--u) * 0.24);
  padding: calc(var(--u) * 0.5) 0;
  border: 1px solid var(--line);
  background: rgba(255, 255, 255, 0.022);
}
.ob-pause-stat .n { font-size: calc(var(--u) * 1.8); line-height: 0.9; }
.ob-pause-stat:first-child .n { color: var(--accent); }

/* ---- settings --------------------------------------------------------- */
.ob-settings-card {
  width: min(94vw, calc(var(--u) * 62));
  display: flex;
  flex-direction: column;
  min-height: 0;
  max-height: 88vh;
}
.ob-settings-scroll {
  flex: 1 1 auto;
  min-height: 0;
  padding-right: calc(var(--u) * 0.8);
  /* Faded at the bottom edge so a pane with more below it says so. The graphics
     list runs half a screen past the fold at 720p, and the only other signal is
     a five-pixel scrollbar of dark grey on a dark grey card. */
  mask-image: linear-gradient(180deg, #000 calc(100% - var(--u) * 2), transparent 100%);
}
.ob-settings-foot {
  display: flex;
  gap: var(--gap);
  justify-content: flex-end;
}
.ob-settings-foot.start { justify-content: flex-start; padding-top: var(--gap); }
.ob-settings-foot .ob-btn { width: auto; }
.ob-pane { display: none; }
.ob-pane.on { display: block; }

/* ---- loadout ---------------------------------------------------------- */
.ob-loadout-card { width: min(92vw, calc(var(--u) * 52)); }
.ob-lo-list { display: flex; flex-direction: column; }
.ob-lo-row {
  display: grid;
  grid-template-columns: calc(var(--u) * 5) 1fr auto;
  align-items: center;
  gap: var(--gap);
  padding: calc(var(--u) * 0.55) calc(var(--u) * 0.4);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  border-left: calc(var(--u) * 0.16) solid transparent;
}
.ob-lo-row.on { border-left-color: var(--accent); background: rgba(216, 255, 74, 0.07); }
.ob-lo-icon svg { width: 100%; height: calc(var(--u) * 1.6); display: block; }
.ob-lo-icon svg path { fill: rgba(232, 237, 242, 0.8); }
.ob-lo-row.on .ob-lo-icon svg path { fill: var(--accent); }
.ob-lo-text { display: flex; flex-direction: column; gap: calc(var(--u) * 0.1); }
.ob-lo-name {
  font-family: var(--f-cond);
  font-size: var(--t-body);
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}
.ob-lo-slot { color: var(--faint); }
.ob-lo-empty { padding: var(--gap) 0; }
.ob-lo-streaks { display: flex; flex-direction: column; }
/* Dimmed until earned: the ladder is a briefing, so an unearned reward has to
   stay readable rather than being hidden or greyed to nothing. */
.ob-lo-streak { opacity: 0.55; }
.ob-lo-streak.on { opacity: 1; }
.ob-lo-streak .ob-lo-icon svg { height: calc(var(--u) * 2); }
.ob-lo-streak .ob-lo-icon svg g { stroke: rgba(232, 237, 242, 0.8); }
.ob-lo-streak.on .ob-lo-icon svg g { stroke: var(--accent); }
.ob-lo-desc {
  font-family: var(--f-body);
  font-size: var(--t-micro);
  letter-spacing: 0.01em;
  line-height: 1.35;
  color: var(--dim);
}

/* ---- main menu footer ------------------------------------------------- */
.ob-main-foot { display: flex; gap: var(--gap); margin-top: calc(var(--u) * 0.6); }
.ob-main-foot .ob-btn { width: auto; padding-inline: calc(var(--u) * 2.4); }

/* ---- main menu -------------------------------------------------------- */
.ob-main-body { align-items: center; text-align: center; gap: calc(var(--u) * 1.4); }
.ob-main-deploy {
  margin-top: calc(var(--u) * 2.2);
  padding: calc(var(--u) * 1) calc(var(--u) * 3.4);
  font-family: var(--f-cond);
  font-weight: 700;
  font-size: clamp(18px, 2.4vw, 34px);
  letter-spacing: 0.3em;
  text-transform: uppercase;
  color: #eaffb4;
  background: rgba(216, 255, 74, 0.1);
  border: 1px solid var(--accent-soft);
  box-shadow: var(--inner), 0 0 calc(var(--u) * 3) rgba(216, 255, 74, 0.16);
  cursor: pointer;
  animation: ob-breathe 2.6s ease-in-out infinite;
}
@keyframes ob-breathe {
  0%, 100% { box-shadow: var(--inner), 0 0 calc(var(--u) * 2) rgba(216, 255, 74, 0.12); }
  50% { box-shadow: var(--inner), 0 0 calc(var(--u) * 4.6) rgba(216, 255, 74, 0.34); }
}
.ob-main-hint { font-family: var(--f-mono); font-size: var(--t-micro); letter-spacing: 0.28em; color: var(--dim); }
.ob-keys {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(calc(var(--u) * 15), 1fr));
  gap: calc(var(--u) * 0.3) calc(var(--u) * 2.4);
  margin-top: calc(var(--u) * 1.6);
  width: min(86vw, calc(var(--u) * 66));
  text-align: left;
}
.ob-key-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--gap);
  padding: calc(var(--u) * 0.24) 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.045);
}
.ob-key-act {
  font-family: var(--f-cond);
  font-size: var(--t-small);
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(232, 237, 242, 0.86);
}
.ob-key-bind { font-family: var(--f-mono); font-size: var(--t-micro); letter-spacing: 0.1em; color: var(--accent); }

/* ---- scoreboard ------------------------------------------------------- */
.ob-sb {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.16s var(--ease), visibility 0.16s;
  background: rgba(4, 6, 8, 0.55);
  backdrop-filter: blur(calc(var(--u) * 0.5)) brightness(0.8);
  -webkit-backdrop-filter: blur(calc(var(--u) * 0.5)) brightness(0.8);
}
.ob-sb.open { opacity: 1; visibility: visible; }
.ob-sb-card { width: min(92vw, calc(var(--u) * 84)); }
.ob-sb-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--gap);
}
.ob-sb-table { display: flex; flex-direction: column; }
.ob-sb-tr {
  display: grid;
  grid-template-columns: calc(var(--u) * 2.6) 1fr repeat(4, calc(var(--u) * 6));
  align-items: center;
  gap: var(--gap);
  padding: calc(var(--u) * 0.56) calc(var(--u) * 0.5);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}
.ob-sb-tr.gone { display: none; }
.ob-sb-tr.head {
  border-bottom-color: var(--accent-soft);
  padding-bottom: calc(var(--u) * 0.42);
}
.ob-sb-tr.head span {
  font-family: var(--f-mono);
  font-size: var(--t-micro);
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--txt);
  opacity: 0.72;
}
.ob-sb-tr.head span:not(:nth-child(-n + 2)) { text-align: right; }
.ob-sb-tr.me { background: rgba(216, 255, 74, 0.09); box-shadow: inset calc(var(--u) * 0.16) 0 0 var(--accent); }
.ob-sb-tr.dead { opacity: 0.42; }
.ob-sb-name {
  font-family: var(--f-cond);
  font-size: var(--t-body);
  font-weight: 500;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ob-sb-num {
  font-family: var(--f-cond);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  font-size: var(--t-body);
  text-align: right;
}
.ob-sb-team {
  font-family: var(--f-mono);
  font-size: var(--t-micro);
  color: var(--danger);
  text-align: center;
}
.ob-sb-tr.friendly .ob-sb-team { color: var(--friendly); }
.ob-sb-more {
  padding-top: calc(var(--u) * 0.6);
  text-align: right;
}
.ob-sb-more.gone { display: none; }

/* ---- death screen ----------------------------------------------------- */
.ob-death {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: calc(var(--u) * 0.8);
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.4s var(--ease), visibility 0.4s;
  background:
    radial-gradient(112% 84% at 50% 46%, rgba(24, 5, 4, 0.6) 12%, rgba(3, 2, 2, 0.95) 100%);
  backdrop-filter: saturate(0.14) blur(calc(var(--u) * 0.38)) brightness(0.32);
  -webkit-backdrop-filter: saturate(0.14) blur(calc(var(--u) * 0.38)) brightness(0.32);
}
.ob-death.open { opacity: 1; visibility: visible; }
.ob-death-kia {
  font-family: var(--f-cond);
  font-weight: 700;
  font-size: clamp(30px, 5.4vw, 74px);
  letter-spacing: 0.28em;
  text-transform: uppercase;
  color: #f1e6e4;
  text-shadow: 0 calc(var(--u) * 0.3) calc(var(--u) * 2) rgba(0, 0, 0, 0.8);
}
.ob-death-by {
  display: flex;
  align-items: center;
  gap: calc(var(--u) * 0.8);
  padding: calc(var(--u) * 0.5) calc(var(--u) * 1.2);
  border: 1px solid rgba(255, 59, 48, 0.35);
  background: rgba(255, 59, 48, 0.07);
}
.ob-death-killer {
  font-family: var(--f-cond);
  font-size: var(--t-head);
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}
.ob-death-by svg { width: calc(var(--u) * 4); height: calc(var(--u) * 1.5); display: block; }
.ob-death-by svg path { fill: rgba(255, 220, 216, 0.9); }
.ob-death-hs svg { width: calc(var(--u) * 1.4); height: calc(var(--u) * 1.4); }
.ob-death-hs svg path { fill: var(--warn); }
.ob-death-timer {
  font-family: var(--f-mono);
  font-size: var(--t-body);
  letter-spacing: 0.3em;
  text-transform: uppercase;
  color: var(--txt);
  margin-top: calc(var(--u) * 0.8);
}
.ob-death-bar {
  width: min(48vw, calc(var(--u) * 34));
  height: calc(var(--u) * 0.18);
  background: rgba(255, 255, 255, 0.1);
}
.ob-death-bar i {
  display: block;
  height: 100%;
  background: var(--danger);
  transform-origin: 0 50%;
  transform: scaleX(var(--p, 0));
}
.ob-death-prompt {
  font-family: var(--f-cond);
  font-size: var(--t-head);
  font-weight: 700;
  letter-spacing: 0.26em;
  text-transform: uppercase;
  color: var(--accent);
  opacity: 0;
  transition: opacity 0.3s var(--ease);
}
.ob-death.ready .ob-death-prompt { opacity: 1; animation: ob-blink 1.3s ease-in-out infinite; }
@keyframes ob-blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.45; }
}

/* ---- rebinding -------------------------------------------------------- */
.ob-bind {
  min-width: calc(var(--u) * 9);
  padding: calc(var(--u) * 0.36) calc(var(--u) * 0.7);
  font-family: var(--f-mono);
  font-size: var(--t-micro);
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--txt);
  background: rgba(255, 255, 255, 0.045);
  border: 1px solid var(--line);
  cursor: pointer;
  transition: background-color 0.12s linear, border-color 0.12s linear;
}
.ob-bind:hover { border-color: var(--accent-soft); background: rgba(216, 255, 74, 0.1); }
.ob-bind.listening {
  border-color: var(--accent);
  color: var(--accent);
  animation: ob-blink 0.9s ease-in-out infinite;
}
/* Warned, not blocked. Doubling a key is occasionally deliberate — a player who
   never leans may well want E on something else too — so the row says the key is
   shared and leaves the decision alone. */
.ob-bind.clash {
  border-color: rgba(245, 158, 11, 0.55);
  color: var(--warn);
  background: rgba(245, 158, 11, 0.09);
}
.ob-bind.clash.listening { color: var(--accent); }

@media (prefers-reduced-motion: reduce) {
  .ob-ui .ob-fx-low.beat,
  .ob-ui .ob-fx-grit,
  .ob-ui .ob-stk-slot.fresh,
  .ob-ui .ob-main-deploy,
  .ob-ui .ob-vit.critical .ob-vit-seg:not(.spent),
  .ob-ui .ob-vit.regen .ob-vit-regen,
  .ob-ui .ob-death.ready .ob-death-prompt,
  .ob-ui .ob-bind.listening { animation: none; }
  .ob-ui .ob-ann.show,
  .ob-ui .ob-ann.show .ob-ann-main,
  .ob-ui .ob-ann.show .ob-ann-rule,
  .ob-ui .ob-ann.show .ob-ann-sweep::after { animation-duration: 0.001s; }
  .ob-ui .ob-ann.show { opacity: 1; }
  .ob-ui .ob-ann.show .ob-ann-rule { transform: scaleX(1); }
  .ob-ui .ob-ammo.empty { animation: none; }
}
`;

let injected = false;

export function injectStyles(): void {
  if (injected || document.getElementById(STYLE_ID)) {
    injected = true;
    return;
  }
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = CSS;
  document.head.appendChild(style);
  injected = true;
}

export function removeStyles(): void {
  document.getElementById(STYLE_ID)?.remove();
  injected = false;
}
