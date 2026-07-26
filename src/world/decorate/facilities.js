// Room decoration: facilities wing + building-wide signage — owner: fable3-b.
// Rooms: break_room, restroom_m/w, restroom_hall, janitor, copy_mail,
// hallway_w, storage_n, facilities office, training. Also places every door
// plate in the building (driven by map.js DOORS), the lobby logo/directory,
// and kicks off the static decal pass.
//
// Wall-face math: interior walls are 0.16 thick centered on the grid line
// (faces at ±0.08), exterior 0.32 (faces at ±0.16). Wall props sit ~1 cm off
// the face. Placement rules honored: door spans ±0.9 m clear, patrol
// waypoints ±0.6 m, pickups reachable (±0.4 m), corridor lanes ≥1.2 m.

import * as MAP from '../map.js';
import { placeStaticDecals } from '../decals.js';
// prop module self-registration
import '../props/signage.js';
import '../props/breakroom.js';
import '../props/restroom.js';
import '../props/maintenance.js';

const PI = Math.PI;
const N = 0, S = PI, W = PI / 2, E = -PI / 2; // rotation for a prop whose +Z front faces into the room from that wall

// ---------------------------------------------------------------------------
// door plates: rooms[0] is the labeled room; the plate goes on the OTHER side
// (approach side), latch side of the span, 1.55 m up.
const PLATES = {
  d_lobby_security: ['141', 'SECURITY'],
  d_waiting_rrhall: ['', 'RESTROOMS'],
  d_janitor: ['109', 'JANITOR'],
  d_waiting_hallw: ['', 'WEST HALL'],
  d_hallw_cub: ['140', 'OPERATIONS'],
  d_hallw_copy: ['148', 'COPY & MAIL'],
  d_copy_cub: ['148', 'COPY & MAIL'],
  d_copy_stairw: ['', 'STAIR W'],
  d_corr_storage: ['114', 'STORAGE'],
  d_corr_break: ['108', 'BREAK ROOM'],
  d_corr_fac: ['110', 'FACILITIES'],
  d_corr_training1: ['112', 'TRAINING'],
  d_corr_training2: ['112', 'TRAINING'],
  d_cub_corr1: ['140', 'OPERATIONS'],
  d_cub_corr2: ['140', 'OPERATIONS'],
  d_cub_archive: ['152', 'RECORDS'],
  d_corr_archive: ['152', 'RECORDS'],
  d_corr_it: ['156', 'SYSTEMS & IT'],
  d_ehall_archive: ['152', 'RECORDS'],
  d_ehall_it: ['156', 'SYSTEMS & IT'],
  d_it_server: ['158', 'SERVER HALL'],
  d_ehall_stairc: ['', 'STAIR C'],
  d_corr_stairc: ['', 'STAIR C'],
  d_corr_mech: ['160', 'MECHANICAL'],
  d_conf_glass: ['120', 'CONFERENCE'],
  d_lobby_conf: ['120', 'CONFERENCE'],
  d_corr_exec: ['130', 'EXECUTIVE SUITE'],
  d_bland_corr: ['B1', 'SERVICE CORR'],
  d_bcorr_utility: ['B12', 'UTILITY'],
  d_bcorr_loading: ['B14', 'LOADING'],
  d_utility_loading: ['B14', 'LOADING'],
  d_bcorr_garage: ['B20', 'GARAGE'],
  d_loading_garage: ['B20', 'GARAGE'],
  d_bfinger_garage: ['B20', 'GARAGE'],
};

