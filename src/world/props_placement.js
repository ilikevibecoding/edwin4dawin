// Room-by-room prop composition for the Northstar Administrative Center.
// (Fable 2 composition + Fable 3 library.) Deterministic, collision-aware.
// Coordinates: +X east, +Z south. Facing convention for rot (degrees):
//   0 faces north (-Z), 180 faces south (+Z), -90 faces east (+X), 90 faces west (-X).
import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
import { Rng } from '../core/rng.js';
import { PROPS as OFFICE } from '../assets/props_office.js';
import { PROPS as FACILITY } from '../assets/props_facility.js';
import { PROPS as CLUTTER } from '../assets/props_clutter.js';

const ALL = { ...OFFICE, ...FACILITY, ...CLUTTER };

const METAL_PROPS = new Set(['filing_cabinet_4d', 'shelf_unit', 'rack_archive', 'server_rack', 'fridge',
  'vending_machine', 'ups_unit', 'panel_electrical', 'transformer_cab', 'fire_cabinet', 'shelf_utility',
  'hand_truck', 'ladder_step', 'barrier_loading', 'van_cargo', 'cart_janitor', 'copier_large', 'water_cooler',
  'hand_dryer', 'cable_tray', 'duct_run', 'pipe_run', 'light_emergency']);
const PLASTIC_PROPS = new Set(['chair_task', 'chair_conf', 'chair_waiting', 'bin_trash', 'bin_recycle',
  'cone_warning', 'monitor', 'monitor_dual', 'pc_tower', 'printer_desk', 'phone_desk', 'keyboard', 'tv_security']);

