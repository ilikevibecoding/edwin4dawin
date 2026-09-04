// Natural eye blinks for NPC skins. Every 2.5-7 s (per-NPC random phase, never synchronized) the eye pixels
// of the skin canvas are covered with eyelid pixels (skin tone, slightly darker) for ~120-160 ms, then the exact
// original pixels are restored and the shared body texture is re-uploaded. Only the 5x1 eye strip is redrawn.
//
// Integration (npc.js): after buildHumanoid() in the NPC constructor -> attachBlink(this, skin)
//                       in NPCManager.render() for every visible NPC  -> updateBlink(npc, dt)
import { RNG } from '../rng.js';

export const BLINK = {
  minGap: 2.5, maxGap: 7,      // seconds between blinks
  minDur: 0.12, maxDur: 0.16,  // seconds the eyes stay closed
  maxDist: 40,                 // NPCs farther than this (npc.lastCamDist, when maintained by the renderer) do not repaint
};

function findTexture(npc) {
  const mat = npc && npc.model && npc.model.material;
  return mat && mat.uniforms && mat.uniforms.map ? mat.uniforms.map.value : null;
}

function upload(state) {
  if (!state.tex) state.tex = findTexture(state.npc);
  if (state.tex) state.tex.needsUpdate = true;
}

function paintClosed(state) {
  const { ctx, eyes } = state;
  ctx.fillStyle = eyes.lid;
  for (const p of eyes.pixels) ctx.fillRect(p.x, p.y, 1, 1);
  state.closed = true;
  upload(state);
}

function paintOpen(state) {
  state.ctx.putImageData(state.eyes.image, state.eyes.x, state.eyes.y);
  state.closed = false;
  upload(state);
}

// skinInfo: the object returned by paintSkin() (needs .canvas and .eyes). Returns the blink state stored on npc.blink.
export function attachBlink(npc, skinInfo, texture = null) {
  if (!npc || !skinInfo || !skinInfo.eyes || !skinInfo.canvas) return null;
  const rng = new RNG((((npc.id | 0) + 1) * 48271 + (skinInfo.seed | 0) * 7 + 977) >>> 0);
  const state = {
    npc, eyes: skinInfo.eyes,
    canvas: skinInfo.canvas, ctx: skinInfo.canvas.getContext('2d'),
    tex: texture || findTexture(npc),
    rng,
    timer: rng.range(0.5, BLINK.maxGap), // first blink: random phase so a crowd never blinks in unison
    closeLeft: 0, closed: false, hold: false, blinks: 0,
  };
  npc.blink = state;
  return state;
}

// Force the eyes shut / open (e.g. sleeping NPCs). While held shut, updateBlink() leaves them alone.
export function setEyesClosed(npc, closed) {
  const s = npc && npc.blink;
  if (!s) return;
  s.hold = !!closed;
  if (closed && !s.closed) paintClosed(s);
  else if (!closed && s.closed) { s.closeLeft = 0; paintOpen(s); }
}

export function updateBlink(npc, dt) {
  const s = npc && npc.blink;
  if (!s || s.hold || !(dt > 0)) return;
  if (dt > 0.25) dt = 0.25;
  const far = (npc.root && npc.root.visible === false) || (typeof npc.lastCamDist === 'number' && npc.lastCamDist > BLINK.maxDist);
  if (s.closed) {
    s.closeLeft -= dt;
    if (s.closeLeft <= 0 || far) paintOpen(s);
    return;
  }
  s.timer -= dt;
  if (s.timer > 0) return;
  s.timer = s.rng.range(BLINK.minGap, BLINK.maxGap);
  if (far) return; // keep the rhythm going but skip the repaint for distant NPCs
  s.closeLeft = s.rng.range(BLINK.minDur, BLINK.maxDur);
  s.blinks++;
  paintClosed(s);
}
