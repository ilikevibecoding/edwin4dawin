// sys-lifts — turbolift system (COORDINATION.md §9.2). Built after every room: reads each lobby's
// `lift: { id, pos, dir }`, drops a cabin prefab into the reserved 4.0 × 4.0 × 3.6 box behind the
// lobby wall, adds sliding doors + frame + call panel, and wires all cabins into one network
// (deck picker → doors close → ride theatre → teleport → doors open). See README.md in this folder.
import * as THREE from "three";
import { makeCabin, buildCabinStatic } from "./cabin.js";
import { LiftNetwork } from "./network.js";
import { makeLabelMaterial } from "./labels.js";

const FLOOR4 = -72;

export default {
  id: "sys-lifts",
  name: "Turbolift network",
  kind: "system",
  owner: "D",
  // Harness views around the Deck 4 cabin (T4 at (0, -72, 181), doors facing -Z into d4-lobby).
  views: {
    "sys-lifts-door": { pos: [0, FLOOR4, 176.5], yaw: 180, pitch: 2 },
    "sys-lifts-door-open": { pos: [0, FLOOR4, 179.2], yaw: 180, pitch: 0, advance: 2 },
    "sys-lifts-cabin": { pos: [0, FLOOR4, 183.6], yaw: 180, pitch: -4 },
    "sys-lifts-panel": { pos: [-0.6, FLOOR4, 183.2], yaw: -90, pitch: -6 },
  },
  // Module-local materials (§10): leaf = gunmetal (metallic, mid roughness, vertex-tinted stiles/rails
  // so panel lines and bevels catch the light); inset = clean painted plate (shared impPanel clone) for
  // the recessed leaf fields; lamp = unlit HDR colour per instance (drives every indicator from one
  // InstancedMesh); face = console glass for the two interactable plates (cloned per plate for the
  // hover tint); decal = the stencil label atlas (1 canvas texture).
  materials(shared) {
    const panel = shared.impPanel || shared.painted;
    const metalMaps = shared.metal || {};
    const leaf = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      vertexColors: true,
      normalMap: metalMaps.normalMap || null,
      normalScale: new THREE.Vector2(0.5, 0.5),
      roughness: 0.45,
      metalness: 0.7,
      envMapIntensity: 0.9,
      name: "liftLeaf",
    });
    const inset = panel.clone();
    inset.name = "liftInset";
    return {
      liftLeaf: leaf,
      liftInset: inset,
      // clean matte for the dark readout/indicator plates and the hood face: no wear or roughness maps
      // (which mottle on near-black tints) and no gloss (which mirrors the cabin light over the digit)
      liftMatte: new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.88, metalness: 0, envMapIntensity: 0.35, name: "liftMatte" }),
      liftLamp: new THREE.MeshBasicMaterial({ color: 0xffffff, name: "liftLamp" }),
      liftFace: new THREE.MeshStandardMaterial({ color: 0x0b0d10, roughness: 0.3, metalness: 0.25, envMapIntensity: 1.0, name: "liftFace" }),
      liftDecal: makeLabelMaterial(),
    };
  },
  build(ctx) {
    const cabins = [];
    const rooms = ctx.world && ctx.world.rooms;
    if (rooms) {
      for (const [roomId, entry] of rooms) {
        const m = entry && entry.manifest;
        if (!m || !m.lift) continue;
        if (!m.lift.id || !m.lift.pos || !m.lift.dir) {
          console.warn(`[lifts] ${roomId}: lift needs id, pos, dir — skipped`);
          continue;
        }
        cabins.push(makeCabin(ctx, m, roomId));
      }
    }
    cabins.sort((a, b) => a.deck - b.deck || a.id.localeCompare(b.id));
    const seen = new Set();
    for (const c of cabins) {
      if (seen.has(c.id)) console.warn(`[lifts] duplicate lift id ${c.id} (${c.roomId})`);
      seen.add(c.id);
    }
    if (!cabins.length) {
      console.warn("[lifts] no lobby room declares a lift; network is empty");
      const empty = { cabins: {}, currentRide: null };
      return {
        api: { callTo: () => false, call: () => false, select: () => false, cabins: () => [], state: () => empty, serialize: () => ({ v: 1, t: 0, cabins: {}, ride: null }), apply: () => false },
      };
    }
    cabins.forEach((cab, i) => buildCabinStatic(ctx, cab, (ctx.seed || 1) + i * 7919));
    const net = new LiftNetwork(ctx, cabins);
    ctx.interactables.push(...net.interactables);
    console.log(`[lifts] network: ${cabins.map((c) => `${c.id} (deck ${c.deck}, ${c.roomId})`).join(", ")}`);
    return {
      update: (dt, t) => net.update(dt, t),
      dispose: () => net.dispose(),
      colliders: net.colliders,
      api: net.api(),
    };
  },
};