export function placeProps(game) {
  const group = new THREE.Group();
  group.name = 'props';
  const rng = new Rng(90210);
  const coll = game.world.collision;
  const missing = new Set();

  function build(id, opts) {
    const def = ALL[id];
    if (!def) { missing.add(id); return null; }
    try { return def.build(opts || {}); } catch (e) {
      console.error('[props] build failed:', id, e);
      return null;
    }
  }

  function place(id, x, z, rotDeg = 0, opts = {}) {
    const obj = build(id, opts.build);
    if (!obj) return null;
    const fy = opts.fy ?? 0;
    const y = fy + (opts.dy ?? 0);
    obj.position.set(x, y, z);
    const rot = (rotDeg * Math.PI) / 180;
    obj.rotation.y = rot;
    group.add(obj);
    if (!opts.noCollision && obj.userData?.collision?.length) {
      const material = METAL_PROPS.has(id) ? 'metal' : PLASTIC_PROPS.has(id) ? 'plastic' : 'wood';
      for (const c of obj.userData.collision) {
        const wb = rotatedAabb(c, rot, x, y, z);
        coll.addBox(wb.min, wb.max, { tag: 'prop', material, penetrable: true, vision: opts.vision !== false });
      }
    }
    return obj;
  }

  // wall/ceiling mounted: prop bbox CENTER lands at absolute height y
  // (prop origins vary, so measure and correct)
  const _box = new THREE.Box3();
  function mount(id, x, y, z, rotDeg = 0, opts = {}) {
    const obj = place(id, x, z, rotDeg, { ...opts, dy: 0, noCollision: opts.noCollision ?? true });
    if (!obj) return null;
    _box.setFromObject(obj);
    if (isFinite(_box.min.y)) {
      const centerY = (_box.min.y + _box.max.y) / 2;
      obj.position.y += y + (opts.fy ?? 0) - centerY;
    } else {
      obj.position.y = y;
    }
    return obj;
  }

  // a dressed workstation: desk + chair + monitor + keyboard + clutter
  function workstation(x, z, rotDeg, opts = {}) {
    const fy = opts.fy ?? 0;
    place(opts.desk || 'desk_standard', x, z, rotDeg, { fy });
    const rot = (rotDeg * Math.PI) / 180;
    const fwd = { x: -Math.sin(rot), z: -Math.cos(rot) };
    const right = { x: Math.cos(rot), z: -Math.sin(rot) };
    const deskTop = 0.74;
    const chairD = 0.75 + rng.float(0, 0.25);
    place('chair_task', x - fwd.x * chairD + right.x * rng.float(-0.15, 0.15), z - fwd.z * chairD + right.z * rng.float(-0.15, 0.15),
      rotDeg + rng.float(-35, 35), { fy, build: { color: rng.pick(['gray', 'gray', 'blue']) } });
    const dual = opts.dual ?? rng.chance(0.35);
    const monOff = rng.float(-0.15, 0.15);
    place(dual ? 'monitor_dual' : 'monitor', x + fwd.x * 0.24 + right.x * monOff, z + fwd.z * 0.24 + right.z * monOff,
      rotDeg, { fy, dy: deskTop, noCollision: true, build: { on: opts.screenOn ?? rng.chance(0.6) } });
    place('keyboard', x - fwd.x * 0.06, z - fwd.z * 0.06, rotDeg + rng.float(-6, 6), { fy, dy: deskTop, noCollision: true });
    place('mouse_pad_set', x - fwd.x * 0.08 + right.x * 0.34, z - fwd.z * 0.08 + right.z * 0.34, rotDeg, { fy, dy: deskTop, noCollision: true });
    if (rng.chance(0.5)) place('pc_tower', x + right.x * 0.65, z + right.z * 0.65, rotDeg, { fy });
    const clutterPool = ['paper_stack', 'folder_stack', 'mug', 'pen_cup', 'notebook', 'sticky_notes', 'frame_photo', 'cup_coffee_togo', 'bottle_water', 'desk_organizer', 'plant_desk_small'];
    const n = rng.int(1, 3);
    for (let i = 0; i < n; i++) {
      const cid = rng.pick(clutterPool);
      const cx = x + right.x * rng.float(-0.6, 0.6) + fwd.x * rng.float(0.1, 0.3);
      const cz = z + right.z * rng.float(-0.6, 0.6) + fwd.z * rng.float(0.1, 0.3);
      place(cid, cx, cz, rng.float(0, 360), { fy, dy: deskTop, noCollision: true, build: { color: rng.pick(['red', 'navy', 'white']) } });
    }
  }

  // 4-desk cubicle pod: EW spine panel + NS end panels; desks face the spine
  function pod(xc, zc, opts = {}) {
    const fy = opts.fy ?? 0;
    place('cubicle_panel', xc, zc, 0, { fy, build: { w: 3.5 } });
    place('cubicle_panel', xc - 1.72, zc, 90, { fy, build: { w: 1.9 } });
    place('cubicle_panel', xc + 1.72, zc, 90, { fy, build: { w: 1.9 } });
    const spots = [
      [xc - 0.88, zc - 0.55, 180], [xc + 0.88, zc - 0.55, 180],
      [xc - 0.88, zc + 0.55, 0], [xc + 0.88, zc + 0.55, 0],
    ];
    for (const [x, z, r] of spots) {
      if (opts.skip && rng.chance(opts.skip)) continue;
      workstation(x, z, r, { fy });
    }
  }

  // ------------------------------------------------------------- courtyard/vestibule
  place('mat_floor', -38.9, 0, 90);
  place('snow_boot_tray', -37.5, 1.2, 90);
  place('mat_floor', -36.3, 0, 90);
  mount('notice_board', -35, 1.35, -2.83, 180);
  place('bin_trash', -37.3, 2.4, 0);
  place('umbrella', -37.6, -2.5, 15, { noCollision: true });
  place('decal_wet_floor_sign', -33.6, 1.2, 30);

  // ------------------------------------------------------------- first aid
  place('table_side', -36.8, -7.8, 0);
  mount('fire_cabinet', -32.4, 1.0, -6, -90);
  place('shelf_unit', -34.5, -8.5, 0);
  place('box_cardboard', -36.9, -5, 20, { build: { size: 'm' } });
  mount('poster_safety', -35, 1.5, -3.25, 0, { build: { variant: 1 } });
  place('chair_waiting', -36.8, -4.2, 120);

  // ------------------------------------------------------------- lobby
  place('desk_reception', -27.5, -0.5, 90);
  place('chair_task', -26.5, -1.3, 100, { build: { color: 'gray' } });
  place('chair_task', -26.5, 0.6, 75, { build: { color: 'gray' } });
  place('monitor', -27.2, -1.1, 90, { dy: 0.74, noCollision: true, build: { on: true } });
  place('phone_desk', -27.25, 0.2, 90, { dy: 0.74, noCollision: true });
  place('paper_stack', -27.3, -0.3, 45, { dy: 0.74, noCollision: true });
  place('badge_id', -27.2, 0.7, 10, { dy: 0.74, noCollision: true });
  place('plant_pot_large', -31.2, -8, 0);
  place('plant_pot_large', -20.9, 6.1, 0);
  place('brochure_stand', -29.8, 6.4, 20);
  mount('sign_directional', -22.5, 1.9, 6.83, 0, {
    build: { entries: [['OFFICE FLOOR', 'e'], ['RECORDS', 'n'], ['WAITING', 'w']] },
  });
  place('mat_floor', -31.2, 0, 90);

  // ------------------------------------------------------------- waiting
  place('sofa_2seat', -37.15, 5.4, -90);
  place('sofa_2seat', -37.15, 8.6, -90);
  place('table_side', -35.9, 7, 0);
  place('brochure_stand', -33.2, 3.6, 160);
  place('chair_waiting', -34, 4.5, 210);
  place('chair_waiting', -33.4, 10.6, 320);
  place('plant_pot_large', -37.3, 11.2, 0);
  mount('clock_wall', -32.25, 2.2, 7.5, 90);
  mount('poster_safety', -37.83, 1.5, 10.5, -90, { build: { variant: 2 } });
  place('cup_paper', -35.8, 6.9, 0, { dy: 0.45, noCollision: true });

  // ------------------------------------------------------------- records
  for (let i = 0; i < 4; i++) place('rack_archive', -35.6 + i * 1.9, -16, 0);
  place('filing_cabinet_4d', -37.4, -11.2, -90);
  place('filing_cabinet_4d', -37.4, -12.0, -90);
  place('filing_cabinet_4d', -37.4, -12.8, -90, { build: { drawerOpen: true } });
  place('ladder_step', -33, -12.6, 40);
  place('desk_standard', -31.5, -10.7, 180);
  place('chair_task', -31.4, -10.0, 200);
  place('laptop', -31.6, -10.8, 185, { dy: 0.74, noCollision: true, build: { open: true } });
  place('box_cardboard', -29.3, -20.6, 15, { build: { size: 'l' } });
  place('box_cardboard', -29.5, -19.6, 70, { build: { size: 'm' } });
  place('paper_pile_messy', -34, -20.8, 0, { noCollision: true });

  // ------------------------------------------------------------- file room
  place('filing_cabinet_4d', -27.2, -21.4, 180);
  place('filing_cabinet_4d', -26.4, -21.4, 180);
  place('filing_cabinet_4d', -25.6, -21.4, 180, { build: { drawerOpen: true } });
  place('shelf_unit', -21.6, -21.4, 180);
  place('box_cardboard', -21, -19.9, 30, { build: { size: 'm', open: true } });

  // ------------------------------------------------------------- copymail
  place('copier_large', -18.7, -21.1, 180);
  place('kitchen_counter_run', -13.5, -21.6, 180, { build: { length: 4.5, sink: false } });
  place('printer_desk', -12.6, -21.5, 180, { dy: 0.92, noCollision: true });
  place('paper_stack', -14.6, -21.5, 10, { dy: 0.92, noCollision: true });
  place('paper_stack', -14.2, -21.4, 75, { dy: 0.92, noCollision: true });
  place('shelf_unit', -10.5, -18, 90);
  place('bin_recycle', -17.5, -20.8, 0);
  place('bin_trash', -17, -20.8, 0);
  place('box_cardboard', -11.2, -20.8, 55, { build: { size: 's' } });
  mount('corkboard', -19.9, 1.5, -17.5, -90);
  place('paper_pile_messy', -15.5, -15.5, 0, { noCollision: true });

  // ------------------------------------------------------------- conference (hostage A at -8.2,-20.3)
  place('table_conference', -3.5, -18, 90);
  for (let i = 0; i < 4; i++) {
    place('chair_conf', -5.6 + i * 1.45, -19.3, 180 + rng.float(-14, 14));
    place('chair_conf', -5.6 + i * 1.45, -16.7, rng.float(-14, 14));
  }
  place('chair_conf', -0.9, -18, 90 + rng.float(-10, 10));
  mount('screen_projection', -9.88, 1.15, -18, -90);
  mount('projector_ceiling', -6.5, 2.55, -18, 0);
  mount('whiteboard', 2.88, 1.1, -18, 90);
  place('drawer_unit', -0.5, -21.5, 180);
  place('drawer_unit', 0.35, -21.5, 180);
  place('water_cooler', 2.3, -21.4, 180);
  for (let i = 0; i < 3; i++) place('bottle_water', -4.5 + i * 1.2, -18 + rng.float(-0.35, 0.35), rng.float(0, 360), { dy: 0.76, noCollision: true });
  place('paper_sheet', -3, -17.6, 30, { dy: 0.76, noCollision: true });
  place('folder_stack', -2.2, -18.4, 80, { dy: 0.76, noCollision: true });

  // ------------------------------------------------------------- breakroom
  place('kitchen_counter_run', 7.4, -21.55, 180, { build: { length: 7.5, sink: true } });
  place('fridge', 3.6, -21.35, 180);
  place('microwave', 5.2, -21.5, 180, { dy: 0.92, noCollision: true });
  place('coffee_machine', 6.2, -21.55, 180, { dy: 0.92, noCollision: true });
  place('kettle', 6.9, -21.5, 180, { dy: 0.92, noCollision: true });
  place('mug', 7.6, -21.45, 40, { dy: 0.92, noCollision: true, build: { color: 'red' } });
  place('mug', 7.9, -21.55, 190, { dy: 0.92, noCollision: true, build: { color: 'navy' } });
  place('plate_stack', 8.6, -21.5, 0, { dy: 0.92, noCollision: true });
  place('vending_machine', 11.3, -20.2, 90, { build: { variant: 'snacks' } });
  place('vending_machine', 11.3, -19.0, 90, { build: { variant: 'drinks' } });
  place('water_cooler', 11.35, -17.6, 90);
  place('table_break', 5.6, -17.5, 0);
  place('table_break', 8.8, -16.6, 0);
  for (const [tx, tz] of [[5.6, -17.5], [8.8, -16.6]]) {
    const n = rng.int(2, 3);
    for (let i = 0; i < n; i++) {
      const a = rng.angle();
      place('chair_waiting', tx + Math.cos(a) * 0.95, tz + Math.sin(a) * 0.95, (-a * 180) / Math.PI - 90 + rng.float(-15, 15));
    }
  }
  place('snack_box', 5.4, -17.4, 20, { dy: 0.75, noCollision: true });
  place('can_soda', 8.9, -16.5, 0, { dy: 0.75, noCollision: true });
  place('wrapper_snack', 8.6, -16.8, 70, { dy: 0.75, noCollision: true });
  place('bin_trash', 3.6, -14.7, 0);
  place('bin_recycle', 4.25, -14.7, 0);
  mount('dispenser_towel', 9.6, 1.25, -21.85, 180);
  mount('notice_board', 6.5, 1.45, -14.2, 0);
  mount('clock_wall', 3.25, 2.2, -18, -90);

  // ------------------------------------------------------------- IT room
  workstation(14.5, -20.8, 180, { dual: true, screenOn: true });
  workstation(16.6, -20.8, 180, { dual: true });
  place('shelf_unit', 20.5, -19, 90);
  place('shelf_unit', 20.5, -17.6, 90);
  place('box_cardboard', 20, -15.8, 25, { build: { size: 'm', open: true } });
  place('server_rack', 12.6, -19.5, -90, { build: { ledsOn: false } });
  place('ups_unit', 12.6, -18.3, -90);
  place('tool_case', 15.6, -19.2, 60, { noCollision: true });
  place('cable_bundle', 15, -18.5, 15, { noCollision: true });
  place('laptop', 16.4, -20.65, 175, { dy: 0.74, noCollision: true, build: { open: true } });
  mount('corkboard', 13.5, 1.5, -14.25, 0);
  place('bin_trash', 19.9, -14.9, 0);

  // ------------------------------------------------------------- server room
  for (let i = 0; i < 3; i++) {
    place('server_rack', 23 + i * 1.15, -19.9, 180, { build: { ledsOn: true } });
    place('server_rack', 23 + i * 1.15, -16.4, 0, { build: { ledsOn: true } });
  }
  place('ups_unit', 27.6, -20.8, 180);
  place('ups_unit', 28.5, -20.8, 180);
  mount('panel_electrical', 29.55, 1.1, -18, 90);
  place('cable_bundle', 25, -18, 80, { noCollision: true });
  place('cone_warning', 26.5, -15.2, 0, { noCollision: true });

  // ------------------------------------------------------------- north corridor
  mount('sign_directional', -18, 1.9, -13.85, 180, { build: { entries: [['CONFERENCE', 'e'], ['LOBBY', 's'], ['COPY & MAIL', 'w']] } });
  mount('sign_directional', 22, 1.9, -13.85, 180, { build: { entries: [['SERVER ROOM', 'e'], ['IT SUPPORT', 'w'], ['LOADING', 's']] } });
  mount('fire_cabinet', -8, 1.0, -13.85, 180);
  place('fire_extinguisher', 24.7, -13.7, 0, { noCollision: true });
  mount('poster_safety', 6, 1.5, -13.87, 180, { build: { variant: 3 } });
  place('plant_pot_large', -19.4, -13.6, 0);

  // ------------------------------------------------------------- open floor
  const podXs = [-14.6, -9.1, -3.6, 1.9];
  for (const px of podXs) pod(px, -6.0);
  pod(-14.6, 0.9);
  pod(-9.1, 0.9);
  pod(1.9, 0.9, { skip: 0.25 });
  // collaboration corner
  place('table_break', -3.4, 0.9, 0);
  place('chair_waiting', -4.35, 0.6, 100 + rng.float(-10, 10));
  place('chair_waiting', -2.55, 1.3, 260);
  // print station + perimeter
  place('copier_large', 6.9, 6.1, 0);
  place('printer_desk', 5.4, 6.3, 0);
  place('paper_stack', 5.9, 6.2, 15, { noCollision: true });
  place('filing_cabinet_4d', -19.45, 3.2, -90);
  place('filing_cabinet_4d', -19.45, 4.0, -90);
  place('filing_cabinet_4d', -19.45, 4.8, -90, { build: { drawerOpen: true } });
  place('plant_pot_large', -19.3, 6.2, 0);
  place('plant_pot_large', 7.3, -9.7, 0);
  mount('coat_hook_wall', -19.85, 1.75, -9.7, -90);
  place('bin_trash', -12.9, -4.3, 0);
  place('bin_trash', -1.8, 2.9, 0);
  place('backpack', -8.6, -4.4, 30, { noCollision: true });
  mount('clock_wall', -6, 2.35, -10.42, 0);

  // ------------------------------------------------------------- east corr + storage + security
  mount('sign_directional', 11.88, 1.9, -1, 90, { build: { entries: [['LOADING', 'e'], ['OFFICE FLOOR', 'w'], ['SERVICE', 's']] } });
  place('shelf_utility', 13.2, -10, 180);
  place('shelf_utility', 14.7, -10, 180);
  place('shelf_utility', 20.5, -8, 90);
  place('box_cardboard', 13.4, -8.6, 20, { build: { size: 'l' } });
  place('box_cardboard', 14.6, -8.4, 60, { build: { size: 'm' } });
  place('crate_shipping', 17.5, -9.2, 10);
  place('pallet', 18.8, -6.4, 85);
  place('chair_task', 19.6, -5, 200, { build: { color: 'gray' } });
  place('ladder_step', 12.9, -5.2, 100);
  place('hand_truck', 15.8, -4.7, 150);

  place('desk_standard', 27.5, -8.4, 180);
  place('chair_task', 27.4, -7.6, 190);
  place('monitor_dual', 27.6, -8.6, 180, { dy: 0.74, noCollision: true, build: { on: true } });
  place('keyboard', 27.4, -8.25, 183, { dy: 0.74, noCollision: true });
  mount('tv_security', 26.5, 1.7, -4.3, 0);
  mount('tv_security', 28.3, 1.7, -4.3, 0);
  mount('fire_cabinet', 21.3, 1.0, -5.4, -90);
  place('filing_cabinet_4d', 22, -10.1, 180);
  place('printer_desk', 23.1, -10.1, 180);
  place('badge_id', 27.1, -8.2, 40, { dy: 0.74, noCollision: true });

  // ------------------------------------------------------------- south corridor
  place('chair_waiting', -22, 9.9, 180);
  place('chair_waiting', -21.2, 9.9, 175);
  place('plant_pot_large', -31.4, 9.8, 0);
  place('plant_pot_large', -14.7, 9.8, 0);
  mount('poster_evac', -25, 1.5, 7.15, 180);
  mount('sign_directional', -6, 1.9, 7.15, 180, { build: { entries: [['RESTROOMS', 's'], ['LOBBY', 'w'], ['SERVICE', 'e']] } });
  place('fire_extinguisher', 11.6, 7.7, 0, { noCollision: true });
  place('decal_wet_floor_sign', -3, 9.2, 200);

  // ------------------------------------------------------------- restrooms
  place('sink_vanity', -13.5, 14.5, -90);
  place('toilet_stall', -9.2, 17.4, 180, { build: { doorAngle: 0.2 } });
  place('toilet_stall', -10.7, 17.4, 180);
  mount('urinal', -8.2, 0.42, 12.8, 90);
  mount('urinal', -8.2, 0.42, 14.0, 90);
  mount('hand_dryer', -13.9, 1.2, 12.2, -90);
  place('bin_trash', -12.8, 17.8, 0);

  place('sink_vanity', -2.5, 14.5, 90);
  place('toilet_stall', -6.6, 17.4, 180, { build: { doorAngle: 1.2 } });
  place('toilet_stall', -5.2, 17.4, 180);
  mount('hand_dryer', -2.15, 1.2, 12.2, 90);
  place('bin_trash', -3.2, 17.8, 0);

  // ------------------------------------------------------------- janitor + electrical
  place('cart_janitor', -1, 16, 20);
  place('mop_bucket', 0.4, 17.5, 0, { noCollision: true });
  place('broom', -1.7, 17.9, 160, { noCollision: true });
  place('shelf_utility', 1.5, 12.6, 90);
  place('bottle_cleaning', 1.4, 13, 0, { dy: 1.15, noCollision: true, build: { colorway: 0 } });
  place('bottle_cleaning', 1.5, 12.5, 0, { dy: 1.15, noCollision: true, build: { colorway: 1 } });
  place('bottle_cleaning', 1.45, 12.1, 0, { dy: 0.75, noCollision: true, build: { colorway: 2 } });

  mount('panel_electrical', 2.45, 1.15, 12, -90);
  mount('panel_electrical', 2.45, 1.15, 13.4, -90);
  place('transformer_cab', 6.6, 17.3, 0);
  place('cone_warning', 4.6, 14.8, 0, { noCollision: true });
  mount('poster_safety', 5, 1.5, 10.7, 180, { build: { variant: 1 } });

  // ------------------------------------------------------------- service corr + loading
  place('pallet', 21.5, 9.95, 2);
  place('cone_warning', 13.2, 8, 0, { noCollision: true });
  mount('fire_cabinet', 16, 1.0, 10.3, 0);

  place('pallet_stack_boxes', 13.6, -2.4, 10);
  place('pallet_stack_boxes', 16.2, -2.6, 85);
  place('crate_shipping', 19.2, -2.2, 0);
  place('crate_shipping', 20.4, -2.5, 25);
  place('pallet', 22.6, -1.4, 50);
  place('hand_truck', 13, 0.8, 220);
  place('shelf_utility', 12.5, 4.4, -90);
  place('box_cardboard', 14.8, 5.6, 30, { build: { size: 'l' } });
  place('box_cardboard', 15.9, 5.8, 75, { build: { size: 'm', open: true } });
  place('barrier_loading', 18.5, 5.2, 90);
  place('mat_floor', 22, 2, 90);
  mount('garage_control_box', 23.85, 1.3, 4.4, 90);

  // ------------------------------------------------------------- garage (extraction)
  place('van_cargo', 31.5, 3.2, -90, { build: { rearOpen: true } });
  place('kitchen_counter_run', 26, 10.05, 0, { build: { length: 3.5, sink: false } });
  place('tool_case', 25.4, 10, 0, { dy: 0.92, noCollision: true });
  place('shelf_utility', 37, -2.8, 90);
  place('shelf_utility', 37, -1.2, 90);
  place('crate_shipping', 25.6, -2.8, 15);
  place('pallet', 27.8, -3, 70);
  place('cone_warning', 28.9, 8.7, 0, { noCollision: true });
  place('cone_warning', 34.2, 9.4, 0, { noCollision: true });
  place('barrier_loading', 25.2, 6.4, 0);
  mount('garage_control_box', 24.15, 1.3, 2.4, -90);

  // ------------------------------------------------------------- upstairs
  place('fire_extinguisher', -20.6, -9.5, 0, { fy: 3.6, noCollision: true });

  // mezzanine lounge (overlooks the lobby to the south)
  place('sofa_2seat', -30.6, -8.4, 180, { fy: 3.6 });
  place('chair_waiting', -29.1, -3.6, 340, { fy: 3.6 });
  place('chair_waiting', -27.7, -3.4, 15, { fy: 3.6 });
  place('table_side', -29.2, -5.6, 0, { fy: 3.6 });
  place('plant_pot_large', -20.9, -8.2, 0, { fy: 3.6 });
  place('plant_pot_large', -31.3, -2.8, 0, { fy: 3.6 });
  place('mug', -29.25, -5.55, 60, { fy: 3.6, dy: 0.45, noCollision: true });

  // exec hall
  mount('frame_photo', -37.83, 5.3, -6.5, -90);
  mount('frame_photo', -37.83, 5.3, -4.5, -90);
  place('plant_pot_large', -32.7, -8.3, 0, { fy: 3.6 });
  place('table_side', -37.3, -2.8, 0, { fy: 3.6 });

  // exec office (hostage B at -35.3,-18.6)
  place('desk_exec', -31.8, -16.5, -90, { fy: 3.6 });
  place('chair_task', -33, -16.4, -85, { fy: 3.6, build: { color: 'black' } });
  place('monitor', -31.6, -16.9, 90, { fy: 3.6, dy: 0.75, noCollision: true, build: { on: false } });
  place('phone_desk', -31.7, -15.9, -90, { fy: 3.6, dy: 0.75, noCollision: true });
  place('paper_stack', -31.9, -16.2, 20, { fy: 3.6, dy: 0.75, noCollision: true });
  place('frame_photo', -31.9, -17.1, -70, { fy: 3.6, dy: 0.75, noCollision: true });
  place('bookcase', -28.5, -14, 90, { fy: 3.6 });
  place('bookcase', -28.5, -12.4, 90, { fy: 3.6 });
  place('sofa_2seat', -33.5, -9.9, 180, { fy: 3.6 });
  place('table_side', -35, -10.8, 0, { fy: 3.6 });
  place('filing_cabinet_4d', -28.8, -21.4, 180, { fy: 3.6 });
  place('drawer_unit', -29.8, -21.5, 180, { fy: 3.6 });
  place('plant_pot_large', -37.2, -9.9, 0, { fy: 3.6 });
  place('briefcase', -32.6, -15.3, 70, { fy: 3.6, noCollision: true });

  if (missing.size) console.warn('[props] missing prop ids:', [...missing]);
  return { group: mergeStaticProps(group) };
}

