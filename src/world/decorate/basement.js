// Room decoration: basement (service level, floor y = -3.6) — owner: fable3-b.
// Rooms: service_corridor, utility, loading, garage (+ b_finger touches).
// CRITICAL clearances: extraction zone x 53..62 z 4.5..11.5 has NO props or
// colliders; lanes from both garage doors (x44 z8.9..11.1 and z3.4..4.4) to
// the van stay ≥1.6 m; corridor patrol line z≈10 stays open; utility medkit
// (19.2,1.2) reachable; loading heavy patrol (33,4)(41.5,3.5)(41,6.5) clear.
// NOTE: every placement sets an explicit y (groundAt would find the ground
// floor slab above these rooms).

import '../props/signage.js';
import '../props/maintenance.js';

const PI = Math.PI;
const N = 0, S = PI, W = PI / 2, E = -PI / 2;
const B = -3.6;

export function decorateBasement(world) {
  const p = [];
  const add = (prop, at, rot = 0, opts = {}, extra = {}) => p.push({ prop, at, rot, opts, y: B, ...extra });

  // ==== service_corridor (18..44 × 8..12) ===================================
  add('locker_bank', [26.5, 11.68], S, { n: 5 }, {});
  add('crate_wood', [42.5, 11.45], 0.2, { w: 0.7, h: 0.6, d: 0.7 }, {});
  add('traffic_cone', [39.4, 11.4], 0, {}, {});
  add('wet_floor_sign', [20.5, 11.25], 0.6, {}, {});
  add('cable_tray', [26, 11.76], N, { len: 8 }, { y: B + 2.2 });
  add('cable_tray', [36, 11.76], N, { len: 8 }, { y: B + 2.2 });
  add('pipe_run', [25, 8.28], N, { len: 6, n: 2 }, { y: B + 2.25 });
  add('pipe_run', [35, 8.28], N, { len: 6, n: 2 }, { y: B + 2.25 });
  add('sign_evac', [30.0, 11.9], S, { level: 'b', here: [30, 10] }, { y: B + 1.45 });
  add('sign_notice', [21.0, 8.1], N, { variant: 'blizzard' }, { y: B + 1.5 });
  add('label_small', [26.5, 11.42], S, { text: 'CREW LOCKERS' }, { y: B + 1.85, tiny: true });

  // ==== utility (18..30 × 0..8) — medkit (19.2,1.2) stays open ==============
  add('water_heater', [27.6, 0.85], S, {}, {});
  add('water_heater', [25.9, 0.85], S + 0.2, {}, {});
  add('pump_manifold', [22.3, 0.9], N, {}, {});
  add('workbench', [18.45, 4.6], W, { w: 1.8 }, {});
  add('utility_shelf', [26.0, 7.68], S, { bays: 2 }, {});
  add('transformer_cabinet', [20.6, 7.3], S, {}, {});
  add('oil_drum', [29.2, 7.2], 0, {}, {});
  add('oil_drum', [28.4, 6.75], 0.7, { color: 'blue' }, {});
  add('oil_drum', [29.3, 6.3], 1.9, {}, {});
  add('electrical_panel', [18.17, 2.4], W, {}, { y: B + 1.3 });
  add('breaker_box', [18.16, 6.5], W, {}, { y: B + 1.45 });
  add('pipe_run', [24, 0.3], N, { len: 10, n: 3 }, { y: B + 2.3 });
  add('tool_case', [19.1, 5.9], 0.8, {}, { tiny: true });
  add('bottle_set', [28.6, 5.4], 0, { n: 3 }, { tiny: true });
  add('label_small', [20.6, 7.72], S, { text: 'TX-1 · 600V' }, { y: B + 1.66, tiny: true });
  add('sign_notice', [23.9, 8.1], N, { variant: 'keys' }, { y: B + 1.5 });

  // ==== loading (30..44 × 0..8) — dock shutter N (x 32..42) ================
  add('dock_leveler', [37, 1.05], N, {}, {});
  add('pallet', [30.95, 1.3], 0.1, { variant: 'wrapped' }, {});
  add('pallet', [43.1, 1.2], 0.3, { variant: 'boxes' }, {});
  add('pallet', [39.5, 1.0], 0.15, {}, {});
  add('crate_wood', [30.75, 6.5], 0.1, {}, {});
  add('crate_wood', [31.7, 6.6], 0.5, { w: 0.6, h: 0.5, d: 0.6 }, {});
  add('work_counter', [32.6, 7.55], S, { len: 2.0 }, {});   // packing table
  add('hand_truck', [34.4, 7.3], -0.7, {}, {});
  add('utility_shelf', [43.6, 6.6], E, { bays: 2 }, {});    // shipping shelf
  add('shutter_control', [42.65, 0.18], N, {}, { y: B + 1.25 });
  add('box_cardboard', [32.2, 7.5], 0.2, { size: 's', stack: 2 }, { y: B + 0.9 }); // on the packing table
  add('label_small', [30.75, 6.93], N, { text: 'ND-SHIP-0114', style: 'ship' }, { y: B + 0.45, tiny: true });
  add('label_small', [43.45, 5.55], E, { text: 'OUTBOUND', style: 'ship' }, { y: B + 1.3, tiny: true });
  add('sign_notice', [35.2, 7.9], S, { variant: 'blizzard' }, { y: B + 1.5 });

  // ==== garage (44..64 × 0..16) — extraction stays CLEAR ====================
  // painted bays live in decals.js; here: bumpers, cones, service clutter
  add('parking_bumper', [46.7, 15.0], N, {}, {});
  add('parking_bumper', [49.3, 15.0], N, {}, {});
  add('parking_bumper', [51.9, 15.0], N, {}, {});
  add('tire_stack', [44.95, 14.9], 0, { n: 4 }, {});
  add('tire_stack', [45.05, 13.9], 0.9, { n: 2 }, {});
  add('tool_cabinet', [46.4, 0.48], N, {}, {});
  add('compressor', [48.4, 0.75], 0.3, {}, {});
  add('oil_drum', [44.65, 1.0], 0, {}, {});
  add('oil_drum', [45.35, 0.72], 1.2, { color: 'blue' }, {});
  add('traffic_cone', [52.6, 12.3], 0, {}, {});
  add('traffic_cone', [62.9, 12.7], 0, {}, {});
  add('shutter_control', [63.83, 12.9], E, {}, { y: B + 1.25 });
  add('pipe_run', [54, 0.3], N, { len: 12, n: 2 }, { y: B + 2.5 });
  add('sign_bay_letter', [46.7, 15.83], S, { letter: 'A' }, { y: B + 1.5 });
  add('sign_bay_letter', [49.3, 15.83], S, { letter: 'B' }, { y: B + 1.5 });
  add('sign_bay_letter', [51.9, 15.83], S, { letter: 'C' }, { y: B + 1.5 });
  add('sign_bay_letter', [54.5, 15.83], S, { letter: 'D' }, { y: B + 1.5 });
  add('sign_notice', [44.1, 6.9], W, { variant: 'blizzard' }, { y: B + 1.5 });
  add('label_small', [46.4, 0.76], N, { text: 'ND-EQ-208' }, { y: B + 1.12, tiny: true });

  // ==== b_finger (56..60 × 16..22) — escort route to the garage door ========
  add('pipe_vertical', [56.35, 16.6], W, { h: 2.4 }, {});
  add('fire_extinguisher', [59.7, 21.2], E, { bracket: true }, { y: B + 0.75 });

  return p;
}
