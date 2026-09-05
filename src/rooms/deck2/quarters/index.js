// Deck 2 crew quarters: a 3 m central aisle with five berthing bays a side (two facing 3-tier stacks
// each = 60 bunks), locker/desk units between bays, a washroom alcove at the far end (basins,
// showers, laundry) and a duty-officer desk by the door. Neutral grey, warm white (§11).
// Door: aft wall at x −22 (standard).
import { defineRoom } from "../_shared/room.js";
import { IMP } from "../_shared/palette.js";
import { console as consoleProp, wallScreen, cabinet, table, pipe, duct, crate } from "../_shared/props.js";
import { vent, junctionBox, bunk, foldDesk, bootRack, laundryCart, noticeBoard, kitShelf, washCounter, handDryer, showers, washer, foldTable, wallBench, hookRail, footLocker, extinguisher, holoTable, wallCabinet, towelRack, duffel, lockerPair, mouthCurtain, wetFloorKit, barLight, BEDDING } from "./props.js";

const Y = 40;
const CEIL = 44.6;
const X0 = -33;
const X1 = -11;
const Z0 = 340;
const Z1 = 372.5;
const CX = -22;
const W = 0.34;
const wx0 = X0 + W;
const wx1 = X1 - W;
const wz0 = Z0 + W;
const wz1 = Z1 - W;
const GREY = IMP.impGrey;
const DARK = IMP.impDark;
const BLACK = IMP.impBlack;
const STEEL = IMP.steel;
// One Imperial screen layout (text columns / rosters) on every screen in the room, drawn with a single
// live clone of screenImp2 that carries the duty desk's 8 Hz refresh jitter. The room's 16 draw calls
// are otherwise spent on the breathing night-light circuit, one faulty reading lamp and the washroom's
// polished-steel mirror material, so a second static screen key is not affordable.
const SCR = "emitScreenLive";
// animated emitter keys (clones registered in detail(); "emit" prefix keeps them out of shadow casting)
const AMBER_BR = "emitAmberBreathe";
const WARM_FLK = "emitWarmFlicker";
// polished steel for the washroom mirrors: a metallic, low-roughness clone of darkGloss that reflects the
// rig's captured environment (the shared darkGloss is a 20 % metal and only ever showed the lights)
const MIRROR = "mirrorSteel";
const FIX = "emitWarmSoft"; // housed fixture diffuser (uv "keep")
const FIX_STEM = 0.5; // suspended fixtures hug the ceiling: emitter at CEIL − 0.625
const FILL_Y = CEIL - 2.2; // fills 1.6 m under the emitters, 2.4 m above the deck (floors carry the room under the captured env)
const WALL = 0x82868d; // shell walls one step under impGrey (−16 % albedo) so the key does not push the bay walls to clip

const MOUTH = 2.6; // half-width of the nave (mouth lines at x −24.6 / −19.4); fascias sit aisle-side of it
const PANEL = 3.15; // slot-mouth panel plane (0.1 thick, aisle face at ±3.1)
const SOFFIT_Y = Y + 3.0;
const WASH_Z = 344.6; // washroom partition (0.1 thick)
const MOD0 = 344.7; // first slot starts here
const SLOT = 2.0;
const BAY = 3.1;
const MOD = SLOT + BAY;
const N_MOD = 5;
const END_Z = MOD0 + N_MOD * MOD; // 370.2: final divider

// per-module dressing so no two bays read as mirrored copies: locker body colour + door states,
// stool position, an optional privacy curtain across part of the mouth, a cleaning kit, a lit locker.
// Seen from the door, bay 3 port is closed off by a drawn brown curtain and slot 4 starboard has an
// open locker with its interior lamp spilling onto the aisle (the two nearest modules differ most).
const DRESS = {
  "-1": [
    { color: GREY, doors: ["closed", "closed"], stool: "in" },
    { color: IMP.impMid, doors: ["closed", "closed"], stool: "in", curtain: { side: 0, len: 2.0, color: 0x3b4658 } },
    { color: GREY, doors: ["closed", "ajar"], stool: "none" },
    { color: IMP.impMid, doors: ["open", "closed"], stool: "in", curtain: { side: 1, len: 2.6, color: 0x564846 } },
    { color: DARK, doors: ["closed", "closed"], stool: "out" },
  ],
  "1": [
    { color: GREY, doors: ["closed", "open"], stool: "in" },
    { color: DARK, doors: ["closed", "closed"], stool: "out" },
    { color: GREY, doors: ["closed", "closed"], stool: "in", mop: true },
    { color: IMP.impMid, doors: ["closed", "closed"], stool: "in", curtain: { side: 1, len: 1.5, color: 0x4b5046 } },
    { color: IMP.impMid, doors: ["open", "closed"], stool: "none", lit: true },
  ],
};

