// Room decoration: officeFloor — open-plan cubicles, conference room,
// executive corridor + office, IT workspace. Owner: fable3a.
//
// Route discipline (map.js): the two marked lanes through the cubicle floor
// stay clear (z=30 glass doors x28.5-31.5 → central aisle → north corridor
// doors x24.4-25.4 / x34.4-35.4 at z=14); central aisle z≈21.4-23.2 ≥1.4 m;
// all ENEMY_ROSTER waypoints ±0.6 m; conference keeps hostage Voss
// (48.5,41.6) ±1.2 m + guard loop clear; exec corridor center lane clear
// (hostage escort route); IT keycard pickup (53.4,16.2) gets a 0.45 m-top
// cabinet under it so the bobbing card (y 0.5±0.05) reads as sitting on it.

import { Rng } from '../../core/rng.js';
import '../props/furniture.js';
import '../props/electronics.js';
import '../props/clutter.js';

const PI = Math.PI;

// world position of a local (dx,dz) offset for a prop at (x,z) rotated `rot`
function off(x, z, rot, dx, dz) {
  const c = Math.cos(rot), s = Math.sin(rot);
  return [x + dx * c + dz * s, z - dx * s + dz * c];
}

export function decorateOfficeFloor(world) {
  const P = [];
  const r = new Rng(90210);
  const add = (prop, at, rot = 0, extra = {}) => P.push({ prop, at, rot, ...extra });

  // ------------------------------------------------------------------------
  // Open-plan cubicle floor
  // ------------------------------------------------------------------------

  // one cubicle + monitor + keyboard + believable desk clutter
  const cubicle = (x, z, rot) => {
    add('cubicle_workstation', [x, z], rot, {
      opts: { config: r.chance(0.85) ? 'U' : 'L', mirror: r.chance(0.5) },
    });
    const mdx = r.range(-0.18, 0.18);
    add('monitor', off(x, z, rot, mdx, -0.52), rot, { jitter: 0.2 });
    add('keyboard', off(x, z, rot, mdx, -0.3), rot, { tiny: true, jitter: 0.15 });
    if (r.chance(0.75)) add('mug', off(x, z, rot, r.pick([-0.55, 0.55]), -0.55), 0, { tiny: true });
    if (r.chance(0.6)) add('paper_stack', off(x, z, rot, -0.52, -0.62), rot, { tiny: true, jitter: 1 });
    if (r.chance(0.5)) add('folder_stack', off(x, z, rot, 0.55, -0.35), rot, { tiny: true, jitter: 1 });
    if (r.chance(0.45)) add('pen_cup', off(x, z, rot, 0.32, -0.66), 0, { tiny: true });
    if (r.chance(0.4)) add('desk_phone', off(x, z, rot, 0.52, -0.6), rot + r.range(-0.6, 0.6), { tiny: true });
    if (r.chance(0.35)) add('notebook_pen', off(x, z, rot, -0.25, -0.32), rot, { tiny: true, jitter: 0.8 });
    if (r.chance(0.35)) add('plant_desk', off(x, z, rot, -0.62, -0.55), 0, { tiny: true });
    if (r.chance(0.3)) add('coffee_cup', off(x, z, rot, 0.15, -0.4), 0, { tiny: true });
    if (r.chance(0.3)) add('photo_frame', off(x, z, rot, 0.6, -0.66), rot + PI + r.range(-0.5, 0.5), { tiny: true });
    if (r.chance(0.5)) {
      add('sticky_cluster', off(x, z, rot, r.range(-0.5, 0.5), -0.79), rot, { tiny: true, y: r.range(0.95, 1.15) });
    }
  };

  // pods — banks of back-to-back cubicles (rot π opens north, rot 0 south)
  for (const cx of [27.45, 29.15]) { cubicle(cx, 17.25, PI); cubicle(cx, 18.95, 0); } // pod A (2x2)
  cubicle(33.0, 17.25, PI); cubicle(33.0, 18.95, 0);                                   // pod B (2x1)
  for (const cx of [20.45, 22.15]) { cubicle(cx, 24.45, PI); cubicle(cx, 26.15, 0); } // pod C (2x2)
  cubicle(33.6, 24.45, PI); cubicle(33.6, 26.15, 0);                                   // pod D (2x1)

  // perimeter desk stations (tower goes first: floor item inside desk print)
  const station = (x, z, rot, opts = {}) => {
    const w = opts.w || 1.6;
    add('pc_tower', off(x, z, rot, r.pick([-1, 1]) * (w / 2 - 0.25), 0.08), rot, { jitter: 0.2 });
    add('desk_standard', [x, z], rot, { opts: { w } });
    add('chair_task', off(x, z, rot, r.range(-0.1, 0.1), 0.68), rot + PI, { jitter: 0.7 });
    const mdx = r.range(-0.15, 0.15);
    if (opts.dual) add('monitor_dual', off(x, z, rot, 0, -0.23), rot, { jitter: 0.1 });
    else add('monitor', off(x, z, rot, mdx, -0.22), rot, { jitter: 0.2 });
    add('keyboard', off(x, z, rot, opts.dual ? 0 : mdx, 0.12), rot, { tiny: true, jitter: 0.15 });
    if (r.chance(0.7)) add('mouse_pad', off(x, z, rot, 0.32, 0.1), rot, { tiny: true });
    if (r.chance(0.7)) add('mug', off(x, z, rot, r.pick([-0.6, 0.6]), -0.1), 0, { tiny: true });
    if (r.chance(0.6)) add('paper_stack', off(x, z, rot, -0.55, -0.2), rot, { tiny: true, jitter: 1.5 });
    if (r.chance(0.5)) add('desk_organizer', off(x, z, rot, 0.58, -0.22), rot, { tiny: true, jitter: 0.4 });
    if (r.chance(0.4)) add('headset_stand', off(x, z, rot, -0.35, -0.25), 0, { tiny: true });
  };
  station(20.0, 14.62, 0);
  station(22.0, 14.62, 0);
  station(39.35, 16.5, -PI / 2);
  station(39.35, 18.3, -PI / 2);
  station(37.0, 29.35, PI); // back to the frosted lobby glass

  // filing + print corner
  add('cabinet_file', [18.62, 21.75], PI / 2, { opts: { drawers: 4 } });
  add('cabinet_file', [18.62, 22.3], PI / 2, { opts: { drawers: 4, open: 2 } });
  add('paper_stack', [18.62, 21.75], 0.4, { tiny: true });
  add('cabinet_file', [39.55, 14.55], 0, { opts: { drawers: 4 } });
  add('cabinet_file', [39.05, 14.55], 0, { opts: { drawers: 2 } });
  add('printer_desk', [39.05, 14.55], 0.1);
  add('copier_floor', [39.3, 23.3], -PI / 2);
  add('paper_sheet', [38.9, 22.4], 0, { tiny: true, jitter: 3 });

  add('whiteboard_stand', [37.8, 15.1], 0.25, { opts: { variant: 'wbB' } });
  add('wall_clock', [30, 14.1], 0);
  add('wall_calendar', [31.5, 19.29], PI, { tiny: true });

  // life interrupted
  add('chair_task', [30.9, 25.35], 2.1, { opts: { tipped: true } });
  add('paper_sheet', [30.4, 24.9], 0, { tiny: true, jitter: 3 });
  add('paper_sheet', [25.2, 21.8], 0, { tiny: true, jitter: 3 });
  add('paper_sheet', [29.5, 20.9], 0, { tiny: true, jitter: 3 });
  add('backpack', [22.3, 27.3], -0.8, { tiny: true });
  add('drawer_unit', [26.75, 15.0], 0.1, { opts: { cushion: true } });

  add('plant_floor', [18.55, 14.72]);
  add('plant_floor', [26.9, 29.45]);
  add('plant_floor', [32.95, 29.5]);
  add('plant_floor', [24.5, 26.35]);

  add('cable_bundle', [26.6, 14.2], 0, { tiny: true, opts: { len: 1.8 } });
  add('cable_bundle', [30.8, 14.2], 0, { tiny: true, opts: { len: 2.2 } });

  // ------------------------------------------------------------------------
  // Conference room — table centered ~(46.3,38.6); KEEP CLEAR: Voss kneels at
  // (48.5,41.6) r1.2; guard loop (46.5,40.5)/(50.5,38.2)/(46,36.5) ±0.6
  // ------------------------------------------------------------------------
  add('table_conference', [46.3, 38.6], 0);
  for (const cx of [44.85, 45.95, 47.05, 48.15]) {
    add('chair_conf', [cx, 39.55], 0, { jitter: 0.12 });      // north side, docked
    add('chair_conf', [cx, 37.65], PI, { jitter: 0.12 });     // south side, docked
  }
  add('chair_conf', [43.55, 39.15], 1.9);                     // shoved back mid-meeting
  add('chair_conf', [48.75, 38.6], -PI / 2, { jitter: 0.1 });
  // table-top: an interrupted meeting
  add('laptop', [45.4, 38.35], -0.4, { tiny: true, opts: { open: true, screen: 'dashboard' } });
  add('paper_sheet', [46.7, 38.9], 0, { tiny: true, jitter: 3 });
  add('paper_sheet', [45.8, 38.15], 0, { tiny: true, jitter: 3 });
  add('notebook_pen', [47.5, 38.4], 0.8, { tiny: true });
  add('coffee_cup', [44.95, 38.85], 0, { tiny: true });
  add('coffee_cup', [47.15, 39.0], 0, { tiny: true });
  add('folder_stack', [44.5, 38.35], 0.3, { tiny: true });
  add('water_bottle', [48.0, 38.3], 0, { tiny: true });

  add('credenza', [53.42, 37.6], -PI / 2);
  add('paper_stack', [53.42, 37.15], 0, { tiny: true, jitter: 2 });
  add('mug', [53.35, 37.95], 0, { tiny: true });
  add('desk_phone', [53.45, 38.25], -PI / 2 + 0.3, { tiny: true });
  add('screen_wall', [40.14, 35.4], PI / 2);
  add('projector_ceiling', [42.1, 35.4], -PI / 2, { y: 2.97 });
  add('whiteboard_stand', [41.3, 42.3], 0.9, { opts: { variant: 'wbA' } });
  add('whiteboard_wall_office', [53.8, 40.8], -PI / 2);
  add('wall_clock', [40.13, 42.6], PI / 2);
  add('plant_floor', [40.6, 34.55]);
  add('plant_floor', [53.35, 43.3]);

  // ------------------------------------------------------------------------
  // Executive corridor — keep the central lane (z≈31.3-32.7) fully open:
  // it is the hostage escort route to the stairwell
  // ------------------------------------------------------------------------
  add('console_table', [44.0, 30.55], 0, { opts: { lamp: true } });
  add('console_table', [50.6, 30.55], 0, { opts: { lamp: true } });
  add('bench', [53.0, 33.52], PI);
  add('briefcase', [52.55, 33.5], 0.4, { tiny: true });
  add('plant_floor', [41.5, 30.6]);
  add('plant_floor', [63.45, 33.42]);

  // ------------------------------------------------------------------------
  // Executive office — desk at ~(56.8,38.5) facing the south windows; the
  // roster scout walks (58.5,38)→(60.5,41.5), both kept ±0.6 clear
  // ------------------------------------------------------------------------
  add('desk_exec', [56.8, 38.5], 0);
  add('chair_task', [56.8, 37.55], 0, { jitter: 0.4, opts: { exec: true } });
  add('chair_conf', [56.0, 39.85], PI - 0.25);
  add('chair_conf', [57.5, 39.9], PI + 0.2);
  add('monitor', [56.35, 38.3], PI, { jitter: 0.15, opts: { screen: 'memo' } });
  add('laptop', [57.25, 38.35], 0.2, { tiny: true, opts: { open: false } });
  add('desk_phone', [57.55, 38.7], PI - 0.5, { tiny: true });
  add('photo_frame', [56.15, 38.75], PI + 0.5, { tiny: true });
  add('pen_cup', [55.95, 38.3], 0, { tiny: true });
  add('paper_stack', [56.75, 38.75], PI, { tiny: true, jitter: 1 });
  add('id_badge', [57.0, 38.2], 0, { tiny: true });
  add('briefcase', [55.95, 37.15], 1.2, { tiny: true });

  add('bookcase', [54.55, 34.45], 0);
  add('bookcase', [55.45, 34.45], 0);
  add('bookcase', [56.35, 34.45], 0);
  add('cabinet_file', [57.22, 34.5], 0, { opts: { drawers: 2 } });
  add('folder_stack', [57.35, 34.55], 0.4, { tiny: true });
  add('plant_desk', [57.05, 34.45], 0, { tiny: true });

  add('sofa_3seat', [54.55, 41.2], PI / 2);
  add('table_coffee', [55.7, 41.2], PI / 2);
  add('magazine_stack', [55.7, 41.0], 0.4, { tiny: true });
  add('mug', [55.65, 41.45], 0, { tiny: true });
  add('credenza', [63.45, 39.0], -PI / 2);
  add('tray_decanter', [63.45, 38.6], 0, { tiny: true });
  add('photo_frame', [63.4, 39.45], -PI / 2 + 0.4, { tiny: true });
  add('plant_desk', [63.5, 39.7], 0, { tiny: true });
  add('plant_floor', [63.35, 43.3]);
  add('plant_floor', [60.85, 34.55]);

  // ------------------------------------------------------------------------
  // IT workspace — 4 dual-monitor benches; keycard pickup (53.4,16.2) sits on
  // a 0.45 m low cabinet; trooper walks (50,16)/(54.5,24)/(49.5,23.5)
  // ------------------------------------------------------------------------
  add('cabinet_low', [53.4, 16.2], 0);
  add('folder_stack', [53.12, 16.05], 0.5, { tiny: true });
  add('mug', [53.72, 16.38], 0, { tiny: true });

  station(48.65, 17.5, PI / 2, { dual: true, w: 1.7 });
  station(48.65, 20.0, PI / 2, { dual: true, w: 1.7 });
  station(48.9, 14.7, 0, { dual: true, w: 1.7 });
  station(55.35, 21.1, -PI / 2, { dual: true, w: 1.7 });
  add('ups_box', [48.45, 18.72], PI / 2, { tiny: true });
  add('laptop', [55.5, 21.6], -PI / 2 + 0.4, { tiny: true, opts: { open: true, screen: 'code' } });

  add('shelf_open', [48.75, 25.4], PI, { opts: { style: 'parts' } });
  add('shelf_open', [49.85, 25.4], PI, { opts: { style: 'parts' } });
  add('shelf_open', [54.7, 14.68], 0, { opts: { style: 'parts' } });
  add('crate_stack', [55.3, 25.3], -0.3);
  add('switch_shelf', [48.26, 18.75], PI / 2);
  add('cable_tray_wall', [48.22, 23.2], PI / 2, { opts: { len: 8 } });
  add('cable_tray_wall', [53.4, 14.22], 0, { opts: { len: 2.4 } });
  add('whiteboard_wall_office', [55.86, 22.4], -PI / 2);
  add('wall_calendar', [48.24, 21.5], PI / 2, { tiny: true });
  add('backpack', [48.55, 21.9], 0.9, { tiny: true });
  add('cable_bundle', [48.45, 18.6], PI / 2, { tiny: true, opts: { len: 1.6 } });
  add('cable_bundle', [52.4, 14.35], 0, { tiny: true, opts: { len: 2.2 } });
  add('cable_bundle', [55.65, 19.6], PI / 2, { tiny: true, opts: { len: 1.2 } });
  add('paper_sheet', [50.6, 20.0], 0, { tiny: true, jitter: 3 });
  add('paper_sheet', [51.8, 22.6], 0, { tiny: true, jitter: 3 });

  return P;
}
