// Full NPC models for the cast anchors (spec §13, rubric 14 C3): W9 `composeAppearance` + `buildAppearanceModel`,
// never crowd instances. A CastActors instance owns one three.js model per live anchor, positioned and posed every
// frame by the population's update loop with the same parameters the crowd instancer gets (mode, phase, speed, head
// look, sampled light), so a cast member moves, sits, sleeps, welds and talks like everyone else - only with a
// unique face, outfit and a name tag within eight blocks. Models are cached per anchor, so a re-spawn costs nothing.
import * as THREE from 'three';
import { composeAppearance } from '../appearance/index.js';
import { buildAppearanceModel } from '../appearance/attach.js';
import { attachBlink, updateBlink, setEyesClosed } from '../blink.js';
import { drawText, measureText } from '../../font.js';
import { MODE } from '../coruscant/crowd.js';

export const TAG_DIST = 8;
const TWO_PI = Math.PI * 2;

export class CastActors {
  constructor(game, registry) {
    this.game = game; this.registry = registry; this.scene = game.scene;
    this.cache = new Map();   // castId -> { model, app, tag }
    this.live = new Map();    // npc.id -> actor
    this.time = 0;
    this.stats = { built: 0, live: 0 };
  }
  build(pp) {
    let c = this.cache.get(pp.castId);
    if (c) return c;
    const seed = (pp.seed ^ 0xca57) >>> 0 || 1;
    const app = composeAppearance(seed, { ...pp.appearance });
    const model = buildAppearanceModel(app);
    model.root.frustumCulled = false;
    const tag = makeTag(pp.name, model.height || 1.8);
    model.root.add(tag);
    c = { model, app, tag };
    this.cache.set(pp.castId, c);
    this.stats.built++;
    return c;
  }
  spawn(npc, pp) {
    if (this.live.has(npc.id)) return this.live.get(npc.id);
    const { model, app, tag } = this.build(pp);
    const actor = { id: npc.id, npc, pp, model, root: model.root, tag, lastCamDist: 0, blink: null, lightTimer: 0, walkT: 0 };
    if (model.kind === 'humanoid' && app.eyes) attachBlink(actor, app);   // reads app.canvas / app.eyes / app.seed; texture from actor.model.material
    model.root.visible = false;
    this.scene.add(model.root);
    this.live.set(npc.id, actor);
    npc.actor = actor;
    this.stats.live = this.live.size;
    return actor;
  }
  despawn(npc) {
    const a = this.live.get(npc.id);
    if (!a) return;
    this.scene.remove(a.root);
    this.live.delete(npc.id);
    npc.actor = null;
    this.stats.live = this.live.size;
  }
  hide(npc) { const a = this.live.get(npc.id); if (a) a.root.visible = false; }

