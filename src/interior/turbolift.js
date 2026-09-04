// Turbolift: one cab per deck (identical interiors), a lift door per lobby, and the ride sequence:
// doors close → cab "moves" (light streaks, rumble hook, deck readout counts) → the destination deck
// is streamed in → the player is teleported into the destination cab → doors open.
import * as THREE from "three";
import { PALETTE } from "../materials.js";
import { pointLight, wallFrame } from "./builders.js";
import { impFloor, impWall } from "./imperial.js";
import { makeCanvas, toTexture } from "../textures.js";

const PASS_BANDS = 3; // horizontal light channels per side wall that chase during the ride
const ACCENT = "#ffb347";
const BLUE = "#4a9dff";

/**
 * Shared dynamic displays: one sign material and one call-panel material for every cab. Only one
 * cab is ever visible (they sit on different decks), so a single redraw covers idle, transit and
 * arrival states. Created on first use and cached in the material set.
 */
function liftDisplays(materials) {
  if (materials.lift_sign) return { sign: materials.lift_sign, panel: materials.lift_panel };
  const mk = (w, h) => {
    const canvas = makeCanvas(w, h);
    const tex = toTexture(canvas, { srgb: true, wrap: false });
    // matte: at roughness 0.4 the cab light put a specular hotspot across "IN TRANSIT"
    const mat = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 1.25, roughness: 0.9, metalness: 0 });
    mat.userData.canvas = canvas;
    mat.userData.tex = tex;
    return mat;
  };
  materials.lift_sign = mk(1024, 192);
  materials.lift_panel = mk(256, 448);
  for (let i = 0; i < PASS_BANDS; i++) {
    const m = materials.emitWhiteDim.clone();
    m.emissiveIntensity = 0.35;
    materials["lift_pass" + i] = m;
  }
  drawLiftDisplays(materials, { deck: 1, name: "Bridge Deck", decks: [], lit: 1 });
  return { sign: materials.lift_sign, panel: materials.lift_panel };
}

/**
 * Redraw the sign and call panel. state = { deck, name, decks: [{index,name}], lit, target, moving }.
 * Idle: "DECK n / NAME", the current deck's lamp amber. Transit: "IN TRANSIT → DECK m / PASSING n",
 * the passing deck's lamp amber and the target lamp bright blue.
 */
export function drawLiftDisplays(materials, state) {
  const sign = materials.lift_sign;
  const panel = materials.lift_panel;
  if (!sign || !panel) return;
  const key = JSON.stringify([state.deck, state.lit, state.target, state.moving, (state.decks || []).map((d) => d.name)]);
  if (sign.userData.key === key) return;
  sign.userData.key = key;
  // sign
  {
    const c = sign.userData.canvas;
    const g = c.getContext("2d");
    g.fillStyle = "#07090c";
    g.fillRect(0, 0, 1024, 192);
    g.fillStyle = state.moving ? BLUE : ACCENT;
    g.fillRect(24, 22, 6, 148);
    g.fillRect(994, 22, 6, 148);
    g.textBaseline = "middle";
    g.textAlign = "center";
    g.font = "bold 84px 'Helvetica Neue', Arial, sans-serif";
    g.fillStyle = "#dfe6f2";
    g.fillText(state.moving ? `IN TRANSIT  \u2192  DECK ${state.target}` : `DECK ${state.deck}`, 512, 70);
    g.font = "bold 44px 'Helvetica Neue', Arial, sans-serif";
    g.fillStyle = state.moving ? BLUE : ACCENT;
    g.fillText((state.moving ? (state.lit === state.target ? "ARRIVING" : `PASSING DECK ${state.lit}`) : state.name || "").toUpperCase(), 512, 146);
    sign.userData.tex.needsUpdate = true;
  }
  // call panel: header, then one row per deck (lamp square, numeral, name)
  {
    const c = panel.userData.canvas;
    const g = c.getContext("2d");
    g.fillStyle = "#0b0e13";
    g.fillRect(0, 0, 256, 448);
    g.fillStyle = "#1a2029";
    g.fillRect(0, 0, 256, 54);
    g.textBaseline = "middle";
    g.textAlign = "left";
    g.font = "bold 26px 'Helvetica Neue', Arial, sans-serif";
    g.fillStyle = state.moving ? BLUE : "#9aa6b8";
    g.fillText(state.moving ? "IN TRANSIT" : "TURBOLIFT", 18, 27);
    const decks = state.decks && state.decks.length ? state.decks : [1, 2, 3, 4, 5].map((i) => ({ index: i, name: `Deck ${i}` }));
    const rowH = (448 - 70) / decks.length;
    decks.forEach((d, i) => {
      const y = 70 + rowH * (i + 0.5);
      const isLit = d.index === state.lit;
      const isTarget = state.moving && d.index === state.target;
      g.fillStyle = isLit ? ACCENT : isTarget ? BLUE : "#25405f";
      g.fillRect(18, y - 14, 44, 28);
      if (isLit || isTarget) {
        g.fillStyle = isLit ? "rgba(255,179,71,0.25)" : "rgba(74,157,255,0.25)";
        g.fillRect(10, y - 22, 60, 44);
      }
      g.fillStyle = isLit ? "#fff3e0" : "#dfe6f2";
      g.font = "bold 34px 'Helvetica Neue', Arial, sans-serif";
      g.fillText(String(d.index), 78, y + 1);
      g.font = "bold 20px 'Helvetica Neue', Arial, sans-serif";
      g.fillStyle = isLit ? ACCENT : isTarget ? BLUE : "#8d99ab";
      g.fillText(String(d.name || "").replace(/ Deck$/i, "").toUpperCase(), 112, y + 1);
    });
    panel.userData.tex.needsUpdate = true;
  }
}

