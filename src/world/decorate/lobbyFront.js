// Room decoration: lobbyFront — reception lobby, vestibule, security office,
// visitor waiting. Owner: fable3a (prop production wave).
//
// Placement discipline (see map.js): door spans stay clear ±0.9 m, the
// vestibule→lobby→cubicles walking lane (x≈28.5..33.5) stays open, patrol
// waypoints of e_lobby_1 / e_waiting_1 keep ±0.6 m, pickups ±0.4 m.
// Desk-top items are placed AFTER the furniture that supports them (the prop
// pass ground-snaps onto prop colliders in list order).

import '../props/furniture.js';
import '../props/electronics.js';
import '../props/clutter.js';

const PI = Math.PI;

export function decorateLobbyFront(world) {
  const P = [];
  const add = (prop, at, rot = 0, extra = {}) => P.push({ prop, at, rot, ...extra });

  // ---- Reception lobby ----------------------------------------------------
  add('mat_runner', [31, 38.1], 0, { opts: { w: 2.8, d: 3.4 } });

  // reception desk faces the entrance doors (south), east of the main lane
  add('desk_reception', [35.0, 33.4], 0);
  add('chair_task', [34.8, 32.5], 0, { jitter: 0.6 });
  add('pc_tower', [35.85, 32.5], PI / 2);
  add('monitor', [34.5, 33.3], PI, { jitter: 0.2, opts: { screen: 'login' } });
  add('keyboard', [34.5, 33.05], PI, { tiny: true, jitter: 0.1 });
  add('desk_phone', [35.75, 33.3], PI, { tiny: true, jitter: 0.5 });
  add('paper_stack', [35.2, 33.2], 0, { tiny: true, jitter: 3 });
  add('notebook_pen', [34.9, 33.4], PI, { tiny: true, jitter: 1 });
  add('id_badge', [34.2, 33.25], 0, { tiny: true });
  add('mug', [35.5, 33.35], 0, { tiny: true });
  add('pen_cup', [34.05, 33.4], 0, { tiny: true });
  // counter top (1.10) items
  add('plant_desk', [33.6, 33.65], 0, { tiny: true });
  add('paper_sheet', [36.2, 33.7], 0, { tiny: true });

  add('stanchion_pair', [33.9, 36.6], 0.3);

  // west seating group (NW corner)
  add('table_coffee', [23.6, 31.6], 0.2);
  add('armchair', [22.9, 30.9], 0.79, { jitter: 0.2 });
  add('armchair', [24.6, 30.9], -0.96, { jitter: 0.2 });
  add('magazine_stack', [23.6, 31.6], 0, { tiny: true });
  add('coffee_cup', [23.35, 31.78], 0, { tiny: true });
  // west seating group (SW corner, by the porch window)
  add('table_coffee', [23.3, 39.1], -0.15);
  add('armchair', [22.85, 39.75], 2.5, { jitter: 0.2 });
  add('armchair', [24.4, 39.6], -2.23, { jitter: 0.2 });
  add('magazine_stack', [23.3, 39.1], 0.5, { tiny: true });
  add('water_bottle', [23.55, 38.95], 0, { tiny: true });

  add('plant_floor', [23.2, 30.6]);
  add('plant_floor', [26.0, 35.95]);
  add('plant_floor', [36.2, 34.3]);
  add('plant_floor', [26.2, 39.3]);

  // credenza under the frosted glass to the cubicle floor
  add('credenza', [34.2, 30.5], PI);
  add('printer_desk', [33.9, 30.5], PI);
  add('paper_stack', [34.8, 30.5], 0, { tiny: true, jitter: 2 });
  add('plant_desk', [33.5, 30.5], 0, { tiny: true });

  // ---- Security vestibule -------------------------------------------------
  add('mat_runner', [31, 42], 0, { opts: { w: 3.0, d: 3.2 } });
  add('bench', [27.6, 42.1], PI / 2);
  add('umbrella', [27.4, 40.7], 2.4, { tiny: true });
  add('plant_floor', [34.5, 40.65]);
  add('paper_sheet', [30.2, 41.2], 0, { tiny: true, jitter: 3 });
  add('paper_sheet', [32.1, 42.8], 0, { tiny: true, jitter: 3 });

  // ---- Security office ----------------------------------------------------
  // monitor wall on the south wall, desk under it; one tipped chair (someone
  // left in a hurry). Pickups at (36,43.2)/(39.2,43.2) stay clear ±0.4.
  add('ups_box', [36.9, 43.5], 0.2, { tiny: true }); // before the desk (floor)
  add('desk_standard', [37.5, 43.3], PI, { opts: { w: 1.7 } });
  // 4 cm off the wall face: at exactly 43.84 the ground snap catches the
  // wall collider boundary and lifts the prop onto the wall top
  add('security_wall', [37.5, 43.8], PI);
  add('monitor', [37.1, 43.3], PI, { jitter: 0.15, opts: { screen: 'dashboard' } });
  add('keyboard', [37.1, 43.02], PI, { tiny: true, jitter: 0.15 });
  add('desk_phone', [38.0, 43.35], PI, { tiny: true, jitter: 0.6 });
  add('mug', [36.85, 43.5], 0, { tiny: true });
  add('paper_stack', [37.95, 43.55], 0, { tiny: true, jitter: 2 });
  add('coffee_cup', [37.35, 43.1], 0, { tiny: true });
  add('chair_task', [36.8, 42.3], -2.2, { opts: { tipped: true } });
  add('chair_task', [38.3, 42.55], PI + 0.4, { jitter: 0.5 });
  add('cabinet_file', [39.3, 40.55], 0, { opts: { drawers: 4 } });
  add('cabinet_file', [35.45, 42.2], PI / 2, { opts: { drawers: 2, open: 1 } });
  add('printer_desk', [35.45, 42.2], PI / 2);
  add('switch_shelf', [39.78, 41.6], -PI / 2);
  add('wall_calendar', [35.14, 40.55], PI / 2, { tiny: true });
  add('backpack', [39.4, 41.9], 1.1, { tiny: true });

  // ---- Visitor waiting ----------------------------------------------------
  // north rect: reading pair by the wall
  add('armchair', [15.3, 30.95], 0.12, { jitter: 0.15 });
  add('armchair', [17.1, 30.95], -0.15, { jitter: 0.15 });
  add('table_side', [16.2, 30.85]);
  add('plant_desk', [16.2, 30.85], 0, { tiny: true });
  add('briefcase', [14.6, 31.1], 0.9, { tiny: true });
  add('wall_clock', [16.5, 30.1], 0);

  // south leg: sofa corner with TV on the janitor wall
  add('sofa_3seat', [21.3, 40.8], -PI / 2);
  add('table_coffee', [19.55, 40.8], PI / 2);
  add('magazine_stack', [19.55, 40.6], 0, { tiny: true });
  add('magazine_stack', [19.6, 41.05], 0.8, { tiny: true });
  add('coffee_cup', [19.45, 40.5], 0, { tiny: true });
  add('armchair', [17.5, 39.55], 1.04, { jitter: 0.15 });
  add('armchair', [17.45, 42.15], 2.1, { jitter: 0.15 });
  add('table_side', [17.45, 40.85]);
  add('magazine_stack', [17.45, 40.85], 1.9, { tiny: true });
  add('tv_panel', [14.2, 40.8], PI / 2);
  add('cable_bundle', [14.3, 40.9], -PI / 2, { tiny: true, opts: { len: 0.9 } });
  add('coat_stand', [21.5, 38.6], 0.7);
  add('umbrella', [21.6, 38.15], -0.6, { tiny: true });
  add('backpack', [20.8, 39.55], -1.4, { tiny: true });
  add('plant_floor', [10.75, 35.5]);
  add('plant_floor', [21.45, 43.35]);
  add('plant_floor', [14.65, 38.75]);

  return P;
}