function doorPlates() {
  const out = [];
  for (const [id, [num, text]] of Object.entries(PLATES)) {
    const d = MAP.DOORS.find((dd) => dd.id === id);
    if (!d || d.rooms[0] === d.rooms[1]) continue;
    const fy = MAP.LEVELS[d.level].y;
    const lateral = d.span[1] + 0.3;
    // which side of the wall is rooms[1] (the approach room)?
    const probe = (s) => {
      const [px, pz] = d.dir === 'x' ? [lateral, d.line + s] : [d.line + s, lateral];
      return MAP.roomAt(px, pz, fy)?.id;
    };
    for (const s of [0.5, -0.5]) {
      if (probe(s) !== d.rooms[1]) continue;
      const off = Math.sign(s) * 0.095;
      const at = d.dir === 'x' ? [lateral, d.line + off] : [d.line + off, lateral];
      const rot = d.dir === 'x' ? (s > 0 ? N : S) : (s > 0 ? W : E);
      out.push({ prop: 'sign_doorplate', at, y: fy + 1.55, rot, opts: { num, text } });
      break;
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
export function decorateFacilities(world) {
  // static decals bake alongside the prop pass (world.group exists by now)
  try { placeStaticDecals(world, world.group); } catch (e) { console.error('[decals] static pass failed', e); }

  const p = [];
  const add = (prop, at, rot = 0, opts = {}, extra = {}) => p.push({ prop, at, rot, opts, ...extra });

  // ==== global signage =====================================================
  p.push(...doorPlates());
  // lobby: backlit logo on the bulkhead frieze band (y 3.08..3.68, face z 30.26)
  add('sign_logo_backlit', [31, 30.34], N, { layout: 'band', w: 4.9 }, { y: 3.38 });
  add('sign_directory', [22.12, 31.4], W, {}, { y: 1.55 });
  add('sign_evac', [22.12, 32.35], W, { level: 'g', here: [31, 35] }, { y: 1.42 });
  // vestibule: badge notice beside the lobby doors
  add('sign_notice', [28.5, 40.09], N, { variant: 'badge' }, { y: 1.5 });
  add('sign_notice', [33.5, 40.09], N, { variant: 'blizzard' }, { y: 1.5 });
  // dept plates at landmark doors (corridor side of the wall)
  add('sign_dept_plate', [26.6, 10.1], N, { text: 'BREAK ROOM', sub: 'PEOPLE & CULTURE' }, { y: 2.0 });
  add('sign_dept_plate', [47.6, 10.1], N, { text: 'TRAINING CENTER', sub: 'PEOPLE & CULTURE' }, { y: 2.0 });
  add('sign_dept_plate', [37.6, 10.1], N, { text: 'FACILITIES', sub: 'BUILDING SERVICES' }, { y: 2.0 });
  add('sign_dept_plate', [42.6, 13.9], S, { text: 'RECORDS ARCHIVE', sub: 'RECORDS DIVISION' }, { y: 2.0 });

  // ==== break_room (22..34 × 0..10) — vinyl, windows N (sill .85) ==========
  // kitchen run against the north wall (encloses the radiator), medkit at
  // (23.2,1.4) stays reachable, patrol loop 24,4→31.5,3→32,8.5→23.5,8 clear.
  add('cabinet_lower', [23.5, 0.47], N, { len: 2.4 }, { y: 0 });
  add('counter_sink', [25.9, 0.47], N, { len: 2.4 }, { y: 0 });
  add('cabinet_lower', [28.3, 0.47], N, { len: 2.4 }, { y: 0 });
  add('cabinet_upper', [22.6, 0.33], N, { len: 0.75 }, { y: 0 });
  add('cabinet_upper', [33.5, 0.33], N, { len: 0.75 }, { y: 0 });
  add('microwave', [28.0, 0.5], N, {}, {});          // lands on the counter top
  add('coffee_machine', [27.1, 0.45], N);
  add('kettle', [24.3, 0.45], N, {}, { tiny: true });
  add('mug_set', [24.9, 0.5], N, { n: 4 }, { tiny: true });
  add('snack_set', [28.9, 0.5], N, { n: 4 }, { tiny: true });
  add('dispenser_pair', [22.1, 1.1], W, {}, { y: 1.35 });
  // cold wall (east, shared with facilities office)
  add('fridge', [33.55, 2.0], E, {}, { y: 0 });
  add('vending_machine', [33.52, 3.65], E, {}, { y: 0 });
  add('water_cooler', [33.74, 5.1], E, {}, { y: 0 });
  // seating (kept off the patrol ring)
  add('break_table', [26.3, 5.6], 0, {}, { jitter: 0.4 });
  add('break_table', [29.3, 5.7], 0, {}, { jitter: 0.4 });
  // tabletop clutter (after the tables so groundAt lands on the tops)
  add('snack_set', [29.3, 5.7], E, { n: 3 }, { tiny: true });
  add('mug_set', [26.3, 5.6], 0, { n: 2 }, { tiny: true });
  for (const [tx, tz, cn] of [[26.3, 5.6, 3], [29.3, 5.7, 3]]) {
    const angles = [0.4, 2.2, 4.2];
    for (let i = 0; i < cn; i++) {
      const a = angles[i] + (tx > 27 ? 0.7 : 0);
      add('cafe_chair', [tx + Math.sin(a) * 0.85, tz + Math.cos(a) * 0.85], a + PI, {}, { jitter: 0.5 });
    }
  }
  add('bin_pair', [31.4, 9.55], S, {}, { y: 0 });
  add('sign_corkboard', [24.5, 9.9], S, { seed: 3 }, { y: 1.55 });
  add('sign_notice', [30.5, 9.9], S, { variant: 'recycle' }, { y: 1.45 });
  add('sign_poster', [22.1, 4.6], W, { design: 'glacier' }, { y: 1.5 });
  // audit 1: south wall cluster — week menu + kitchen-etiquette poster by the
  // door, wall-mounted extinguisher kitchen-side (door span 26.5..29.3 clear)
  add('sign_notice', [25.45, 9.9], S, { variant: 'menu' }, { y: 1.52 });
  add('sign_poster', [26.12, 9.9], S, { design: 'kitchen' }, { y: 1.5 });
  add('fire_extinguisher', [29.45, 9.8], S, { bracket: true }, { y: 0.75 });
  add('smoke_detector', [28, 5], 0, {}, { y: 2.97, tiny: true });

  // ==== restroom_m (0..6 × 30..37) — stalls W, sinks E, urinals N ==========
  add('urinal', [2.1, 30.17], N, { divider: true }, { y: 0 });
  add('urinal', [3.3, 30.17], N, {}, { y: 0 });
  add('stall_run', [0.2, 35.0], W, { n: 2, open: 1 }, { y: 0 });
  add('sink_counter', [5.63, 35.6], E, { len: 2.0 }, { y: 0 });
  add('hand_dryer', [5.83, 31.5], E, {}, { y: 1.2 });
  add('rr_dispensers', [3.0, 36.86], S, {}, { y: 1.25 });
  add('bin_small', [5.4, 36.4], 0, {}, { y: 0, tiny: true });
  add('floor_drain', [3, 33.5], 0, {}, { y: 0, tiny: true });
  add('sign_notice', [4.8, 30.18], N, { variant: 'handwash' }, { y: 1.55 });

  // ==== restroom_w (0..6 × 37..44) ==========================================
  add('stall_run', [0.2, 41.0], W, { n: 3 }, { y: 0 });
  add('sink_counter', [5.63, 42.6], E, { len: 2.0 }, { y: 0 });
  add('hand_dryer', [5.83, 38.4], E, {}, { y: 1.2 });
  add('rr_dispensers', [3.0, 37.14], N, {}, { y: 1.25 });
  add('bin_small', [5.4, 43.4], 0, {}, { y: 0, tiny: true });
  add('floor_drain', [3, 40.5], 0, {}, { y: 0, tiny: true });
  add('sign_notice', [1.2, 43.82], S, { variant: 'handwash' }, { y: 1.55 });

  // ==== restroom_hall (6..10 × 30..44) ======================================
  // audit 1: west wall was a bare plaster field — dressed with the framed
  // evac plan (moved from the east wall), a fountain between the doors and a
  // directional M/W plate at the south end; scuff band lives in decals.js.
  add('sign_pictogram', [6.09, 32.35], W, { kind: 'm' }, { y: 1.62 });
  add('sign_pictogram', [6.09, 39.35], W, { kind: 'w' }, { y: 1.62 });
  add('hall_bench', [9.68, 36.8], E, {}, { y: 0 });
  add('sign_poster', [6.09, 36.6], W, { design: 'glacier' }, { y: 1.5 });
  add('sign_evac', [6.09, 34.9], W, { level: 'g', here: [8, 36] }, { y: 1.45 });
  add('water_fountain', [6.09, 37.6], W, {}, { y: 0 });
  add('sign_picto_dir', [6.09, 42.2], W, { dir: 'right' }, { y: 1.62 });
  add('sign_art_print', [9.91, 35.3], E, { design: 'drift', w: 0.56 }, { y: 1.6 });
  add('plant_util', [6.6, 43.3], 0, {}, { y: 0 });
  add('floor_drain', [8, 37], 0, {}, { y: 0, tiny: true });
  add('smoke_detector', [8, 34], 0, {}, { y: 2.97, tiny: true });

  // ==== waiting (10..22 × 30..44 L) — walls only, furniture is 3a's =========
  // audit 1: bare inner walls → framed original prints, a clock on the band
  // above the lobby opening, and a hung wayfind toward reception/restrooms.
  add('sign_art_print', [19.1, 30.1], N, { design: 'ridge' }, { y: 1.62 });
  add('sign_art_print', [20.35, 30.1], N, { design: 'drift', w: 0.54 }, { y: 1.58 });
  add('sign_art_print', [21.92, 31.55], E, { design: 'field' }, { y: 1.6 });
  add('sign_clock', [21.92, 37.5], E, {}, { y: 1.78 }); // south pier beside the opening
  add('sign_wayfind', [20.9, 35.0], W, { text: '\u2190 RESTROOMS      RECEPTION \u2192', w: 1.8 }, { y: 2.98 });

  // ==== janitor (10..14 × 38..44) — door W (40.2..41.2), keep swing clear ===
  add('mop_sink', [13.3, 43.5], S, {}, { y: 0 });
  add('utility_shelf', [13.68, 39.35], E, { bays: 2 }, { y: 0 });
  add('janitor_cart', [11.5, 43.0], 0.5, {}, { y: 0 });
  add('mop_bucket', [12.4, 41.9], 1.2, {}, { y: 0 });
  add('broom', [10.24, 38.6], 0, {}, { y: 0, tiny: true }); // tip rests on the W wall (audit 1)
  add('bottle_set', [13.1, 41.5], 0, { n: 4 }, { y: 0, tiny: true });
  add('traffic_cone', [10.65, 43.35], 0, {}, { y: 0 });
  add('wet_floor_sign', [10.7, 42.35], 0.7, {}, { y: 0 });
  add('pipe_run', [12, 43.72], N, { len: 3.6, n: 2 }, { y: 2.2 });
  add('sign_notice', [10.09, 39.3], W, { variant: 'keys' }, { y: 1.5 });

  // ==== copy_mail (10..18 × 16..24) — window W stays open ==================
  add('work_counter', [12.35, 16.55], N, { len: 3.4 }, { y: 0 });
  add('mail_sorter', [17.75, 17.7], E, { w: 1.6 }, { y: 1.35 });
  add('utility_shelf', [11.45, 23.68], S, { bays: 2 }, { y: 0 });
  add('cutting_table', [15.8, 21.7], 0.1, {}, { y: 0 });
  add('paper_box_stack', [10.75, 16.95], 0.2, { n: 3 }, { y: 0 });
  add('paper_box_stack', [13.6, 16.6], 0, { n: 2 }, {});   // groundAt lands this on the counter top
  add('bin_pair', [17.35, 23.5], S, {}, { y: 0 });
  add('records_box', [11.6, 16.55], 0.3, {}, { tiny: true });
  add('mug_set', [15.3, 21.7], 0, { n: 2 }, { tiny: true });
  add('sign_notice', [16.6, 23.9], S, { variant: 'recycle' }, { y: 1.45 });
  add('sign_notice', [11.4, 16.17], N, { variant: 'blizzard' }, { y: 1.5 });
  add('smoke_detector', [14, 20], 0, {}, { y: 2.97, tiny: true });

  // ==== hallway_w (10..18 × 24..30) =========================================
  add('sign_corkboard', [10.18, 27.6], W, { seed: 7 }, { y: 1.55 });
  add('sign_poster', [10.18, 25.3], W, { design: 'posture' }, { y: 1.5 });
  add('hall_bench', [16.35, 24.3], N, {}, { y: 0 });
  add('plant_util', [17.45, 29.45], 0, {}, { y: 0 });
  add('sign_evac', [17.92, 28.7], E, { level: 'g', here: [14, 27] }, { y: 1.45 });
  add('sign_wayfind', [14, 27], N, { text: '\u2190 RESTROOMS · LOBBY      OFFICE FLOOR \u2192', w: 2.0 }, { y: 2.98 });

  // ==== storage_n (18..22 × 0..10) — ammo pickup (21, 8.8) reachable =======
  add('utility_shelf', [18.31, 2.0], W, { bays: 3 }, { y: 0 });
  add('utility_shelf', [18.31, 5.2], W, { bays: 3 }, { y: 0 });
  add('utility_shelf', [21.69, 2.85], E, { bays: 3 }, { y: 0 });
  add('utility_shelf', [19.9, 0.39], N, { bays: 2 }, { y: 0 });
  add('ladder_aframe', [21.3, 6.3], 0.6, {}, { y: 0 });
  add('chair_stack', [18.75, 7.7], W, {}, { y: 0 });
  add('chair_stack', [18.78, 8.65], W + 0.15, {}, { y: 0 });
  add('box_cardboard', [21.45, 5.6], 0.4, { size: 'm', stack: 2 }, { y: 0 });
  add('box_cardboard', [20.6, 0.85], 0.2, { size: 'l' }, { y: 0 });
  add('traffic_cone', [21.6, 7.3], 0, {}, { y: 0, tiny: true });
  // audit 1: floor was thin — box piles staged by the west shelf + a parked
  // hand truck (center aisle to the ammo pickup stays ≥1.4 m)
  add('box_cardboard', [19.05, 3.1], 0.7, { size: 'm', stack: 3 }, { y: 0 });
  add('box_cardboard', [19.75, 2.55], 1.3, { size: 's', stack: 2 }, { y: 0 });
  add('hand_truck', [21.2, 4.5], -2.1, {}, { y: 0 });
  add('label_small', [18.56, 1.2], W, { text: 'ND-ST-114', style: 'equip' }, { y: 1.62, tiny: true });
  add('sign_notice', [19.9, 9.9], S, { variant: 'keys' }, { y: 1.5 });

  // ==== facilities office (34..44 × 0..10) ==================================
  add('workbench', [34.45, 3.2], W, { w: 1.8 }, { y: 0 });
  add('utility_shelf', [43.62, 6.6], E, { bays: 2 }, { y: 0 });
  add('clipboard_row', [43.82, 4.0], E, { n: 4 }, { y: 1.5 });
  add('key_cabinet', [37.4, 9.9], S, {}, { y: 1.5 });
  add('sign_notice', [36.6, 9.9], S, { variant: 'keys' }, { y: 1.45 });
  add('whiteboard_wall', [35.8, 9.89], S, { content: 'facility', w: 1.7 }, { y: 1.5 });
  add('boot_tray', [40.8, 9.35], S, { n: 2 }, { y: 0, tiny: true });
  add('coat_hooks', [40.8, 9.9], S, { n: 4 }, { y: 1.7 });
  add('training_table', [39.2, 4.6], N, {}, { y: 0 });
  add('cafe_chair', [38.7, 5.5], S + 0.3, {}, { y: 0 });
  add('cafe_chair', [39.8, 3.8], N - 0.2, {}, { y: 0 });
  add('records_box', [39.6, 4.5], 0.4, { lidOff: true }, {});
  add('tool_case', [36.9, 8.9], 0.9, {}, { y: 0, tiny: true });
  add('plant_util', [43.45, 0.85], 0, {}, { y: 0 });
  add('sign_poster', [34.28, 6.3], W, { design: 'lift' }, { y: 1.5 });
  add('smoke_detector', [39, 5], 0, {}, { y: 2.97, tiny: true });

  // ==== training (44..64 × 0..10) — marksman lane z 2.3..4.0 stays clear ====
  const cols = [46.3, 51.5, 54.3, 61.3];
  for (const [ri, rz] of [[0, 6.0], [1, 7.9]]) {
    for (const cx of cols) {
      add('training_table', [cx, rz], N, {}, { y: 0 });
      add('cafe_chair', [cx - 0.45, rz + 0.62], N, {}, { y: 0, jitter: 0.5 });
      add('cafe_chair', [cx + 0.45, rz + 0.62], N, {}, { y: 0, jitter: 0.5 });
    }
  }
  add('lectern', [52.9, 1.55], 2.7, {}, { y: 0 });
  add('chair_stack', [63.5, 4.9], E, {}, { y: 0 });
  add('chair_stack', [63.45, 5.9], E - 0.2, {}, { y: 0 });
  add('whiteboard_wall', [44.1, 4.0], W, { content: 'training', w: 2.2 }, { y: 1.5 });
  add('sign_poster', [50.8, 9.9], S, { design: 'exits' }, { y: 1.55 });
  add('sign_poster', [52.0, 9.9], S, { design: 'ice' }, { y: 1.55 });
  add('sign_poster', [53.2, 9.9], S, { design: 'cleandesk' }, { y: 1.55 });
  add('sign_evac', [54.35, 9.9], S, { level: 'g', here: [54, 6] }, { y: 1.5 });
  add('mug_set', [51.5, 6.0], 0, { n: 2 }, { tiny: true });
  add('records_box', [61.3, 7.9], 0.2, {}, { tiny: true });
  add('smoke_detector', [50, 5], 0, {}, { y: 2.97, tiny: true });
  add('smoke_detector', [59, 5], 0, {}, { y: 2.97, tiny: true });

  return p;
}