/** Cab interior builder (sector kind "lift"). Door is on the zmin side (toward the lobby). */
export function buildLiftCab(kit, ctx) {
  const [min, max] = ctx.bounds;
  const h = max[1] - min[1];
  const cx = (min[0] + max[0]) / 2;
  const cz = (min[2] + max[2]) / 2;
  liftDisplays(ctx.materials);
  impFloor(kit, ctx, { pad: 0.2 });
  for (const side of ["zmin", "zmax", "xmin", "xmax"]) {
    impWall(kit, ctx, side, {
      rows: [0, 0.5, 1.9, h],
      panelW: 1.0,
      styles: { panel: 0.8, strip: 0.2 },
      paints: [
        [PALETTE.impGrey, 0.5],
        [PALETTE.impMid, 0.35],
        [PALETTE.impLight, 0.15],
      ],
      seed: ctx.seed + side.length,
      theme: { decals: false },
    });
  }
  // ceiling: dark tray, a faint lit diffuser and a narrow bright ring (no solid white slab)
  kit.boxMM("paintedMetal", [min[0] - 0.2, h, min[2] - 0.2], [max[0] + 0.2, h + 0.15, max[2] + 0.2], { color: PALETTE.impDark, texel: 1.5 });
  kit.box("paintedMetal", cx, h - 0.05, cz, 1.8, 0.1, 1.8, { color: PALETTE.impBlack, texel: 2 });
  kit.box("emitWhiteFaint", cx, h - 0.1, cz, 1.5, 0.02, 1.5, { uv: "keep" });
  kit.box("paintedMetal", cx, h - 0.115, cz, 1.0, 0.02, 1.0, { color: PALETTE.impBlack, texel: 2 });
  for (const s of [-1, 1]) {
    kit.box("emitWhiteDim", cx + s * 0.6, h - 0.12, cz, 0.06, 0.02, 1.26, { uv: "keep" });
    kit.box("emitWhiteDim", cx, h - 0.12, cz + s * 0.6, 1.26, 0.02, 0.06, { uv: "keep" });
  }
  ctx.light(pointLight(0xe8f0ff, 5, 6, [cx, h - 0.6, cz]));
  // vertical light channels in the rear corners: a soft bright band on a dim blue ground that the
  // ride scrolls down (or up) the channel — one "passing floor" sweep per ~1.2 s, so a single frame
  // taken mid-ride shows the band part-way along both channels
  if (!ctx.materials.lift_streak) {
    const c = makeCanvas(16, 256);
    const g = c.getContext("2d");
    g.fillStyle = "#0b1a30";
    g.fillRect(0, 0, 16, 256);
    const grad = g.createLinearGradient(0, 88, 0, 168);
    grad.addColorStop(0, "rgba(74,157,255,0)");
    grad.addColorStop(0.5, "rgba(205,228,255,1)");
    grad.addColorStop(1, "rgba(74,157,255,0)");
    g.fillStyle = grad;
    g.fillRect(0, 88, 16, 80);
    const tex = toTexture(c, { srgb: true, wrap: true, anisotropy: 2 });
    ctx.materials.lift_streak = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.9, roughness: 0.5, metalness: 0 });
  }
  const depth = max[2] - min[2];
  for (const s of [-1, 1]) {
    kit.box("paintedMetal", cx + s * (max[0] - min[0]) * 0.42, h / 2, max[2] - 0.1, 0.2, h - 0.4, 0.1, { color: PALETTE.impBlack, texel: 2 });
    kit.box("lift_streak", cx + s * (max[0] - min[0]) * 0.42, h / 2, max[2] - 0.152, 0.11, h - 0.6, 0.01, { uv: "keep" });
    // side-wall light channels: three horizontal bands in dark housings; they chase downward (or
    // upward) during the ride so passing-deck light reads even in a still frame
    const x = s < 0 ? min[0] + 0.03 : max[0] - 0.03;
    kit.box("paintedMetal", x, 1.45, cz, 0.06, 1.7, depth - 0.7, { color: PALETTE.impBlack, texel: 2 });
    for (let i = 0; i < PASS_BANDS; i++) {
      const y = 0.75 + i * 0.7;
      kit.box("lift_pass" + i, x + (s < 0 ? 0.035 : -0.035), y, cz, 0.01, 0.06, depth - 0.9, { uv: "keep" });
    }
    // kick plate along the side walls
    kit.box("paintedMetal", x + (s < 0 ? 0.02 : -0.02), 0.09, cz, 0.04, 0.18, depth - 0.3, { color: PALETTE.impDark, texel: 2 });
  }
  // deck readout and the call panel on the rear wall: both are shared dynamic displays redrawn by
  // the Turbolift (idle: this deck; ride: IN TRANSIT with the passing deck stepping)
  const u = (max[0] - min[0]) / 2;
  const { frame } = wallFrame(kit, [max[0], max[2]], [min[0], max[2]], 0);
  frame.box("paintedMetal", u, 2.05, 0.035, 1.7 + 0.12, 0.34 + 0.12, 0.07, { color: PALETTE.impBlack, texel: 2 });
  frame.add("lift_sign", new THREE.PlaneGeometry(1.7, 0.34), u, 2.05, 0.072, { uv: "keep" });
  frame.box("paintedMetal", u, 1.25, 0.04, 0.72, 0.98, 0.08, { color: PALETTE.impDark, texel: 2 });
  frame.add("lift_panel", new THREE.PlaneGeometry(0.46, 0.8), u - 0.09, 1.25, 0.082, { uv: "keep" });
  // physical call buttons in a dark column beside each numbered row of the panel
  frame.box("paintedMetal", u + 0.25, 1.25, 0.09, 0.12, 0.86, 0.02, { color: PALETTE.impBlack, texel: 2 });
  for (let i = 0; i < 5; i++) {
    const rowH = 0.8 * ((448 - 70) / 448) / 5;
    const y = 1.25 + 0.4 - 0.8 * (70 / 448) - rowH * (i + 0.5);
    frame.box("rubber", u + 0.25, y, 0.108, 0.07, 0.05, 0.016, { color: PALETTE.rubber });
  }
  frame.box("leds", u, 0.72, 0.088, 0.3, 0.03, 0.008, { uv: "keep" });
  // handrail on the side walls
  for (const s of [-1, 1]) {
    const x = s < 0 ? min[0] + 0.1 : max[0] - 0.1;
    kit.cyl("metal", x, 1.0, cz, 0.02, depth - 0.6, "z", { color: PALETTE.steel, segments: 10 });
    for (const dz of [-1, 1]) kit.box("metal", x + (s < 0 ? -0.04 : 0.04), 1.0, cz + dz * (depth / 2 - 0.4), 0.06, 0.03, 0.03, { color: PALETTE.steel });
  }
  kit.collider([min[0], 0, max[2] - 0.15], [max[0], 2, max[2]], "liftpanel");
}

