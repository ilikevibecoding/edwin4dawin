// Turbolift network runtime: door leaves + indicator lamps (two InstancedMeshes for every cabin on the
// ship), the per-cabin door state machine, the deck picker, the ride theatre and the public API.
// Every timer is a `t` deadline (module clock from update(dt, t)); nothing here uses wall-clock time.
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { setVertexColor, worldUVs } from "../../kit.js";
import { G } from "./cabin.js";

export const TIMING = {
  doorEase: 0.6, // s, door open/close
  closeDelay: 1.5, // s after the player is clear
  near: 2.4, // m from the door centre (lobby side) that opens the doors
  pickWindow: 8, // s the deck picker listens for 1–4
  faultBeat: 1.4, // s doors stay shut before "Deck N unavailable"
  hold: 2.0, // s a call / arrival holds the doors open
  rideMin: 3, // s transit to an adjacent deck
  ridePerDeck: 1.5, // s added per extra deck travelled
  rideMax: 6, // s transit cap (contract: rides last 3–6 s)
};

// lamp slots per cabin
const L = { btn0: 0, seg0: 4, ready: 11, transit: 12, lintelSeg0: 13, up0: 20, down0: 22, call: 24, callInd: 25, header: 26, strip: 27, bar0: 28, count: 34 };
const SEGS = "abcdefg";
const DIGITS = { 0: "abcdef", 1: "bc", 2: "abged", 3: "abgcd", 4: "fgbc", 5: "afgcd", 6: "afgedc", 7: "abc", 8: "abcdefg", 9: "abcdfg", "-": "g" };
// linear HDR lamp colours (bloom threshold is 1.15, so lit lamps sit well above it)
const COLORS = {
  off: [0.045, 0.05, 0.06],
  blue: [0.3, 0.62, 1.9], // kept below the tone-mapper's white point so it stays blue, not cyan-white
  white: [2.0, 2.2, 2.4],
  amber: [2.4, 1.3, 0.28],
  red: [2.2, 0.26, 0.18],
  green: [0.5, 1.8, 0.9],
  dimWhite: [0.3, 0.33, 0.38],
  dimRed: [0.34, 0.06, 0.05],
};
const smooth = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
const finiteOrNull = (v) => (Number.isFinite(v) ? v : null);
const orNegInf = (v) => (typeof v === "number" ? v : -Infinity);

const _m = new THREE.Matrix4();
const _p = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _s = new THREE.Vector3();
const ONE = new THREE.Vector3(1, 1, 1);
const Y_PI = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI);

// One door leaf in leaf-local space: x from the meeting edge outward, y up from the sill, z through
// the leaf. Detail on both faces so the left leaf is the same geometry turned 180° about y.
export function buildLeafGeometry(C) {
  const parts = [];
  const add = (cx, cy, cz, sx, sy, sz, color) => {
    const g = new THREE.BoxGeometry(sx, sy, sz).toNonIndexed();
    g.translate(cx, cy, cz);
    worldUVs(g, 1.0);
    setVertexColor(g, color);
    parts.push(g);
  };
  const W = G.leafW;
  const H = G.doorH - 0.02;
  const T = G.leafT;
  add(W / 2, H / 2, 0, W, H, T - 0.04, C.impBlack); // core (shows in the seams)
  for (const s of [-1, 1]) {
    const z = s * (T / 2 - 0.01);
    const x0 = 0.035; // dark meeting edge
    const x1 = W;
    for (const [y0, y1] of [
      [0.32, 1.0],
      [1.03, 2.1],
      [2.13, H],
    ]) {
      add((x0 + x1) / 2, (y0 + y1) / 2, z, x1 - x0, y1 - y0, 0.02, C.impGrey);
    }
    add((x0 + x1) / 2, 0.155, s * (T / 2 - 0.015), x1 - x0, 0.29, 0.02, C.impMid); // kick, recessed 5 mm
    add(x0 + 0.12, 1.565, s * (T / 2 + 0.002), 0.05, 1.3, 0.006, C.impBlack); // slim grip channel by the meeting edge
    add(x0 + 0.12, 1.565, s * (T / 2 + 0.006), 0.012, 1.3, 0.006, C.impMid); // its inner rib
  }
  const geo = mergeGeometries(parts, false);
  geo.computeBoundingSphere();
  return geo;
}

