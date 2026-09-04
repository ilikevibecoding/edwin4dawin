// Turbolift: one cab per deck (identical interiors), a lift door per lobby, and the ride sequence:
// doors close → cab "moves" (light streaks, rumble hook, deck readout counts) → the destination deck
// is streamed in → the player is teleported into the destination cab → doors open.
import * as THREE from "three";
import { PALETTE } from "../materials.js";
import { pointLight, wallFrame } from "./builders.js";
import { impFloor, impWall } from "./imperial.js";
import { signPlate } from "./corridor.js";

/** Cab interior builder (sector kind "lift"). Door is on the zmin side (toward the lobby). */
export function buildLiftCab(kit, ctx) {
  const [min, max] = ctx.bounds;
  const h = max[1] - min[1];
  const cx = (min[0] + max[0]) / 2;
  const cz = (min[2] + max[2]) / 2;
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
  // ceiling: dark panel with a bright white square diffuser and a ring of small lamps
  kit.boxMM("paintedMetal", [min[0] - 0.2, h, min[2] - 0.2], [max[0] + 0.2, h + 0.15, max[2] + 0.2], { color: PALETTE.impDark, texel: 1.5 });
  kit.box("paintedMetal", cx, h - 0.05, cz, 1.8, 0.1, 1.8, { color: PALETTE.impBlack, texel: 2 });
  kit.box("emitWhiteSoft", cx, h - 0.1, cz, 1.5, 0.03, 1.5, { uv: "keep" });
  ctx.light(pointLight(0xe8f0ff, 5, 6, [cx, h - 0.6, cz]));
  // vertical light bars in the rear corners and along the side walls: a dedicated material so the
  // lift can streak them during the ride
  if (!ctx.materials.lift_streak) {
    ctx.materials.lift_streak = ctx.materials.emitBlue.clone();
    ctx.materials.lift_streak.emissiveMap = ctx.materials.leds.emissiveMap.clone();
    ctx.materials.lift_streak.emissiveMap.needsUpdate = true;
  }
  for (const s of [-1, 1]) {
    kit.box("paintedMetal", cx + s * (max[0] - min[0]) * 0.42, h / 2, max[2] - 0.1, 0.12, h - 0.4, 0.1, { color: PALETTE.impBlack, texel: 2 });
    kit.box("lift_streak", cx + s * (max[0] - min[0]) * 0.42, h / 2, max[2] - 0.152, 0.05, h - 0.6, 0.01, { uv: "keep" });
    const x = s < 0 ? min[0] + 0.03 : max[0] - 0.03;
    kit.box("paintedMetal", x, h / 2, cz, 0.06, h - 0.5, 0.16, { color: PALETTE.impBlack, texel: 2 });
    kit.box("lift_streak", x + (s < 0 ? 0.035 : -0.035), h / 2, cz, 0.01, h - 0.7, 0.06, { uv: "keep" });
  }
  // deck readout (this cab's deck) and the call panel on the rear wall: the current deck's button is
  // lit amber, the others blue
  const u = (max[0] - min[0]) / 2;
  signPlate(kit, ctx, { side: "zmax", u, v: 2.05, w: 1.7, h: 0.34, text: `Deck ${ctx.deck.index}`, sub: ctx.deck.name, accent: "#ffb347" });
  const { frame } = wallFrame(kit, [max[0], max[2]], [min[0], max[2]], 0);
  frame.box("paintedMetal", u, 1.25, 0.04, 0.5, 0.7, 0.08, { color: PALETTE.impDark, texel: 2 });
  frame.box("impPanel", u, 1.25, 0.082, 0.42, 0.62, 0.006, { color: PALETTE.impGrey, uv: "keep" });
  for (let i = 0; i < 5; i++) {
    const y = 1.5 - i * 0.12;
    frame.box("rubber", u - 0.12, y, 0.09, 0.08, 0.06, 0.02, { color: PALETTE.rubber });
    frame.box(i === ctx.deck.index - 1 ? "emitAmber" : "emitBlueDim", u + 0.08, y, 0.088, 0.14, 0.03, 0.008);
  }
  frame.box("leds", u, 1.0, 0.088, 0.3, 0.03, 0.008, { uv: "keep" });
  // handrail on the side walls
  for (const s of [-1, 1]) {
    const x = s < 0 ? min[0] + 0.08 : max[0] - 0.08;
    kit.cyl("metal", x, 1.0, cz, 0.02, max[2] - min[2] - 0.6, "z", { color: PALETTE.steel, segments: 10 });
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
      }
      const text = inCab ? `TURBOLIFT — press a deck number:  ${interior.decks.map((d) => `${d.def.index} ${d.def.name}`).join("   ")}` : null;
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
      if (streak) {
        streak.emissiveIntensity = 2.6 + 1.6 * Math.min(1, this.timer * 1.5);
        streak.emissiveMap.offset.y -= dt * 6;
      }
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
        if (interior.materials.lift_streak) interior.materials.lift_streak.emissiveIntensity = 2.6;
        this.audio.event("lift_arrive", dest);
        this.hud.setStatus(`${interior.deckById(this.to).def.name}.`);
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