const RIDE_BASE = 2.2; // seconds
const RIDE_PER_DECK = 0.55;

export class Turbolift {
  constructor({ interior, player, hud, audio, anim }) {
    this.interior = interior;
    this.player = player;
    this.hud = hud;
    this.audio = audio;
    this.state = "idle"; // idle | closing | moving | opening
    this.timer = 0;
    this.from = null;
    this.to = null;
    this.cabSector = null;
    this.enabled = true;
    this.onArrive = null;
    this._onKey = (e) => {
      if (this.state !== "idle" || !this.cabSector) return;
      const m = /^Digit([1-5])$/.exec(e.code);
      if (!m) return;
      const idx = +m[1];
      const deck = interior.decks.find((d) => d.def.index === idx);
      if (deck) this.go(deck.def.id);
    };
    document.addEventListener("keydown", this._onKey);
  }

  /** Door object of the lift on a deck */
  liftDoor(deckId) {
    const deck = this.interior.deckById(deckId);
    return deck.doors.find((d) => d.def.style === "lift");
  }

  cabOf(deckId) {
    const deck = this.interior.deckById(deckId);
    return deck.sectors.find((s) => s.def.kind === "lift");
  }

  go(deckId) {
    if (this.state !== "idle") return false;
    const cur = this.interior.currentSector;
    if (!cur || cur.def.kind !== "lift") return false;
    if (cur.deck.id === deckId) {
      this.hud.setStatus("Already on this deck.");
      return false;
    }
    this.from = cur.deck.id;
    this.to = deckId;
    this.state = "closing";
    this.timer = 0;
    this.liftDoor(this.from).setOpen(false);
    this.hud.setLiftPrompt(null);
    this.audio.event("lift_doors", cur.worldCenter);
    return true;
  }