export class LiftNetwork {
  constructor(ctx, cabins) {
    this.ctx = ctx;
    this.cabins = cabins;
    this.byId = new Map(cabins.map((c) => [c.id, c]));
    this.byDeck = new Map();
    for (const c of cabins) if (!this.byDeck.has(c.deck)) this.byDeck.set(c.deck, c);
    this.t = 0;
    this.lastT = null;
    this.ride = null;
    this.listen = null;
    this.lastArrival = null;
    this.loop = null;
    this.colliders = [];
    this.faces = [];
    this.interactables = [];
    const mats = ctx.materials;
    const C = ctx.PALETTE;
    const n = cabins.length;

    // ---- door leaves ----------------------------------------------------------------------------
    this.leaves = new THREE.InstancedMesh(buildLeafGeometry(C), mats.liftLeaf, n * 2);
    this.leaves.name = "lift_leaves";
    this.leaves.frustumCulled = false;
    this.leaves.castShadow = true;
    this.leaves.receiveShadow = true;
    ctx.group.add(this.leaves);

    // ---- lamps (buttons, digits, chevrons, status strips, ride sweep bars) --------------------------
    const lampCount = n * L.count;
    this.lamps = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), mats.liftLamp, lampCount);
    this.lamps.name = "lift_lamps";
    this.lamps.frustumCulled = false;
    this.lamps.castShadow = false;
    this.lamps.receiveShadow = false;
    this.lampColor = new Float32Array(lampCount * 3);
    this.lamps.instanceColor = new THREE.InstancedBufferAttribute(this.lampColor, 3);
    ctx.group.add(this.lamps);

    cabins.forEach((cab, ci) => {
      cab.index = ci;
      cab.door = { from: 0, to: 0, t0: 0 };
      cab.open = 0;
      cab.holdUntil = -Infinity;
      cab.lastNear = -Infinity;
      cab.callT = -Infinity;
      cab.fault = null;
      cab.playerInside = false;
      cab.dist = Infinity;
      this.placeLamps(cab);
      for (let k = 0; k < 2; k++) this.colliders.push({ min: new THREE.Vector3(), max: new THREE.Vector3(), tag: "lift-door" });
      // interactable faces: real meshes with their own material so the hover tint shows
      const callFace = this.makeFace(cab.frames.lobby, G.callA, G.callU, 0.069, 0.3, 0.44, mats.liftFace);
      callFace.name = `lift_${cab.id}_call`;
      const panelFace = this.makeFace(cab.frames.rWall, G.panelD, 1.17, 0.079, 0.3, 0.54, mats.liftFace);
      panelFace.name = `lift_${cab.id}_panel`;
      cab.faces = [callFace, panelFace];
      this.interactables.push(
        { id: `lift-${cab.id}-call`, key: "E", label: "Call turbolift", object: callFace, material: callFace.material, action: async () => this.call(cab.id) },
        { id: `lift-${cab.id}-panel`, key: "E", label: "Select deck", object: panelFace, material: panelFace.material, action: async () => this.select(cab.id) },
      );
    });
    this.update(0, 0);
  }

  makeFace(frame, a, b, nOff, w, h, template) {
    const mat = template.clone();
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.008), mat);
    mesh.position.copy(frame.pos(a, b, nOff));
    mesh.quaternion.copy(frame.quat());
    mesh.castShadow = false;
    mesh.receiveShadow = true;
    this.ctx.group.add(mesh);
    this.faces.push(mesh);
    return mesh;
  }

  // ---- lamp placement (static matrices; only colours and the sweep bars change per frame) ----------
  lamp(i, frame, a, b, nOff, sx, sy, sz, rot = 0) {
    const p = frame.pos(a, b, nOff);
    const q = rot ? frame.spinQuat(rot) : frame.quat();
    _m.compose(p, q, _s.set(sx, sy, sz));
    this.lamps.setMatrixAt(i, _m);
  }
  sevenSeg(base, frame, a, b, nOff, W, H, th, depth) {
    const hl = W - 2 * th; // horizontal segment length
    const vl = H / 2 - 1.5 * th; // vertical segment length
    const put = (k, da, db, sx, sy) => this.lamp(base + k, frame, a + da, b + db, nOff, sx, sy, depth);
    put(0, 0, H / 2 - th / 2, hl, th); // a
    put(1, W / 2 - th / 2, H / 4, th, vl); // b
    put(2, W / 2 - th / 2, -H / 4, th, vl); // c
    put(3, 0, -H / 2 + th / 2, hl, th); // d
    put(4, -W / 2 + th / 2, -H / 4, th, vl); // e
    put(5, -W / 2 + th / 2, H / 4, th, vl); // f
    put(6, 0, 0, hl, th); // g
  }
  chevron(base, frame, a, b, nOff, up) {
    const len = 0.1;
    const th = 0.018;
    const s = up ? 1 : -1;
    this.lamp(base, frame, a - 0.032, b, nOff, len, th, 0.006, s * Math.PI / 4);
    this.lamp(base + 1, frame, a + 0.032, b, nOff, len, th, 0.006, -s * Math.PI / 4);
  }
  placeLamps(cab) {
    const base = cab.index * L.count;
    const fr = cab.frames;
    for (let k = 0; k < 4; k++) this.lamp(base + L.btn0 + k, fr.rWall, G.panelD - 0.1, 1.36 - k * 0.1, 0.089, 0.05, 0.05, 0.012);
    this.sevenSeg(base + L.seg0, fr.rWall, G.panelD + 0.06, 1.3, 0.087, 0.07, 0.12, 0.013, 0.006);
    this.lamp(base + L.ready, fr.rWall, G.panelD + 0.06, 1.15, 0.087, 0.07, 0.018, 0.006);
    this.lamp(base + L.transit, fr.rWall, G.panelD + 0.06, 1.11, 0.087, 0.07, 0.018, 0.006);
    const lintelB = G.lintelU + 0.15;
    const hoodN = G.hoodD - G.wallT + 0.005; // 4 mm proud of the hood's black face plate
    this.sevenSeg(base + L.lintelSeg0, fr.lobby, 0, lintelB, hoodN, 0.13, 0.2, 0.022, 0.006);
    this.chevron(base + L.up0, fr.lobby, -0.34, lintelB, hoodN, true);
    this.chevron(base + L.down0, fr.lobby, 0.34, lintelB, hoodN, false);
    this.lamp(base + L.call, fr.lobby, G.callA, G.callU - 0.01, 0.079, 0.09, 0.09, 0.012);
    this.lamp(base + L.callInd, fr.lobby, G.callA, G.callU + 0.1, 0.077, 0.14, 0.02, 0.008);
    this.lamp(base + L.header, fr.frontInner, 0, G.clearH + 0.03, 0.07, 0.5, 0.016, 0.008);
    this.lamp(base + L.strip, fr.lobby, 0, G.doorH + 0.05, 0.112, 1.0, 0.02, 0.006);
    for (let k = 0; k < 6; k++) this.hideLamp(base + L.bar0 + k);
  }
  hideLamp(i) {
    _m.makeScale(0, 0, 0);
    this.lamps.setMatrixAt(i, _m);
  }
  setColor(i, c, k = 1) {
    const a = this.lampColor;
    a[i * 3] = c[0] * k;
    a[i * 3 + 1] = c[1] * k;
    a[i * 3 + 2] = c[2] * k;
  }
  setDigit(base, ch, c, k = 1) {
    const on = DIGITS[ch] || "";
    for (let s = 0; s < 7; s++) this.setColor(base + s, on.includes(SEGS[s]) ? c : COLORS.off, on.includes(SEGS[s]) ? k : 1);
  }

  // ---- geometry helpers --------------------------------------------------------------------------
  inside(cab, p) {
    const l = cab.local(p);
    return Math.abs(l.r) < G.halfBox && l.d > -0.05 && l.d < G.depth && l.u > -0.6 && l.u < G.boxH;
  }
  nearLobby(cab, p) {
    const l = cab.local(p);
    return l.d <= 0 && Math.hypot(l.r, l.d) < TIMING.near && l.u > -0.6 && l.u < G.boxH;
  }
  cabinForPlayer() {
    const p = this.ctx.player && this.ctx.player.position;
    if (!p) return this.cabins[0] || null;
    let best = null;
    let bestD = Infinity;
    for (const cab of this.cabins) {
      if (this.inside(cab, p)) return cab;
      const d = cab.pos.distanceTo(p);
      if (d < bestD) {
        bestD = d;
        best = cab;
      }
    }
    return best;
  }

  // ---- doors -------------------------------------------------------------------------------------
  doorValue(cab, t) {
    const k = smooth((t - cab.door.t0) / TIMING.doorEase);
    return cab.door.from + (cab.door.to - cab.door.from) * k;
  }
  setDoor(cab, target, t) {
    if (cab.door.to === target) return;
    cab.door.from = this.doorValue(cab, t);
    cab.door.to = target;
    cab.door.t0 = t;
    const audio = this.ctx.audio;
    if (audio && audio.play) audio.play(target ? "door-open" : "door-close", cab.pos.toArray());
  }

  // ---- public actions -----------------------------------------------------------------------------
  /** Call panel: open the doors and hold them. */
  call(cabinId) {
    const cab = this.byId.get(cabinId) || this.cabinForPlayer();
    if (!cab) return false;
    const t = this.t;
    if (this.ride && (this.ride.cabinFrom === cab.id || this.ride.cabinTo === cab.id)) return false;
    if (cab.fault) return false;
    cab.holdUntil = t + TIMING.hold + 0.5;
    cab.lastNear = t;
    cab.callT = t;
    this.setDoor(cab, 1, t);
    const audio = this.ctx.audio;
    if (audio && audio.play) audio.play("lift-arrive", cab.pos.toArray());
    return true;
  }
  /** Deck-select panel: HUD picker, listen for Digit1–4 / Numpad1–4 until a `t` deadline. */
  select(cabinId) {
    const cab = this.byId.get(cabinId) || this.cabinForPlayer();
    if (!cab || this.ride || cab.fault) return false;
    this.stopListening();
    this.status("Turbolift — press 1–4 for deck");
    const handler = (e) => {
      const m = /^(?:Digit|Numpad)([1-4])$/.exec(e.code || "");
      if (!m) return;
      this.stopListening();
      this.callTo(Number(m[1]), cab.id);
    };
    if (typeof document !== "undefined") document.addEventListener("keydown", handler);
    this.listen = { cabinId: cab.id, until: this.t + TIMING.pickWindow, handler };
    return true;
  }
  stopListening(timedOut = false) {
    if (!this.listen) return;
    if (typeof document !== "undefined") document.removeEventListener("keydown", this.listen.handler);
    this.listen = null;
    if (timedOut) this.status("Turbolift — no deck selected");
  }
  /** Ride the cabin the player is in (or the given / nearest one) to `deck`. */
  callTo(deck, cabinId = null) {
    deck = Number(deck);
    if (!(deck >= 1)) return false;
    if (this.ride) return false;
    const cab = (cabinId && this.byId.get(cabinId)) || this.cabinForPlayer();
    if (!cab || cab.fault) return false;
    const t = this.t;
    this.stopListening();
    if (deck === cab.deck) {
      cab.holdUntil = t + TIMING.hold;
      cab.lastNear = t;
      this.setDoor(cab, 1, t);
      this.status(`Deck ${deck} — ${cab.name}`);
      return true;
    }
    const target = this.byDeck.get(deck);
    if (!target) {
      // no lobby on that deck yet: shut, think, apologise, reopen (all on the module clock)
      cab.fault = { deck, t0: t };
      cab.lastNear = t;
      this.setDoor(cab, 0, t);
      this.status(`Turbolift — deck ${deck} requested`);
      return false;
    }
    const secs = Math.min(TIMING.rideMax, TIMING.rideMin + TIMING.ridePerDeck * (Math.abs(deck - cab.deck) - 1)); // 3 s adjacent, 4.5 s, 6 s for three decks
    this.ride = { from: cab.deck, to: deck, t0: t, duration: TIMING.doorEase + secs, cabinFrom: cab.id, cabinTo: target.id, transit: false };
    this.setDoor(cab, 0, t);
    this.status("Turbolift — doors closing");
    return true;
  }
  status(text) {
    const hud = this.ctx.hud;
    if (hud && hud.setStatus) hud.setStatus(text);
  }

  // ---- ride ---------------------------------------------------------------------------------------
  updateRide(t) {
    const r = this.ride;
    if (!r.transit && t >= r.t0 + TIMING.doorEase) {
      r.transit = true;
      r.transitStart = t;
      this.status("Turbolift in transit");
      const audio = this.ctx.audio;
      const from = this.byId.get(r.cabinFrom);
      if (audio && audio.loop) this.loop = audio.loop("lift-ride", from ? from.pos.toArray() : undefined);
      const pl = this.ctx.player;
      if (pl && typeof pl.shake === "function") pl.shake(0.02, 3);
    }
    if (t >= r.t0 + r.duration) this.arrive(t);
  }
  arrive(t) {
    const r = this.ride;
    const from = this.byId.get(r.cabinFrom);
    const to = this.byId.get(r.cabinTo);
    if (this.loop && this.loop.stop) this.loop.stop();
    this.loop = null;
    const pl = this.ctx.player;
    const p = pl && pl.position;
    // only riders travel: the theatre (doors, lamps) plays either way
    if (to && p && from && this.inside(from, p)) {
      const tp = this.ctx.teleport;
      if (typeof tp === "function") {
        try {
          if (to.roomId && this.ctx.world && this.ctx.world.rooms && this.ctx.world.rooms.has(to.roomId)) tp(to.roomId);
        } catch (e) {
          console.warn("[lifts] teleport(roomId) failed:", e);
        }
        tp({ pos: [to.spawn.x, to.spawn.y, to.spawn.z], yaw: to.yaw });
      }
    }
    if (to) {
      this.setDoor(to, 1, t);
      to.holdUntil = t + TIMING.hold + 0.5;
      to.lastNear = t;
      const audio = this.ctx.audio;
      if (audio && audio.play) audio.play("lift-arrive", to.pos.toArray());
      this.status(`Deck ${to.deck} — ${to.name}`);
    }
    if (pl && typeof pl.shake === "function") pl.shake(0.012, 0.5);
    this.lastArrival = { cabinId: r.cabinTo, t, up: r.to < r.from };
    this.ride = null;
  }

  // ---- per frame ----------------------------------------------------------------------------------
  shiftTime(delta) {
    for (const cab of this.cabins) {
      cab.door.t0 += delta;
      cab.holdUntil += delta;
      cab.lastNear += delta;
      cab.callT += delta;
      if (cab.fault) cab.fault.t0 += delta;
    }
    if (this.ride) {
      this.ride.t0 += delta;
      if (this.ride.transitStart !== undefined) this.ride.transitStart += delta;
    }
    if (this.listen) this.listen.until += delta;
    if (this.lastArrival) this.lastArrival.t += delta;
  }

  update(dt, t) {
    if (this.lastT !== null && t < this.lastT - 1e-6) this.shiftTime(t - this.lastT); // harness rewound the clock
    this.lastT = t;
    this.t = t;
    const pl = this.ctx.player;
    const p = pl && pl.position;
    if (this.listen) {
      const cab = this.byId.get(this.listen.cabinId);
      if (t > this.listen.until) this.stopListening(true);
      else if (cab && p && !this.inside(cab, p)) this.stopListening(false);
    }
    if (this.ride) this.updateRide(t);
    const ride = this.ride;
    const blink = 0.55 + 0.45 * Math.sin(t * 9);
    const slowBlink = 0.5 + 0.5 * Math.sin(t * 4);

    for (const cab of this.cabins) {
      const base = cab.index * L.count;
      cab.playerInside = p ? this.inside(cab, p) : false;
      const near = p ? this.nearLobby(cab, p) : false;
      cab.dist = p ? cab.pos.distanceTo(p) : Infinity;
      const inRide = ride && (ride.cabinFrom === cab.id || ride.cabinTo === cab.id);

      // door target
      if (cab.fault) {
        this.setDoor(cab, 0, t);
        if (t >= cab.fault.t0 + TIMING.faultBeat) {
          this.status(`Deck ${cab.fault.deck} unavailable`);
          cab.fault = null;
          cab.holdUntil = t + TIMING.hold;
          cab.lastNear = t;
          this.setDoor(cab, 1, t);
        }
      } else if (inRide) {
        this.setDoor(cab, 0, t);
      } else {
        const want = cab.playerInside || near || t < cab.holdUntil;
        if (want) {
          cab.lastNear = t;
          this.setDoor(cab, 1, t);
        } else if (t - cab.lastNear > TIMING.closeDelay) this.setDoor(cab, 0, t);
      }
      cab.open = this.doorValue(cab, t);
      const moving = Math.abs(cab.open - cab.door.to) > 0.01;

      // leaves + colliders
      const x = cab.open * G.leafTravel;
      _q.setFromRotationMatrix(cab.basis);
      _m.compose(cab.P(x, 0.025, G.leafD), _q, ONE);
      this.leaves.setMatrixAt(cab.index * 2, _m);
      _m.compose(cab.P(-x, 0.025, G.leafD), _q.multiply(Y_PI), ONE);
      this.leaves.setMatrixAt(cab.index * 2 + 1, _m);
      const cr = this.colliders[cab.index * 2];
      const cl = this.colliders[cab.index * 2 + 1];
      let bb = cab.aabb(x, 0, G.leafD - G.leafT / 2, x + G.leafW, G.doorH, G.leafD + G.leafT / 2);
      cr.min.fromArray(bb.min);
      cr.max.fromArray(bb.max);
      bb = cab.aabb(-x - G.leafW, 0, G.leafD - G.leafT / 2, -x, G.doorH, G.leafD + G.leafT / 2);
      cl.min.fromArray(bb.min);
      cl.max.fromArray(bb.max);

      // ---- lamps ----
      const rideProg = ride && ride.transit ? Math.min(1, Math.max(0, (t - (ride.t0 + TIMING.doorEase)) / (ride.duration - TIMING.doorEase))) : 0;
      const deckNow = inRide ? Math.round(ride.from + (ride.to - ride.from) * rideProg) : cab.deck;
      const arriving = this.lastArrival && this.lastArrival.cabinId === cab.id && t - this.lastArrival.t < 2.5;
      const picking = this.listen && this.listen.cabinId === cab.id;
      for (let k = 0; k < 4; k++) {
        const deck = k + 1;
        let c = COLORS.dimWhite;
        let kk = 1;
        if (cab.fault && cab.fault.deck === deck) {
          c = COLORS.red;
          kk = blink;
        } else if (inRide && ride.to === deck) {
          c = COLORS.amber;
          kk = 0.6 + 0.4 * blink;
        } else if (deck === cab.deck) c = COLORS.blue;
        else if (!this.byDeck.has(deck)) c = COLORS.dimRed;
        else if (picking) {
          c = COLORS.white;
          kk = 0.5 + 0.5 * slowBlink;
        }
        this.setColor(base + L.btn0 + k, c, kk);
      }
      if (cab.fault) this.setDigit(base + L.seg0, "-", COLORS.red, blink);
      else this.setDigit(base + L.seg0, String(deckNow), inRide ? COLORS.amber : COLORS.blue);
      this.setColor(base + L.ready, cab.open > 0.5 && !inRide ? COLORS.green : COLORS.off);
      this.setColor(base + L.transit, inRide && ride.transit ? COLORS.amber : picking ? COLORS.white : COLORS.off, inRide ? blink : 1);
      // lintel: digit + travel chevrons
      this.setDigit(base + L.lintelSeg0, String(deckNow), inRide ? COLORS.amber : COLORS.blue);
      const goingUp = inRide ? ride.to < ride.from : arriving ? this.lastArrival.up : null;
      const upOn = goingUp === true && (inRide || arriving);
      const downOn = goingUp === false && (inRide || arriving);
      const chevK = arriving ? blink : 0.7 + 0.3 * slowBlink;
      this.setColor(base + L.up0, upOn ? COLORS.blue : COLORS.off, upOn ? chevK : 1);
      this.setColor(base + L.up0 + 1, upOn ? COLORS.blue : COLORS.off, upOn ? chevK : 1);
      this.setColor(base + L.down0, downOn ? COLORS.blue : COLORS.off, downOn ? chevK : 1);
      this.setColor(base + L.down0 + 1, downOn ? COLORS.blue : COLORS.off, downOn ? chevK : 1);
      // call panel
      const called = t - cab.callT < TIMING.hold;
      this.setColor(base + L.call, called ? COLORS.amber : inRide ? COLORS.red : COLORS.blue, called ? 0.6 + 0.4 * blink : 1);
      this.setColor(base + L.callInd, inRide ? COLORS.red : cab.open > 0.5 ? COLORS.green : moving ? COLORS.amber : COLORS.off, moving && !inRide ? blink : 1);
      // inside header + lobby lintel strip: white open, amber moving, red riding/faulted
      const stripC = inRide || cab.fault ? COLORS.red : moving ? COLORS.amber : cab.open > 0.5 ? COLORS.white : COLORS.blue;
      this.setColor(base + L.header, stripC, moving ? 0.6 + 0.4 * blink : 1);
      this.setColor(base + L.strip, stripC, moving ? 0.6 + 0.4 * blink : 1);

      // ---- ride sweep: two rings of light running along the three walls + the cabin light follows ----
      const light = cab.light;
      if (inRide && ride.transit && ride.cabinFrom === cab.id) {
        const per = 0.9;
        const up = ride.to < ride.from; // cabin rises -> passing lights run down the walls
        let envSum = 0;
        let uMean = 0;
        for (let ring = 0; ring < 2; ring++) {
          let ph = ((t - ride.transitStart) / per + ring * 0.5) % 1;
          if (ph < 0) ph += 1;
          const u = up ? G.ceil - ph * (G.ceil - 0.1) : 0.1 + ph * (G.ceil - 0.1);
          const env = Math.sin(Math.PI * ph);
          envSum += env;
          uMean += u * env;
          const k = 0.4 + 2.6 * env;
          const bi = base + L.bar0 + ring * 3;
          this.lamp(bi, cab.frames.back, 0, u, 0.02, G.halfIn * 2 - 0.3, 0.035, 0.012);
          this.lamp(bi + 1, cab.frames.rWall, (G.inD0 + G.inD1) / 2, u, 0.02, G.inD1 - G.inD0 - 0.3, 0.035, 0.012);
          this.lamp(bi + 2, cab.frames.lWall, (G.inD0 + G.inD1) / 2, u, 0.02, G.inD1 - G.inD0 - 0.3, 0.035, 0.012);
          for (let j = 0; j < 3; j++) this.setColor(bi + j, COLORS.blue, k);
        }
        if (light) {
          const u = envSum > 0 ? uMean / envSum : 1.5;
          const lp = cab.P(0, u, 2.0);
          light.pos[0] = lp.x;
          light.pos[1] = lp.y;
          light.pos[2] = lp.z;
          light.color = 0xa9c6ff;
          light.intensity = 5 + 9 * (0.5 + 0.5 * Math.sin((t - ride.transitStart) * (Math.PI * 2) / per));
        }
      } else {
        for (let k = 0; k < 6; k++) {
          this.hideLamp(base + L.bar0 + k);
          this.setColor(base + L.bar0 + k, COLORS.off);
        }
        if (light) {
          light.pos[0] = cab.lightBase.pos[0];
          light.pos[1] = cab.lightBase.pos[1];
          light.pos[2] = cab.lightBase.pos[2];
          light.color = cab.lightBase.color;
          light.intensity = cab.lightBase.intensity;
        }
      }
      if (light) light.priority = cab.dist < 14 ? 0.9 : 0.05;
      const showFaces = cab.dist < 40;
      for (const f of cab.faces) f.visible = showFaces;
    }
    this.leaves.instanceMatrix.needsUpdate = true;
    this.lamps.instanceMatrix.needsUpdate = true;
    this.lamps.instanceColor.needsUpdate = true;
  }

  // ---- API ------------------------------------------------------------------------------------------
  state() {
    const cabins = {};
    for (const cab of this.cabins) {
      cabins[cab.id] = {
        deck: cab.deck,
        doorsOpen: +cab.open.toFixed(3),
        riding: !!(this.ride && (this.ride.cabinFrom === cab.id || this.ride.cabinTo === cab.id)),
      };
    }
    const r = this.ride;
    return { cabins, currentRide: r ? { from: r.from, to: r.to, t0: r.t0, duration: r.duration } : null };
  }
  serialize() {
    const cabins = {};
    for (const cab of this.cabins) {
      cabins[cab.id] = {
        door: { from: cab.door.from, to: cab.door.to, t0: cab.door.t0 },
        holdUntil: finiteOrNull(cab.holdUntil),
        lastNear: finiteOrNull(cab.lastNear),
        callT: finiteOrNull(cab.callT),
        fault: cab.fault ? { deck: cab.fault.deck, t0: cab.fault.t0 } : null,
      };
    }
    const r = this.ride;
    return {
      v: 1,
      t: this.t,
      cabins,
      ride: r ? { from: r.from, to: r.to, t0: r.t0, duration: r.duration, cabinFrom: r.cabinFrom, cabinTo: r.cabinTo, transit: !!r.transit, transitStart: finiteOrNull(r.transitStart) } : null,
      lastArrival: this.lastArrival ? { ...this.lastArrival } : null,
    };
  }
  apply(s) {
    if (!s || typeof s !== "object") return false;
    const shift = typeof s.t === "number" ? this.t - s.t : 0;
    for (const cab of this.cabins) {
      const c = s.cabins && s.cabins[cab.id];
      if (!c) continue;
      if (c.door) cab.door = { from: +c.door.from || 0, to: +c.door.to || 0, t0: (+c.door.t0 || 0) + shift };
      cab.holdUntil = orNegInf(c.holdUntil) + shift;
      cab.lastNear = orNegInf(c.lastNear) + shift;
      cab.callT = orNegInf(c.callT) + shift;
      cab.fault = c.fault ? { deck: c.fault.deck, t0: c.fault.t0 + shift } : null;
    }
    if (this.loop && this.loop.stop) this.loop.stop();
    this.loop = null;
    if (s.ride && this.byId.has(s.ride.cabinFrom) && this.byId.has(s.ride.cabinTo)) {
      const r = s.ride;
      this.ride = { from: r.from, to: r.to, t0: r.t0 + shift, duration: r.duration, cabinFrom: r.cabinFrom, cabinTo: r.cabinTo, transit: !!r.transit };
      if (r.transit) {
        this.ride.transitStart = (typeof r.transitStart === "number" ? r.transitStart : r.t0 + TIMING.doorEase) + shift;
        const audio = this.ctx.audio;
        const from = this.byId.get(r.cabinFrom);
        if (audio && audio.loop) this.loop = audio.loop("lift-ride", from ? from.pos.toArray() : undefined);
      }
    } else this.ride = null;
    this.lastArrival = s.lastArrival ? { ...s.lastArrival, t: s.lastArrival.t + shift } : null;
    this.update(0, this.t);
    return true;
  }
  api() {
    return {
      callTo: (deck, cabinId) => this.callTo(deck, cabinId),
      call: (cabinId) => this.call(cabinId),
      select: (cabinId) => this.select(cabinId),
      cabins: () => this.cabins.map((c) => ({ id: c.id, deck: c.deck, roomId: c.roomId, name: c.name, pos: c.pos.toArray(), dir: c.F.toArray(), spawn: c.spawn.toArray(), yaw: c.yaw })),
      state: () => this.state(),
      serialize: () => this.serialize(),
      apply: (s) => this.apply(s),
    };
  }
  dispose() {
    this.stopListening();
    if (this.loop && this.loop.stop) this.loop.stop();
    this.loop = null;
    this.ctx.group.remove(this.leaves, this.lamps, ...this.faces);
    this.leaves.geometry.dispose();
    this.lamps.geometry.dispose();
    for (const f of this.faces) {
      f.geometry.dispose();
      f.material.dispose();
    }
  }
}