export default defineRoom({
  id: "d2-quarters",
  name: "Crew Quarters",
  deck: 2,
  x: [X0, X1],
  z: [Z0, Z1],
  ceil: CEIL,
  spawn: { pos: [CX, Y, 370], yaw: 0 },
  // wash first: the rig captures a room's reflection environment at its first view's camera, and the
  // washroom mirrors are the one place in the room where that capture is read as a picture
  views: {
    "d2-quarters-wash": { pos: [-18.66, Y, 343.04], yaw: 45, pitch: 0 },
    "d2-quarters-door": { pos: [CX, Y, 370.6], yaw: 0, pitch: -3 },
    "d2-quarters-bunks": { pos: [-29.0, Y, 357.9], yaw: 120, pitch: 2 },
    "d2-quarters-aisle": { pos: [-22.6, Y, 346.0], yaw: 172, pitch: -2 },
  },
  shell: {
    panelW: 1.6,
    wallColor: WALL,
    wallAlt: IMP.impWhite,
    stripMat: "emitWarm",
    // deck tints: the impFloor plate map is a 0.42 paint with 0.35 metalness, so under an impMid tint its
    // diffuse albedo is ~1 % and the bay decks under the soffits (lit at a grazing 60° by the aisle
    // fills) fell to 7–13 % in the door/aisle frames; impGrey (the corridors' deck) gives them +1.4 stops.
    // The 3 m aisle strip stays a step darker (impDark, was a near-black 0x1d1f24) — it reads mostly by
    // the fills' sheen and sits at 25–35 % under them
    floor: { color: IMP.impGrey, strip: { axis: "z", width: 3.0, color: IMP.impDark, mat: "impFloor" } },
    // plain panel ceiling in mid grey (not the shell's impDark) so the fills leave soft discs around the
    // bar fixtures instead of an 8 % plane between them; lit by a row of suspended housed fixtures
    ceiling: { channels: 0, color: IMP.impMid },
    lights: false,
    doorDressing: { accent: "emitBlue" },
  },
  detail(ctx) {
    const { kit, PALETTE } = ctx;

    // ---------------------------------------------------------------- animated emitter materials
    // Cloned emissives under room-local keys: the kit merges each into its own mesh (one draw call per
    // effect, inside the room's 16) and update() drives emissiveIntensity, so the night-light pool
    // below has a visible emitter breathing with it. Base intensities come from the source materials.
    const clone = (src, key) => {
      const m = ctx.materials[src].clone();
      m.name = key;
      ctx.materials[key] = m;
      return m;
    };
    const amberMat = clone("emitAmber", AMBER_BR); // kick strips, washroom header line, washer cycle lamp
    const warmMat = clone("emitWarm", WARM_FLK); // one reading lamp in bay 2 port
    const screenMat = clone("screenImp2", SCR); // every screen in the room (duty desk refresh jitter)
    const base = { amber: amberMat.emissiveIntensity, warm: warmMat.emissiveIntensity, screen: screenMat.emissiveIntensity };
    // washroom mirrors: pale polished steel that reflects the rig's captured environment (the room).
    // Roughness 0.12 keeps the reflection legible and the lights' specular images compact; those images
    // are then kept off the plates by the fixture positions below (a metal mirror shows a bare fill as
    // a clipped rectangle otherwise). From the wash camera the plates mostly reflect the mouth opening
    // and the aisle beyond it, which the capture holds at ~15 %, so the plate gets 2× gain over unit
    // reflectance (envMapIntensity 4 against the rig's 0.5 environment gain) to read as a lit corridor
    // in the glass rather than a dark rectangle. Direct light specular is unaffected by this gain.
    const mirrorMat = clone("darkGloss", MIRROR);
    mirrorMat.color.set(0xd6dbe2);
    mirrorMat.metalness = 1.0;
    mirrorMat.roughness = 0.12;
    mirrorMat.envMapIntensity = 4.0;

    const mm = (mat, a, b, opts) => kit.boxMM(mat, [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.min(a[2], b[2])], [Math.max(a[0], b[0]), Math.max(a[1], b[1]), Math.max(a[2], b[2])], opts);
    const coll = (a, b, tag) => kit.collider([Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.min(a[2], b[2])], [Math.max(a[0], b[0]), Math.max(a[1], b[1]), Math.max(a[2], b[2])], tag);

    for (const s of [-1, 1]) {
      const wallX = CX + s * 10.66;
      const mouthX = CX + s * MOUTH;
      const faceX = mouthX - s * 0.1; // aisle face of the fascia
      const panelX = CX + s * (PANEL - 0.05); // aisle face of the slot panel
      const faceYaw = -s * (Math.PI / 2); // prop front toward the aisle
      // soffit over the bays (3.0 m) and the fascia above it along the mouth line; cove + edge strips
      mm("impPanel", [wallX, SOFFIT_Y, MOD0], [mouthX, SOFFIT_Y + 0.3, END_Z + 0.08], { color: GREY, texel: 0.5 });
      mm("paintedMetal", [mouthX, SOFFIT_Y - 0.08, MOD0 - 0.02], [faceX, CEIL, END_Z + 0.1], { color: DARK, texel: 4 });
      // clean panel plate over the fascia's aisle face (the worn-metal core alone read as mottled)
      mm("impPanel", [faceX, SOFFIT_Y + 0.08, MOD0 + 0.05], [faceX - s * 0.02, CEIL - 0.5, END_Z + 0.05], { color: DARK, texel: 0.5 });
      // edge line at the soffit level (thin, low output) — the "warm strip line" of the aisle
      mm("emitWarm", [faceX, SOFFIT_Y - 0.02, MOD0 + 0.2], [faceX - s * 0.008, SOFFIT_Y + 0.02, END_Z - 0.1]);
      // top cove: a continuous black trough with one housed 1.6 m diffuser per module (was a bare
      // 25 m strip that converged into a blown streak)
      mm("paintedMetal", [faceX, CEIL - 0.44, MOD0], [faceX - s * 0.2, CEIL - 0.3, END_Z + 0.1], { color: BLACK, texel: 4 });
      for (let k = 0; k < N_MOD; k++) {
        const zc = MOD0 + k * MOD + MOD / 2;
        kit.box(FIX, faceX - s * 0.1, CEIL - 0.446, zc, 0.12, 0.012, 1.6, { uv: "keep" });
      }
      duct(kit, PALETTE, [faceX - s * 0.26, Y + 3.9, MOD0 + 0.3], [faceX - s * 0.26, Y + 3.9, END_Z - 0.2], 0.44, 0.34, { color: IMP.impMid });
      // corner post closing the soffit / fascia end at the aft strip
      kit.box("paintedMetal", mouthX - s * 0.03, (Y + CEIL) / 2, END_Z + 0.05, 0.16, CEIL - Y, 0.16, { color: DARK, texel: 4 });
      // floor night-light along the mouth line (aisle side)
      mm(AMBER_BR, [mouthX - s * 0.03, Y, MOD0], [mouthX - s * 0.07, Y + 0.006, END_Z]);
      // high pipe along the outer wall above the stacks, running into the washroom wall and the final
      // divider (no free ends), with a drop to each bay's status plate
      pipe(kit, PALETTE, [wallX - s * 0.12, Y + 2.8, WASH_Z + 0.05], [wallX - s * 0.12, Y + 2.8, END_Z + 0.04], 0.05, { bracket: 3.1 });

      const partition = (z) => {
        mm("impPanel", [wallX, Y, z], [mouthX, SOFFIT_Y, z + 0.08], { color: GREY, texel: 0.5 });
        mm("paintedMetal", [wallX, Y, z - 0.01], [mouthX, Y + 0.1, z + 0.09], { color: BLACK });
        kit.box("paintedMetal", mouthX - s * 0.03, SOFFIT_Y / 2 - Y / 2 + Y, z + 0.04, 0.14, SOFFIT_Y - Y, 0.14, { color: DARK, texel: 4 });
        coll([wallX, Y, z], [mouthX, SOFFIT_Y, z + 0.08], "partition");
      };

      for (let k = 0; k < N_MOD; k++) {
        const sz0 = MOD0 + k * MOD;
        const sz1 = sz0 + SLOT;
        const bz0 = sz1;
        const bz1 = bz0 + BAY;
        const bc = (bz0 + bz1) / 2;
        // divider partitions (wall → mouth line), full height to the soffit; k=0 uses the washroom wall
        if (k > 0) partition(sz0);
        partition(sz1 - 0.08);
        // slot mouth: recessed panel, lockers (count 2) facing the aisle, fold-out desk + stool, kit above
        const pz0 = k > 0 ? sz0 + 0.08 : sz0;
        mm("impPanel", [CX + s * (PANEL - 0.05), Y, pz0], [CX + s * (PANEL + 0.05), SOFFIT_Y, sz1 - 0.08], { color: IMP.impWhite, texel: 0.5 });
        coll([CX + s * (PANEL - 0.05), Y, pz0], [CX + s * (PANEL + 0.05), SOFFIT_Y, sz1 - 0.08], "slot-panel");
        const dress = DRESS[String(s)][k];
        lockerPair(kit, [CX + s * (MOUTH + 0.25), Y, sz0 + 0.72], faceYaw, { color: dress.color, states: dress.doors, seed: 30 + k * 2 + (s + 1) / 2 });
        // lit open locker: a warm point at the open unit's door line (unit 0 sits 0.3 m toward −z of
        // the pair centre) so the interior lamp visibly spills onto the aisle deck and the next desk
        if (dress.lit) ctx.lights.push({ type: "point", pos: [CX + s * (MOUTH + 0.12), Y + 1.65, sz0 + 0.72 - s * 0.3], color: 0xffcf9a, intensity: 3.5, distance: 4.0, priority: 0.6 });
        foldDesk(kit, [panelX, Y, sz0 + 1.62], faceYaw, 40 + k * 2 + (s + 1) / 2, dress.stool);
        if (k % 2) wallScreen(kit, [panelX, Y + 2.5, sz0 + 0.72], faceYaw, 0.7, 0.4, SCR, { tilt: 0.2 });
        else vent(kit, [panelX, Y + 2.55, sz0 + 0.72], faceYaw, 0.7, 0.3);
        junctionBox(kit, [panelX, Y + 2.35, sz0 + 1.62], faceYaw, 50 + k);
        kit.box("emitWarm", panelX - s * 0.006, Y + 2.9, sz0 + 1.62, 0.012, 0.06, 0.5);
        // housed slot downlight over the lockers
        kit.box("paintedMetal", CX + s * (MOUTH + 0.25), SOFFIT_Y - 0.035, sz0 + 1.62, 0.6, 0.07, 0.22, { color: BLACK });
        kit.box(FIX, CX + s * (MOUTH + 0.25), SOFFIT_Y - 0.075, sz0 + 1.62, 0.5, 0.012, 0.12, { uv: "keep" });
        // slot dressing variants: a duffel dumped by the lockers / a towel over a locker door
        if (k % 3 === 0) duffel(kit, [CX + s * 2.25, Y, sz0 + 0.45], faceYaw + 0.4);
        if (k % 3 === 1) kit.box("fabric", CX + s * (MOUTH - 0.015), Y + 1.7, sz0 + 0.42, 0.03, 0.55, 0.3, { color: IMP.impWhite, texel: 2 });
        // fascia kit over the slot / bay (vent, junction box, section lamp), proud of the panel plate
        vent(kit, [faceX - s * 0.02, Y + 3.5, (sz0 + sz1) / 2], faceYaw, 0.6, 0.3);
        junctionBox(kit, [faceX - s * 0.02, Y + 3.45, bc + 0.9], faceYaw, 60 + k);
        kit.box("paintedMetal", faceX - s * 0.04, Y + 3.45, bc - 0.6, 0.04, 0.34, 0.34, { color: BLACK });
        kit.box(FIX, faceX - s * 0.065, Y + 3.45, bc - 0.6, 0.012, 0.25, 0.25, { uv: "keep" });
        // privacy curtain drawn across part of the mouth (two bays), cleaning kit left at one mouth
        if (dress.curtain) {
          const c = dress.curtain;
          const zFrom = c.side === 0 ? bz0 + 0.12 : bz1 - 0.12;
          mouthCurtain(kit, [CX + s * (MOUTH - 0.15), SOFFIT_Y - 0.12, zFrom], [0, 0, c.side === 0 ? 1 : -1], c.len, 2.55, c.color, 140 + k);
        }
        if (dress.mop) wetFloorKit(kit, [CX + s * 3.6, Y, bz1 - 0.85], Math.PI + 0.3, 150 + k);

        // bay: two facing 3-tier stacks, heads on the outer wall, a foot locker at each ladder end.
        // Per-bay bedding colour; one stripped tier and one sheet-only tier in the room; open lockers.
        const bx = CX + s * 9.57;
        const sd = 700 + k * 4 + (s + 1);
        const bedding = BEDDING[(k + (s > 0 ? 1 : 0)) % 3];
        const strippedA = k === 2 && s < 0 ? 1 : -1;
        const noBlanketB = k === 3 && s > 0 ? 0 : -1;
        bunk(kit, PALETTE, [bx, Y, bz0 + 0.51], 0, { seed: sd, head: s, bedding, stripped: strippedA });
        bunk(kit, PALETTE, [bx, Y, bz1 - 0.51], Math.PI, { seed: sd + 1, head: -s, bedding, noBlanket: noBlanketB, stripped: k === 0 && s > 0 ? 2 : -1, faultyTier: k === 2 && s < 0 ? 1 : -1, faultyMat: WARM_FLK });
        footLocker(kit, [CX + s * 8.22, Y, bz0 + 0.51], faceYaw, sd + 2, 0.8, (k === 1 && s < 0) || (k === 4 && s > 0));
        footLocker(kit, [CX + s * 8.22, Y, bz1 - 0.51], faceYaw, sd + 3, 0.8, k === 3 && s < 0);
        // wall kit between the stacks: status plate fed by a drop from the high pipe, hook rail. The
        // plate is matte: as darkGloss it mirrored the key spot and read as a bare white lamp.
        kit.box("paintedMetal", wallX - s * 0.015, Y + 1.95, bc, 0.03, 0.3, 0.5, { color: BLACK });
        for (let i = 0; i < 3; i++) kit.box(["emitGreen", "emitBlue", "emitAmber"][i], wallX - s * 0.033, Y + 2.0, bc - 0.15 + i * 0.15, 0.006, 0.04, 0.04);
        kit.cyl("metal", wallX - s * 0.12, Y + 2.47, bc, 0.035, 0.66, "y", { color: STEEL, segments: 10 });
        kit.box("paintedMetal", wallX - s * 0.09, Y + 2.13, bc, 0.18, 0.08, 0.14, { color: DARK });
        kit.cyl("metal", wallX - s * 0.06, Y + 1.55, bc, 0.012, 0.9, "z", { color: STEEL, segments: 8 });
        for (let i = 0; i < 3; i++) kit.cyl("metal", wallX - s * 0.09, Y + 1.5, bc - 0.3 + i * 0.3, 0.01, 0.08, "y", { color: STEEL, segments: 6 });
        // nook: even bays a mess table with benches, odd bays a lounge (wall benches + holo-table)
        if (k % 2 === 0) {
          table(kit, PALETTE, [CX + s * 6.0, Y, bc], 0, { len: 1.4, w: 0.7, h: 0.76, benches: true });
        } else {
          holoTable(kit, [CX + s * 6.0, Y, bc], 0);
          for (const t of [-1, 1]) wallBench(kit, [CX + s * 6.0, Y, bc + t * 1.15], 0, 2.0);
        }
        // housed nook fixtures on the soffit underside (trough + recessed diffuser)
        kit.box("paintedMetal", CX + s * 6.0, SOFFIT_Y - 0.045, bc, 2.5, 0.09, 0.34, { color: BLACK, texel: 2.5 });
        kit.box(FIX, CX + s * 6.0, SOFFIT_Y - 0.094, bc, 2.2, 0.012, 0.16, { uv: "keep" });
        kit.box("paintedMetal", bx, SOFFIT_Y - 0.045, bc, 1.3, 0.09, 0.3, { color: BLACK, texel: 2.5 });
        kit.box(FIX, bx, SOFFIT_Y - 0.094, bc, 1.1, 0.012, 0.12, { uv: "keep" });
        // partition faces (z = bz0 facing +z, z = bz1 facing −z): hook rail with tunics on one side,
        // roster board + suppressant cylinder on the other; wall lamps on both; swapped on odd bays
        const [zA, yawA, zB, yawB] = k % 2 === 0 ? [bz0 + 0.001, 0, bz1 - 0.001, Math.PI] : [bz1 - 0.001, Math.PI, bz0 + 0.001, 0];
        hookRail(kit, [CX + s * 7.0, Y + 1.75, zA], yawA, 1.6, 120 + k * 2 + (s + 1) / 2);
        noticeBoard(kit, [CX + s * 7.3, Y + 1.75, zB], yawB, 0.9, 0.6, 110 + k * 2 + (s + 1) / 2, SCR);
        extinguisher(kit, [CX + s * 6.2, Y + 1.05, zB], yawB);
        for (const [z, yaw] of [[zA, yawA], [zB, yawB]]) {
          const dz = yaw === 0 ? 1 : -1;
          kit.box("paintedMetal", CX + s * 7.0, Y + 2.35, z + dz * 0.03, 1.4, 0.08, 0.06, { color: BLACK });
          kit.box("emitWarm", CX + s * 7.0, Y + 2.33, z + dz * 0.062, 1.3, 0.03, 0.006);
          // mouth end of the face (2–3 m band was bare): bay status screen with a conduit run feeding
          // it and the lamp, bay number plate above the boot rack / kit shelf
          wallScreen(kit, [CX + s * 4.6, Y + 2.15, z + dz * 0.012], yaw, 0.7, 0.45, SCR);
          kit.cyl("metal", CX + s * 5.35, Y + 2.72, z + dz * 0.05, 0.025, 5.0, "x", { color: STEEL, segments: 8 });
          kit.cyl("metal", CX + s * 4.6, Y + 2.56, z + dz * 0.05, 0.02, 0.3, "y", { color: STEEL, segments: 8 });
          kit.cyl("metal", CX + s * 7.6, Y + 2.54, z + dz * 0.05, 0.02, 0.32, "y", { color: STEEL, segments: 8 });
          for (const x of [3.2, 6.4]) kit.box("paintedMetal", CX + s * x, Y + 2.72, z + dz * 0.04, 0.08, 0.09, 0.08, { color: DARK });
          kit.box("darkGloss", CX + s * 3.3, Y + 2.25, z + dz * 0.012, 0.3, 0.3, 0.02);
          kit.box("emitAmber", CX + s * 3.3, Y + 2.33, z + dz * 0.024, 0.2, 0.03, 0.004);
          kit.box("paintedMetal", CX + s * 3.3, Y + 2.19, z + dz * 0.024, 0.16, 0.09, 0.004, { color: IMP.impGrey });
        }
        // bay mouth on the bz0 side: boot rack of 3/4/5 pairs (even bays), a stacked pair of foot
        // lockers (bay 1) or two side by side with the starboard one open (bay 3); kit shelf on bz1
        if (k % 2 === 0) bootRack(kit, [CX + s * 3.85, Y, bz0 + 0.2], 0, k === 2 ? 3 : k === 4 ? 5 : 4, 80 + k * 2 + (s + 1) / 2);
        else if (k === 1) for (const dy of [0, 0.45]) footLocker(kit, [CX + s * 3.85, Y + dy, bz0 + 0.24], 0, 84 + k * 2 + (s + 1) / 2 + dy);
        else {
          footLocker(kit, [CX + s * 3.5, Y, bz0 + 0.24], 0, 84 + k * 2 + (s + 1) / 2, 0.8, s > 0);
          footLocker(kit, [CX + s * 4.4, Y, bz0 + 0.24], 0, 85 + k * 2 + (s + 1) / 2, 0.8);
        }
        kitShelf(kit, [CX + s * 4.2, Y, bz1 - 0.22], Math.PI, { w: 1.2, h: 1.8, d: 0.4, seed: 90 + k * 2 + (s + 1) / 2 });
        if (k % 2 === 1) duffel(kit, [CX + s * 3.9, Y + 1.8, bz1 - 0.24], 0.15 * s, k === 1 ? DARK : BLACK);
        if ((k === 2 && s < 0) || (k === 4 && s > 0)) laundryCart(kit, [CX + s * 4.7, Y, bc + 0.6], 0.3 * s, 100 + k);
      }
      // final divider after the last bay (up to the soffit; the soffit's own end face closes the top)
      partition(END_Z);
    }

    // ---------------------------------------------------------------- washroom alcove (z 340.3..344.6)
    // wet-area floor: dark deck plate over the aisle strip (same deck material, darker), drain grate
    // along the basins and drains at the showers / laundry
    mm("impFloor", [wx0, Y, wz0], [wx1, Y + 0.02, WASH_Z], { color: IMP.impDark, texel: 0.5 });
    mm("paintedMetal", [-25.2, Y + 0.02, wz0 + 0.9], [-18.8, Y + 0.03, wz0 + 1.14], { color: BLACK });
    for (let x = -25.0; x < -18.8; x += 0.2) kit.box("metal", x, Y + 0.032, wz0 + 1.02, 0.03, 0.006, 0.2, { color: STEEL });
    for (const x of [CX - 5.6, CX + 1.2, CX + 5.2]) kit.box("darkGloss", x, Y + 0.024, 342.9, 0.4, 0.008, 0.4);
    for (const s of [-1, 1]) {
      const wallX = CX + s * 10.66;
      const mouthX = CX + s * MOUTH;
      mm("impPanel", [wallX, Y, WASH_Z], [mouthX, CEIL, WASH_Z + 0.1], { color: GREY, texel: 0.5 });
      mm("paintedMetal", [wallX, Y, WASH_Z - 0.01], [mouthX, Y + 0.1, WASH_Z + 0.11], { color: BLACK });
      coll([wallX, Y, WASH_Z], [mouthX, CEIL, WASH_Z + 0.1], "wash-wall");
      kit.box("paintedMetal", mouthX - s * 0.02, Y + 1.5, WASH_Z + 0.05, 0.16, 3.0, 0.16, { color: DARK, texel: 2.5 });
    }
    mm("paintedMetal", [CX - MOUTH + 0.05, SOFFIT_Y, WASH_Z - 0.03], [CX + MOUTH - 0.05, SOFFIT_Y + 0.4, WASH_Z + 0.13], { color: DARK, texel: 2.5 });
    mm("impPanel", [CX - MOUTH + 0.05, SOFFIT_Y + 0.4, WASH_Z], [CX + MOUTH - 0.05, CEIL, WASH_Z + 0.1], { color: GREY, texel: 0.5 });
    // housed header fixture on the washroom side + a thin accent line on the aisle face
    mm("paintedMetal", [CX - MOUTH + 0.3, SOFFIT_Y - 0.09, WASH_Z - 0.2], [CX + MOUTH - 0.3, SOFFIT_Y, WASH_Z - 0.03], { color: BLACK, texel: 2.5 });
    kit.box(FIX, CX, SOFFIT_Y - 0.096, WASH_Z - 0.115, 2 * MOUTH - 0.9, 0.012, 0.1, { uv: "keep" });
    mm(AMBER_BR, [CX - MOUTH + 0.3, SOFFIT_Y + 0.1, WASH_Z + 0.13], [CX + MOUTH - 0.3, SOFFIT_Y + 0.14, WASH_Z + 0.136]);
    // mirrors: polished-steel plates (MIRROR) inside their lit frames — darkGloss only ever showed the
    // fills' lobes on black, and the worn `metal` map reads frosted
    washCounter(kit, [CX, Y, wz0], 0, 4, 1.6, () => MIRROR);
    // cleaning kit by the basin drain (foreground of the wash view)
    wetFloorKit(kit, [-21.3, Y, 342.3], 0.8, 160);
    handDryer(kit, [CX - 3.65, Y + 1.2, wz0], 0);
    handDryer(kit, [CX + 3.65, Y + 1.2, wz0], 0);
    showers(kit, [CX - 8.1, Y, wz0], 0, 4, { pitch: 1.25, d: 1.4, seed: 17 });
    wallBench(kit, [CX - 8.1, Y, wz0 + 2.4], 0, 3.6);
    // changing side: second bench and towel hooks on the washroom face of the partition; drop lights
    wallBench(kit, [CX - 6.6, Y, WASH_Z - 0.22], Math.PI, 3.0);
    hookRail(kit, [CX - 6.6, Y + 1.75, WASH_Z - 0.001], Math.PI, 2.4, 36, true);
    hookRail(kit, [CX + 4.4, Y + 1.75, WASH_Z - 0.001], Math.PI, 1.6, 37, true);
    // washroom drop fixtures 2.5 m in front of the mirror wall with the fills 2.6 m up under them: seen
    // from the wash camera each fill's mirror image lands at plate height but in the gaps between the
    // plates (port fill → x −23.4 between plates 1–2, centre fill → x −20.6 between plates 3–4,
    // starboard fill → right of plate 4), so the polished mirrors reflect the room rather than clipped
    // lamp images, and the wall panel opposite each fill takes 6 rather than 12 cd/m² (at 2 m / 2.9 m
    // the panel above the centre plates clipped). The port fixture also sits west of the last shower
    // partition, whose east face it used to graze to white.
    const WASH_FIX_Z = 342.9;
    const WASH_X = [CX - 5.9, CX - 0.4, CX + 4.4];
    for (const x of WASH_X) barLight(kit, [x, CEIL, WASH_FIX_Z], { w: 2.0, d: 0.45, stem: FIX_STEM, mat: FIX });
    // towel rail with hanging towels between the showers and the basins
    kit.box("metal", -26.7, Y + 1.2, wz0 + 0.06, 1.4, 0.04, 0.06, { color: STEEL });
    for (let i = 0; i < 4; i++) kit.box("fabric", -27.2 + i * 0.33, Y + 0.85, wz0 + 0.05, 0.26, 0.7, 0.03, { color: i % 2 ? IMP.impWhite : GREY, texel: 2 });
    // starboard end of the north wall (was a bare 3 × 3 m): towel shelf between the dryer and the
    // laundry units, towel rack above the dryer, upper cabinets over the washers and the fold table
    kitShelf(kit, [CX + 4.35, Y, wz0 + 0.2], 0, { w: 0.9, h: 2.0, d: 0.4, seed: 28 });
    towelRack(kit, [CX + 3.35, Y + 2.35, wz0], 0, 1.0, 29);
    for (const x of [CX + 5.3, CX + 6.2]) wallCabinet(kit, [x, Y + 2.55, wz0], 0, { w: 0.86, h: 0.6, color: GREY });
    wallCabinet(kit, [CX + 8.3, Y + 2.55, wz0], 0, { w: 1.2, h: 0.6, color: IMP.impMid, emit: "emitAmber" });
    wallScreen(kit, [CX + 7.3, Y + 1.9, wz0 + 0.06], 0, 0.9, 0.55, SCR);
    washer(kit, [CX + 5.3, Y, wz0 + 0.36], 0, 19, AMBER_BR);
    washer(kit, [CX + 6.2, Y, wz0 + 0.36], 0, 20);
    foldTable(kit, [CX + 8.6, Y, wz0 + 0.5], 0, 1.8, 23);
    kitShelf(kit, [wx1 - 0.2, Y, 342.7], -Math.PI / 2, { w: 1.6, h: 2.0, d: 0.4, seed: 27 });
    laundryCart(kit, [CX + 6.4, Y, 342.9], 0.3, 31);
    laundryCart(kit, [CX + 8.3, Y, 343.3], -0.25, 32);
    vent(kit, [CX - 8.1, Y + 3.2, wz0 - 0.02], 0, 0.7, 0.35);
    vent(kit, [CX + 7.4, Y + 3.2, wz0 - 0.02], 0, 0.7, 0.35);
    junctionBox(kit, [wx1 - 0.02, Y + 1.6, 341.3], -Math.PI / 2, 33);
    junctionBox(kit, [wx0 + 0.02, Y + 1.6, 343.6], Math.PI / 2, 34);
    pipe(kit, PALETTE, [wx0 + 0.2, Y + 3.6, wz0 + 0.2], [wx1 - 0.2, Y + 3.6, wz0 + 0.2], 0.07, { bracket: 2.6 });
    pipe(kit, PALETTE, [wx0 + 0.2, Y + 3.85, wz0 + 0.2], [wx1 - 0.2, Y + 3.85, wz0 + 0.2], 0.05, { bracket: 2.6, color: IMP.impAmber });

    // ---------------------------------------------------------------- aft strip: duty desk, notice board
    consoleProp(kit, PALETTE, [-27.4, Y, 370.8], 0, { w: 1.8, d: 0.9, screens: 2, sit: true, seed: 5, screenMat: SCR });
    wallScreen(kit, [-27.4, Y + 2.85, wz1 - 0.07], Math.PI, 1.6, 0.9, SCR);
    cabinet(kit, PALETTE, [-32.05, Y, wz1 - 0.25], Math.PI, { h: 1.8, color: IMP.impMid, seed: 61 });
    cabinet(kit, PALETTE, [-30.8, Y, wz1 - 0.25], Math.PI, { h: 1.8, color: GREY, seed: 62 });
    crate(kit, PALETTE, [-29.35, Y, wz1 - 0.66], 0, { seed: 71, bumperMat: "paintedMetal" });
    vent(kit, [-29.6, Y + 3.5, wz1 - 0.02], Math.PI, 0.7, 0.35);
    junctionBox(kit, [-31.5, Y + 3.2, wz1 - 0.02], Math.PI, 63);
    noticeBoard(kit, [-18.2, Y + 1.75, wz1 - 0.04], Math.PI, 1.8, 1.0, 64, SCR);
    wallBench(kit, [-18.2, Y, wz1 - 0.3], Math.PI, 1.8);
    bootRack(kit, [-16.2, Y, wz1 - 0.2], Math.PI, 4, 65);
    cabinet(kit, PALETTE, [-14.6, Y, wz1 - 0.25], Math.PI, { h: 1.4, color: 0x8a1a12, emit: "emitRedImp", seed: 66 });
    cabinet(kit, PALETTE, [-13.25, Y, wz1 - 0.25], Math.PI, { h: 1.8, color: IMP.impMid, seed: 67 });
    cabinet(kit, PALETTE, [-11.98, Y, wz1 - 0.25], Math.PI, { h: 1.8, color: GREY, seed: 68 });
    wallScreen(kit, [-13.0, Y + 2.85, wz1 - 0.07], Math.PI, 1.4, 0.8, SCR);
    vent(kit, [-16.2, Y + 3.5, wz1 - 0.02], Math.PI, 0.7, 0.35);
    // aft wall top band: pipe run (> 1 m above the 3 m door lintel)
    pipe(kit, PALETTE, [wx0 + 0.2, Y + 4.2, wz1 - 0.2], [wx1 - 0.2, Y + 4.2, wz1 - 0.2], 0.06, { bracket: 2.6 });

    // ---------------------------------------------------------------- aisle fixtures
    // suspended crosswise bars: a 2.4 m bar over every slot centre and the aft strip (each carries a fill
    // 1.8 m under it) plus a shorter 1.6 m bar over every bay centre, so the ceiling shows a fixture every
    // 2.55 m instead of an 8 % plane between three bars (the secondary bars are emissive only)
    const AISLE_Z = [345.7, 350.8, 355.9, 361.0, 366.1, 370.9];
    for (const z of AISLE_Z) barLight(kit, [CX, CEIL, z], { w: 2.4, d: 0.4, stem: FIX_STEM, mat: FIX });
    for (let k = 0; k < N_MOD; k++) barLight(kit, [CX, CEIL, MOD0 + k * MOD + SLOT + BAY / 2], { w: 1.6, d: 0.34, stem: FIX_STEM, mat: FIX });

    // ---------------------------------------------------------------- lights (warm white, 14 descriptors)
    // 5 aisle fills + 1 amber mouth pool + 1 key spot + 3 nook fills + 1 lit locker + 3 washroom fills.
    // GAIN re-tunes the fills for the rig's captured environment (no studio env-map ambient any more).
    const GAIN = 1.7;
    const L = (x, z, intensity = 20, distance = 10, color = 0xffe0bd, y = FILL_Y, priority = 0.5) => {
      const d = { type: "point", pos: [x, y, z], color, intensity: intensity * GAIN, distance, priority };
      ctx.lights.push(d);
      return d;
    };
    // aisle fills under the bars, 0.4 m lower (2.0 m above the deck) and +55 % over the pass-3 round so
    // the strip reads 25–35 % and the bay decks at the mouths ~15–20 % across the bottom of the door and
    // aisle frames (the band sat at 12 %); the first bar's fill also carries the aisle view's foreground;
    // the washroom-mouth bar's slot is taken by the amber practical below
    for (const z of AISLE_Z) if (z !== 345.7) L(CX, z, z > 370 ? 23 : z < 351 ? 34 : 31, z > 370 ? 9 : 10, 0xffe0bd, FILL_Y - 0.4);
    // amber practical: a warm-amber pool on the deck at the washroom mouth, between the header's amber
    // line and the first bar; it breathes with the night-light circuit (see update()). 1.6 m to port of
    // the centreline (still inside the 5.2 m mouth) so its mirror image sits in the gap between the two
    // starboard plates from the wash camera; a little lower and stronger so the deck at the mouth (the
    // aisle view's foreground, which has no bar fill) reads ≥ 20 %.
    const mouthPool = L(CX - 1.6, WASH_Z + 0.6, 22, 8, 0xffb060, FILL_Y - 0.5, 0.6);
    const mouthPool0 = mouthPool.intensity;
    // KEY (shadow): warm spot in a small pendant can under bay 2 port's nook trough (the room's
    // midpoint), aimed at the deck between the two stacks: ladders, footlockers and stack frames throw
    // long shadows across the bay deck and up the outer wall (visible in d2-quarters-bunks). At 2.3 m
    // (just under the can's diffuser, and under the stacks' 2.55 m top boards) it also reaches into the
    // top-tier interiors. The aisle-centre bar cannot key the bunks — the fascia and soffit shadow
    // everything west of the mouth.
    const BC2 = MOD0 + 2 * MOD + SLOT + BAY / 2;
    const KEY_X = CX - 5.0;
    kit.box("paintedMetal", KEY_X, SOFFIT_Y - 0.09 - 0.18, BC2, 0.05, 0.36, 0.05, { color: BLACK });
    kit.cyl("paintedMetal", KEY_X, SOFFIT_Y - 0.45 - 0.09, BC2, 0.14, 0.18, "y", { color: DARK, segments: 16, texel: 2.5 });
    kit.cyl(FIX, KEY_X, SOFFIT_Y - 0.45 - 0.185, BC2, 0.11, 0.01, "y", { segments: 16, uv: "keep" });
    ctx.lights.push({ type: "spot", pos: [KEY_X, SOFFIT_Y - 0.7, BC2], target: [CX - 8.8, Y, BC2], color: 0xffe0bd, intensity: 100, distance: 34, angle: 1.0, penumbra: 0.5, priority: 0.9, shadow: true });
    // bay nook fills under the soffit fixtures (alternating sides), 0.65 m below the soffit; bay 2 port is
    // lower so the key's shadows keep their contrast there; bay 0 port is carried by the amber mouth pool
    // and bay 1 starboard's slot went to the lit locker at slot 4 starboard
    for (const k of [2, 4]) L(CX - 7.0, MOD0 + k * MOD + SLOT + BAY / 2, k === 2 ? 7 : 12, 8, 0xffe6cc, SOFFIT_Y - 0.65, 0.4);
    L(CX + 7.0, MOD0 + 3 * MOD + SLOT + BAY / 2, 12, 8, 0xffe6cc, SOFFIT_Y - 0.65, 0.4);
    // washroom: one fill per drop fixture, 2.0 m below the ceiling (see WASH_FIX_Z for the mirror-image
    // geometry); lower and 20 % dimmer than the 2.9 m pass, which keeps the wet-area deck where it was
    // (~25 %) while the wall panel above the plates drops from clipped to ~60 %
    L(WASH_X[0], WASH_FIX_Z, 18, 9, 0xfff0e0, CEIL - 2.0);
    L(WASH_X[1], WASH_FIX_Z, 22, 10, 0xfff0e0, CEIL - 2.0);
    L(WASH_X[2], WASH_FIX_Z, 18, 9, 0xfff0e0, CEIL - 2.0);

    // ---------------------------------------------------------------- motion lighting
    // All state is a function of t (replayable; the harness freezes t = 40 s, where the night-light
    // circuit is at its peak, the faulty lamp is lit and the duty screens sit at nominal). No allocation.
    const hash = (i) => {
      const s = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
      return s - Math.floor(s);
    };
    const TWO_PI = Math.PI * 2;
    return {
      update(dt, t) {
        const tp = t - 40;
        // night-light circuit (kick strips, mouth header line, washer cycle lamp) breathes 0.7–1.0 over 9 s;
        // the amber mouth pool follows it
        const br = 0.7 + 0.3 * (0.5 + 0.5 * Math.cos((TWO_PI * tp) / 9));
        amberMat.emissiveIntensity = base.amber * br;
        mouthPool.intensity = mouthPool0 * (0.8 + 0.2 * br); // the pool doubles as the mouth fill, so it sways less than the strips
        // faulty reading lamp: 11 Hz cells, ~22 % of them drop to 25–65 %, a further 12 % sag to 70 %
        const c = Math.floor((tp + 0.5) * 11);
        const r = hash(c + 19);
        warmMat.emissiveIntensity = base.warm * (r < 0.22 ? 0.25 + 0.4 * hash(c * 3 + 5) : r < 0.34 ? 0.7 : 1);
        // screens (duty desk and wall boards share the one live clone): 8 Hz refresh jitter 0.9–1.1
        screenMat.emissiveIntensity = base.screen * (0.9 + 0.2 * hash(Math.floor(t * 8) + 3));
      },
    };
  },
});