  /** Network-friendly ride state. */
  snapshot() {
    return { state: this.state, from: this.from, to: this.to, timer: +this.timer.toFixed(2) };
  }
  /** Adopt a remote ride state (the local sequence continues from there). */
  applySnapshot(s) {
    if (!s) return;
    this.from = s.from;
    this.to = s.to;
    this.timer = s.timer || 0;
    this.state = s.state || "idle";
  }

  /** Redraw the cab sign / call panel for the current state (cached; cheap to call every frame). */
  display(deckIdx, extra = {}) {
    const decks = this.interior.decks.map((d) => ({ index: d.def.index, name: d.def.name }));
    const d = this.interior.decks.find((x) => x.def.index === deckIdx);
    drawLiftDisplays(this.interior.materials, { deck: deckIdx, name: d ? d.def.name : "", decks, lit: deckIdx, ...extra });
  }

  /** Side-wall light channels: chase along the travel direction while moving, faint when idle. */
  bands(active, dir, t) {
    const mats = this.interior.materials;
    for (let i = 0; i < PASS_BANDS; i++) {
      const m = mats["lift_pass" + i];
      if (!m) continue;
      if (!active) {
        m.emissiveIntensity = 0.35;
        continue;
      }
      const phase = t * 7 - dir * i * 2.1; // one band lit at a time, sweeping with the ride
      const k = Math.pow(Math.max(0, Math.sin(phase)), 6);
      m.emissiveIntensity = 0.25 + 3.2 * k;
    }
  }

