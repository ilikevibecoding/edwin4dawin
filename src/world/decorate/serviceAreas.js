// Room decoration: service areas — owner: fable3-b.
// Rooms: archive (rolling racks landmark), server_room (rack rows), mech_room,
// east_hall, north_corridor, both stairwells (level plates / extinguishers).
// Clearances honored: hostage Reid (45.6,17.2) r1.2, server pickups
// (62.8,15.4)+(62.8,17.2) reachable, corridor lanes ≥1.4, patrol waypoints
// ±0.6 (archive scout, corridor marksman lane x55..62 @ z12).

import '../props/signage.js';
import '../props/maintenance.js';

const PI = Math.PI;
const N = 0, S = PI, W = PI / 2, E = -PI / 2;

export function decorateServiceAreas(world) {
  const p = [];
  const add = (prop, at, rot = 0, opts = {}, extra = {}) => p.push({ prop, at, rot, opts, ...extra });

  // ==== archive (40..48 × 14..26) — motion-lit shelving canyons =============
  // three rack rows west block + one row NE; aisles 1.15 m; guard triangle
  // (43.5,19)(45.5,23.5)(42,24) and Reid spot stay clear.
  add('rolling_rack', [41.6, 15.2], N, { len: 2.2 }, { y: 0 });
  add('rolling_rack', [41.6, 17.1], N, { len: 2.2 }, { y: 0 });
  add('rolling_rack', [41.6, 19.0], N, { len: 2.2 }, { y: 0 });
  add('rolling_rack', [46.55, 15.3], S, { len: 2.2 }, { y: 0 });
  add('utility_shelf', [47.66, 22.5], E, { bays: 2, h: 2.0 }, { y: 0 });
  add('training_table', [46.3, 20.7], N, {}, { y: 0 });          // reading table
  add('records_box', [45.95, 20.65], 0.2, {}, { tiny: true });
  add('records_box', [46.7, 20.6], 0.5, { lidOff: true }, { tiny: true });
  add('ladder_aframe', [47.3, 18.7], 1.0, { h: 1.3 }, { y: 0 }); // step ladder
  add('records_box', [42.9, 24.8], 1.2, {}, { y: 0, tiny: true });
  add('cafe_chair', [46.0, 21.6], S + 0.4, {}, { y: 0 });
  add('label_small', [40.42, 15.2], W, { text: 'ROW A · 100-215' }, { y: 1.7, tiny: true });
  add('label_small', [40.42, 17.1], W, { text: 'ROW B · 216-388' }, { y: 1.7, tiny: true });
  add('sign_notice', [40.1, 22.6], W, { variant: 'blizzard' }, { y: 1.5 });
  add('smoke_detector', [44, 20], 0, {}, { y: 2.97, tiny: true });

  // ==== server_room (56..64 × 14..22) — cold aisle, LED fronts =============
  // row A faces south (+z), row B faces north; pickups at x 62.8 untouched.
  let v = 0;
  for (const x of [58.2, 58.82, 59.44]) add('server_rack', [x, 15.92], N, { variant: v++ }, { y: 0 });
  for (const x of [58.2, 58.82, 59.44, 60.06]) add('server_rack', [x, 19.6], S, { variant: v++ }, { y: 0 });
  add('crac_unit', [57.3, 21.5], S, {}, { y: 0 });
  add('ups_unit', [60.9, 21.55], S, {}, { y: 0 });
  add('ups_unit', [61.5, 21.55], S, {}, { y: 0 });
  add('kvm_cart', [61.9, 18.7], -0.5, {}, { y: 0 });
  add('cable_tray', [58.82, 15.92], N, { len: 3.4 }, { y: 2.45 });
  add('cable_tray', [59.1, 19.6], N, { len: 4.0 }, { y: 2.45 });
  add('cable_tray', [62.2, 17.75], W, { len: 3.6 }, { y: 2.45 });
  add('box_cardboard', [63.3, 20.9], 0.4, { size: 'm' }, { y: 0 });
  add('label_small', [57.9, 15.4], N, { text: 'ND-SRV-A1' }, { y: 1.72, tiny: true });
  add('smoke_detector', [60, 18], 0, {}, { y: 2.97, tiny: true });
  // authorized-personnel plate on the IT side of the secure door
  add('sign_notice', [55.91, 17.75], E, { variant: 'authorized' }, { y: 1.5 });

  // ==== mech_room (60..64 × 22..30) =========================================
  add('electrical_panel', [60.19, 24.0], W, {}, { y: 1.35 });
  add('electrical_panel', [60.19, 25.0], W, { open: true }, { y: 1.35 });
  add('breaker_box', [60.17, 26.0], W, {}, { y: 1.5 });
  add('transformer_cabinet', [62.9, 22.9], S, {}, { y: 0 });
  add('utility_shelf', [61.2, 22.32], N, { bays: 2, h: 1.6 }, { y: 0 }); // filter shelf
  add('hvac_unit', [61.05, 24.9], W, {}, { y: 0 });
  add('pump_manifold', [63.25, 26.8], E, {}, { y: 0 });
  add('workbench', [60.55, 28.1], W, { w: 1.6 }, { y: 0 });
  add('pipe_run', [62, 22.24], N, { len: 3.4, n: 2 }, { y: 2.15 });
  add('pipe_vertical', [63.65, 22.4], S, { h: 2.9 }, { y: 0 });
  add('oil_drum', [63.5, 29.35], 0, {}, { y: 0 });
  add('tool_case', [60.4, 29.0], 0.4, {}, { tiny: true });
  add('label_small', [62.9, 23.32], S, { text: 'TX-2 · 600V' }, { y: 1.66, tiny: true });
  add('smoke_detector', [62, 26], 0, {}, { y: 2.97, tiny: true });

  // ==== east_hall (40..56 × 26..30) — lane ≥1.4 kept =========================
  add('fire_cabinet', [47.5, 26.18], N, {}, { y: 1.1 });
  add('sign_corkboard', [49.3, 26.1], N, { seed: 11 }, { y: 1.55 });
  // audit 2: the pier between the cubicle opening and the archive door was a
  // bare 3.4 m drywall field straight ahead of the east_hall checkpoint
  add('sign_art_print', [41.3, 26.1], N, { design: 'field' }, { y: 1.6 });
  add('sign_poster', [42.55, 26.1], N, { design: 'exits' }, { y: 1.52 });
  add('hall_bench', [49.5, 29.7], S, {}, { y: 0 });
  add('water_fountain', [45.0, 29.56], S, {}, { y: 0 });
  add('plant_util', [55.5, 26.5], 0, {}, { y: 0 });
  add('sign_evac', [46.7, 26.09], N, { level: 'g', here: [48, 28] }, { y: 1.45 });
  add('sign_poster', [52.5, 29.9], S, { design: 'cleandesk' }, { y: 1.5 });
  add('sign_wayfind', [42.5, 28], W, { text: '\u2190 OPERATIONS · LOBBY      STAIR C \u2192', w: 1.9 }, { y: 2.98 });
  add('sign_wayfind', [54.2, 28], W, { text: '\u2190 RECORDS · SYSTEMS      EXECUTIVE \u2192', w: 1.9 }, { y: 2.98 });
  add('smoke_detector', [48, 28], 0, {}, { y: 2.97, tiny: true });

  // ==== north_corridor (18..64 × 10..14) — marksman lane stays clear ========
  add('fire_cabinet', [30.5, 13.82], S, {}, { y: 1.1 });
  add('fire_cabinet', [54.4, 10.18], N, {}, { y: 1.1 });
  add('sign_corkboard', [22.6, 10.11], N, { seed: 5 }, { y: 1.55 });
  add('hall_bench', [31.5, 10.3], N, {}, { y: 0 });
  add('water_fountain', [44.8, 10.28], N, {}, { y: 0 });
  add('plant_util', [18.5, 13.35], 0, {}, { y: 0 });
  // audit 3: the corridor's west end cap (x=18 wall) was a bare drywall field
  // straight ahead of the westbound sightline — dress it like the east_hall pier
  add('sign_evac', [18.11, 11.4], W, { level: 'g', here: [18.5, 12] }, { y: 1.5 });
  add('sign_poster', [18.11, 12.6], W, { design: 'exits' }, { y: 1.52 });
  add('sign_evac', [33.0, 13.91], S, { level: 'g', here: [33, 12] }, { y: 1.45 });
  add('sign_notice', [36.9, 10.11], N, { variant: 'blizzard' }, { y: 1.5 });
  add('sign_poster', [41.6, 13.9], S, { design: 'ice' }, { y: 1.5 });
  add('sign_wayfind', [22, 12], W, { text: '\u2190 STORAGE · BREAK      OFFICE FLOOR \u2192', w: 1.9 }, { y: 2.88 });
  add('sign_wayfind', [37, 12], W, { text: '\u2190 BREAK ROOM      RECORDS · SYSTEMS \u2192', w: 1.9 }, { y: 2.88 });
  add('sign_wayfind', [53, 12], W, { text: '\u2190 TRAINING      SERVER HALL \u2192', w: 1.9 }, { y: 2.88 });
  add('smoke_detector', [26, 12], 0, {}, { y: 2.87, tiny: true });
  add('smoke_detector', [48, 12], 0, {}, { y: 2.87, tiny: true });

  // ==== stairwells ==========================================================
  // west stair (14..18 × 10..16): plates + extinguisher, platform kept clear
  add('sign_level_plate', [14.7, 15.9], S, { text: 'L1 — GROUND' }, { y: 1.6 });
  add('fire_extinguisher', [14.3, 15.3], W, { bracket: true }, { y: 0.75 });
  add('sign_level_plate', [17.9, 8.6], E, { text: 'B1 — SERVICE' }, { y: -2.0 });
  add('pipe_vertical', [14.35, 8.5], E, { h: 3.3 }, { y: -3.6 });
  // central stair (56..60 × 22..30)
  add('sign_level_plate', [56.75, 29.9], S, { text: 'L1 — GROUND' }, { y: 1.6 });
  add('fire_extinguisher', [56.28, 29.3], W, { bracket: true }, { y: 0.75 });
  add('sign_level_plate', [59.9, 22.9], E, { text: 'B1 — SERVICE' }, { y: -2.0 });
  add('pipe_vertical', [59.7, 22.35], W, { h: 6.2 }, { y: -3.6 });

  return p;
}