// All placed props are static: merge their meshes by material to collapse
// thousands of draw calls into a few dozen.
function mergeStaticProps(group) {
  const buckets = new Map(); // key -> { material, geos, castShadow }
  group.updateWorldMatrix(true, true);
  group.traverse((o) => {
    if (!o.isMesh || !o.geometry) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    if (mats.length !== 1) return; // leave multi-material meshes as-is (rare)
    const m = mats[0];
    const attrs = Object.keys(o.geometry.attributes).sort().join(',');
    const key = m.uuid + '|' + attrs + '|' + (o.geometry.index ? 'i' : 'n') + '|' + (o.castShadow ? 's' : '');
    if (!buckets.has(key)) buckets.set(key, { material: m, geos: [], castShadow: o.castShadow });
    const g = o.geometry.clone().applyMatrix4(o.matrixWorld);
    buckets.get(key).geos.push(g);
    o.userData.__merged = true;
  });
  const merged = new THREE.Group();
  merged.name = 'props';
  let failures = 0;
  for (const { material, geos, castShadow } of buckets.values()) {
    try {
      const geo = geos.length === 1 ? geos[0] : BufferGeometryUtils.mergeGeometries(geos, false);
      if (!geo) { failures++; continue; }
      const mesh = new THREE.Mesh(geo, material);
      mesh.castShadow = castShadow;
      mesh.receiveShadow = true;
      mesh.matrixAutoUpdate = false;
      merged.add(mesh);
    } catch (e) { failures++; }
  }
  if (failures) {
    console.warn('[props] merge fallback for', failures, 'buckets; keeping originals visible');
    // fall back entirely to the unmerged group to avoid missing geometry
    return group;
  }
  return merged;
}

function rotatedAabb(c, rot, x, y, z) {
  const cs = Math.cos(rot), sn = Math.sin(rot);
  const corners = [
    [c.min.x, c.min.z], [c.min.x, c.max.z], [c.max.x, c.min.z], [c.max.x, c.max.z],
  ];
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const [lx, lz] of corners) {
    const wx = lx * cs + lz * sn;
    const wz = -lx * sn + lz * cs;
    minX = Math.min(minX, wx); maxX = Math.max(maxX, wx);
    minZ = Math.min(minZ, wz); maxZ = Math.max(maxZ, wz);
  }
  return {
    min: { x: x + minX, y: y + c.min.y, z: z + minZ },
    max: { x: x + maxX, y: y + c.max.y, z: z + maxZ },
  };
}