  update(dt) {
    const interior = this.interior;
    const cur = interior.currentSector;
    const inCab = cur && cur.def.kind === "lift";
    this.cabSector = inCab ? cur : null;
    if (!this.enabled) {
      if (this._prompt) {
        this.hud.setLiftPrompt(null);
        this._prompt = null;
      }
      return;
    }
    if (this.state === "idle") {
      // proximity control of the lift door on the current deck
      const deck = interior.currentDeck;
      if (deck) {
        const door = this.liftDoor(deck.def.id);
        if (door) {
          const p = this.player.position;
          const d = Math.hypot(p.x - door.worldCenter.x, p.z - door.worldCenter.z);
          door.setOpen(d < 2.8 || inCab);
        }
        this.display(deck.def.index);
      }
      this.bands(false);
      const text = inCab ? `TURBOLIFT 1-5:  ${interior.decks.map((d) => `${d.def.index} ${d.def.name.replace(/ Deck$/i, "")}`).join(" \u00b7 ")}` : null;
      if (text !== this._prompt) {
        this.hud.setLiftPrompt(text);
        this._prompt = text;
      }
      return;
    }
    this.timer += dt;
    if (this.state === "closing") {
      const door = this.liftDoor(this.from);
      if (door.isClosed || this.timer > 3) {
        this.state = "moving";
        this.timer = 0;
        const fromIdx = interior.deckById(this.from).def.index;
        const toIdx = interior.deckById(this.to).def.index;
        this.rideTime = RIDE_BASE + RIDE_PER_DECK * Math.abs(fromIdx - toIdx);
        this.audio.event("lift_move", this.player.position);
        this.hud.setStatus(`Turbolift moving to ${interior.deckById(this.to).def.name}...`);
        interior.streamDeck(this.to); // start building the destination while the doors are shut
      }
      return;
    }
    if (this.state === "moving") {
      // rumble: tiny camera shake through the player's bob channel
      const k = Math.sin(this.timer * 40) * 0.006 * Math.min(1, this.timer * 2) * Math.min(1, Math.max(0, this.rideTime - this.timer));
      this.player.camera.position.y += k;
      // light bars streak: the LED texture scrolls fast along the bars and brightens
      const streak = interior.materials.lift_streak;
      const fromIdx = interior.deckById(this.from).def.index;
      const toIdx = interior.deckById(this.to).def.index;
      const dir = Math.sign(toIdx - fromIdx) || 1;
      if (streak) {
        streak.emissiveIntensity = 1.6 + 1.2 * Math.min(1, this.timer * 1.5);
        streak.emissiveMap.offset.y -= dt * 0.85 * dir;
      }
      this.hud.setLocation("Turbolift", `In transit \u2192 ${interior.deckById(this.to).def.name}`);
      // transit readout: the passing deck steps from origin to destination over the ride
      const prog = Math.min(1, this.timer / this.rideTime);
      const passing = Math.round(fromIdx + (toIdx - fromIdx) * prog);
      this.display(fromIdx, { moving: true, target: toIdx, lit: passing });
      this.bands(true, dir, this.timer);
      interior.streamDeck(this.to);
      if (this.timer >= this.rideTime && interior.deckBuilt(this.to)) {
        // teleport: keep the player's offset inside the cab
        const fromCab = this.cabOf(this.from);
        const toCab = this.cabOf(this.to);
        const p = this.player.position;
        const off = new THREE.Vector3().subVectors(p, fromCab.worldCenter);
        const dest = toCab.worldCenter.clone().add(off);
        this.player.position.set(dest.x, toCab.floorY, dest.z);
        this.player.vy = 0;
        interior.forceSector(toCab);
        this.state = "opening";
        this.timer = 0;
        this.liftDoor(this.to).setOpen(true);
        if (interior.materials.lift_streak) interior.materials.lift_streak.emissiveIntensity = 0.9;
        this.display(toIdx);
        this.bands(false);
        this.audio.event("lift_arrive", dest);
        this.hud.setStatus(`${interior.deckById(this.to).def.name}.`);
        // memory: decks two or more stops away are released (they rebuild on demand)
        interior.trimDecks(2);
        if (this.onArrive) this.onArrive(this.to);
      }
      return;
    }
    if (this.state === "opening") {
      const door = this.liftDoor(this.to);
      if (door.isOpen || this.timer > 3) {
        this.state = "idle";
        this.from = this.to = null;
      }
    }
  }
}