  // Same parameters as crowd.set(): { x, y, z, yaw, pitch, scale, mode, phase, speed, amp, headYaw, headPitch, sky, blk }
  set(npc, v, camDist = 0) {
    const a = this.live.get(npc.id);
    if (!a) return;
    const m = a.model;
    a.root.visible = true;
    a.lastCamDist = camDist;
    const s = m.app.model.scale || [1, 1, 1];
    const k = v.scale || 1;
    a.root.position.set(v.x, v.y, v.z);
    a.root.rotation.set(v.pitch || 0, v.yaw || 0, 0);
    a.root.scale.set(s[0] * k, s[1] * k, s[2] * k);
    const ph = this.time * (v.speed || 0) + (v.phase || 0);
    if (m.kind === 'humanoid') {
      pose(m, v.mode | 0, ph, v.amp == null ? 1 : v.amp, this.time);
      m.head.rotation.y = v.headYaw || 0;
      m.head.rotation.x = v.headPitch || 0;
    } else if (m.kind === 'boxes') {
      // droids: a gentle roll bob while moving, a slow dome turn while working
      const moving = v.mode === MODE.WALK || v.mode === MODE.ROLL || v.mode === MODE.RUN || v.mode === MODE.SWEEPING;
      a.root.position.y = v.y + (moving ? Math.abs(Math.sin(ph * 2)) * 0.03 : 0);
      const dome = m.parts && (m.parts.head || m.parts.dome);
      if (dome) dome.rotation.y = moving ? 0 : Math.sin(this.time * 0.7 + (v.phase || 0)) * 0.6 + (v.headYaw || 0);
    }
    if (++a.lightTimer >= 6) {
      a.lightTimer = 0;
      const u = m.material.uniforms;
      if (u && u.uLight) u.uLight.value.set(v.sky == null ? 15 : v.sky, v.blk == null ? 0 : v.blk);
    }
    if (a.blink) setEyesClosed(a, v.mode === MODE.SLEEPING);
    a.tag.visible = camDist < TAG_DIST && !npc.lying;
    if (a.tag.visible) a.tag.position.y = (m.height || 1.8) + 0.35 + (npc.sitting ? -0.42 : 0);
  }
  update(dt, time) {
    this.time = time;
    for (const a of this.live.values()) if (a.blink) updateBlink(a, dt);
  }
  dispose() {
    for (const a of this.live.values()) this.scene.remove(a.root);
    this.live.clear();
    for (const c of this.cache.values()) { c.model.root.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); if (c.model.material) c.model.material.dispose(); if (c.tag.material.map) c.tag.material.map.dispose(); c.tag.material.dispose(); }
    this.cache.clear();
  }
}
// Limb angles by mode - the JS mirror of crowd.js's `limbs()` so actors and instances share one body language.
function pose(m, mode, ph, amp, time) {
  const s = Math.sin(ph), c = Math.cos(ph);
  const set = (part, ax, az) => { part.rotation.x = ax; part.rotation.z = az; };
  const R = m.rightArm, L = m.leftArm, RL = m.rightLeg, LL = m.leftLeg;
  let bodyYaw = 0;
  set(RL, 0, 0); set(LL, 0, 0);
  switch (mode) {
    case MODE.WALK: case MODE.RUN: case MODE.CARRY: {
      const sw = s * 0.75 * amp;
      set(RL, sw, 0); set(LL, -sw, 0);
      if (mode === MODE.CARRY) { set(R, -1.5 + s * 0.05, 0.1); set(L, -1.5 + s * 0.05, -0.1); }
      else if (mode === MODE.RUN) { set(R, -2.2 + s * 0.5, 0.35); set(L, -2.2 - s * 0.5, -0.35); }
      else { set(R, -sw * 0.9, 0.05); set(L, sw * 0.9, -0.05); }
      break;
    }
    case MODE.TYPING: set(R, -1.3 + Math.sin(ph * 4) * 0.12, 0.15); set(L, -1.3 + Math.cos(ph * 3.3) * 0.12, -0.15); break;
    case MODE.SERVING: set(R, -1.45, 0.1); set(L, -0.2 + s * 0.15, -0.08); break;
    case MODE.SWEEPING: set(R, -0.9 + c * 0.2, 0.45 + s * 0.45); set(L, -0.7 + c * 0.2, -0.1 + s * 0.35); bodyYaw = s * 0.18; break;
    case MODE.WELDING: set(R, -1.1 + Math.sin(ph * 6) * 0.06, 0.2); set(L, -0.6, -0.15); set(RL, -1.6, 0); set(LL, -0.4, 0); break;
    case MODE.SITTING: case MODE.EATING: case MODE.MEDITATING:
      set(RL, -1.5708, 0); set(LL, -1.5708, 0);
      set(R, -0.4, 0.08); set(L, -0.4, -0.08);
      if (mode === MODE.EATING) set(R, -1.2 - Math.max(0, s) * 1.1, 0.08);
      if (mode === MODE.MEDITATING) { set(R, -0.95, 0.12); set(L, -0.95, -0.12); }
      break;
    case MODE.SLEEPING: set(R, 0, 0.08); set(L, 0, -0.08); break;
    case MODE.GUARD: set(R, 0, 0.02); set(L, 0, -0.02); break;
    case MODE.DANCING: set(R, -2.4 + s * 0.4, 0.5 + 0.3 * c); set(L, -2.4 - s * 0.4, -(0.5 + 0.3 * c)); set(RL, s * 0.35, 0); set(LL, -s * 0.35, 0); bodyYaw = s * 0.25; break;
    case MODE.TALKING: case MODE.SPEAKING: set(R, -0.9 + s * 0.35, 0.3 + c * 0.15); set(L, -0.3 + c * 0.2, -0.1); break;
    case MODE.BROWSING: set(R, -0.7, -0.25); set(L, -0.7, 0.25); break;
    case MODE.EXERCISING: set(R, -1.6 - Math.max(0, s) * 1.4, 0.05); set(L, -1.6 - Math.max(0, -s) * 1.4, -0.05); set(RL, s * 0.2, 0); set(LL, -s * 0.2, 0); break;
    case MODE.WAITING: set(R, -1.2, -0.35); set(L, -1.2, 0.35); break;
    case MODE.TENDING: set(R, -1.0 + s * 0.1, 0.1); set(L, -1.0 + s * 0.1, -0.1); break;
    case MODE.WATCHING: set(R, -2.6, 0.05); set(L, 0, -0.05); break;
    default: { const sway = 0.05 + 0.04 * Math.sin(time * 1.5 + ph); set(R, 0, sway); set(L, 0, -sway); }
  }
  if (m.body) m.body.rotation.y = bodyYaw;
}

function makeTag(name, height) {
  const sc = 2;
  const w = measureText(name, sc) + 8, h = 8 * sc + 6;
  let sp;
  if (typeof document !== 'undefined') {
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    const ctx = cv.getContext('2d');
    ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fillRect(0, 0, w, h);
    drawText(ctx, name, 4, 3, sc, '#ffd866', true);
    const tex = new THREE.CanvasTexture(cv);
    tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestFilter; tex.colorSpace = THREE.NoColorSpace;
    sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: true, depthWrite: false }));
  } else sp = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true }));
  sp.scale.set(w * 0.0125, h * 0.0125, 1);
  sp.position.set(0, height + 0.35, 0);
  sp.visible = false;
  return sp;
}
