// Prop/material assets (facilities, restrooms, maintenance, signage, decals)
// Owner: fable3-b
//
// Schema per docs/asset-manifest.md. Grouped entries cover parametric families
// (one factory, opts-driven variants) — every registered prop id is listed.

const F = 'fable3-b';
const shot = (n) => `artifacts/${n}`;

function entry(id, name, category, file, rooms, dimensions, materials, extra = {}) {
  return {
    id, name, category, owner: F,
    files: [file], rooms, dimensions,
    pivot: extra.pivot || 'floor center, +Z faces user',
    materials, textures: extra.textures || [],
    collision: extra.collision || 'local AABB list (auto world-space via placeProps)',
    lod: extra.tiny ? 'clutter bucket, distance-culled @34 m' : 'room-section static merge',
    animations: null, audio: null,
    status: 'integrated',
    acceptance: extra.acceptance || 'silhouette reads; correct scale (§9); no float/z-fight; colliders match',
    evidence: extra.evidence || '',
    discrepancies: extra.discrepancies || [],
  };
}

export const PROP_FACILITIES_ASSETS = [
  // ---- breakroom.js -------------------------------------------------------
  entry('BRK-001', 'Lower kitchen cabinet run (param len)', 'breakroom', 'src/world/props/breakroom.js#cabinet_lower', ['break_room'], 'len × 0.9 × 0.62 m', ['laminate', 'wood', 'plastic_dark', 'metal_brushed'], { evidence: shot('f3b_break_room.png') }),
  entry('BRK-002', 'Upper kitchen cabinet run', 'breakroom', 'src/world/props/breakroom.js#cabinet_upper', ['break_room'], 'len × 0.7 × 0.34 m @1.5', ['laminate', 'wood', 'metal_brushed'], { collision: 'AABB, blocksSight:false', evidence: shot('f3b_break_room.png') }),
  entry('BRK-003', 'Counter section w/ sink + faucet', 'breakroom', 'src/world/props/breakroom.js#counter_sink', ['break_room'], 'len × 0.9 × 0.62 m', ['laminate', 'metal_brushed', 'steel'], { evidence: shot('f3b_break_room.png') }),
  entry('BRK-004', 'Refrigerator, two-door, 2.0 m', 'breakroom', 'src/world/props/breakroom.js#fridge', ['break_room'], '0.85 × 2.0 × 0.72 m', ['plastic_light', 'plastic_dark', 'metal_brushed', 'paper'], { evidence: shot('f3b_break_room.png') }),
  entry('BRK-005', 'Microwave', 'breakroom', 'src/world/props/breakroom.js#microwave', ['break_room'], '0.5 × 0.3 × 0.36 m', ['plastic_dark', 'metal_dark', 'plastic_light']),
  entry('BRK-006', 'Coffee machine + carafe', 'breakroom', 'src/world/props/breakroom.js#coffee_machine', ['break_room'], '0.26 × 0.4 × 0.3 m', ['plastic_dark', 'metal_brushed', '(carafe gloss)']),
  entry('BRK-007', 'Kettle', 'breakroom', 'src/world/props/breakroom.js#kettle', ['break_room'], '0.19 × 0.19 m', ['metal_brushed', 'plastic_dark'], { tiny: true }),
  entry('BRK-008', 'FROSTBYTE vending machine (emissive front, landmark)', 'breakroom', 'src/world/props/breakroom.js#vending_machine', ['break_room'], '0.95 × 1.9 × 0.78 m', ['metal_painted', 'plastic_dark', '(emissive canvas front)'], { textures: ['canvas 256×512 product grid + brand header, emissiveMap, original fiction'], evidence: shot('f3b_break_room.png') }),
  entry('BRK-009', 'GlacierPure water cooler w/ bottle', 'breakroom', 'src/world/props/breakroom.js#water_cooler', ['break_room'], '0.34 × 1.48 × 0.34 m', ['plastic_light', 'ice', '(translucent bottle)']),
  entry('BRK-010', 'Round break table', 'breakroom', 'src/world/props/breakroom.js#break_table', ['break_room'], '\u2300 1.1 × 0.75 m', ['laminate', 'metal_painted']),
  entry('BRK-011', 'Cafe chair', 'breakroom', 'src/world/props/breakroom.js#cafe_chair', ['break_room', 'training', 'facilities', 'archive'], '0.42 × 0.9 × 0.45 m', ['plastic_dark', 'metal_painted']),
  entry('BRK-012', 'Stacked cafe chairs ×5', 'breakroom', 'src/world/props/breakroom.js#chair_stack', ['training', 'storage_n'], '0.5 × 1.15 × 0.5 m', ['plastic_dark', 'metal_painted']),
  entry('BRK-013', 'Mug / cup / plate stack set', 'clutter', 'src/world/props/breakroom.js#mug_set', ['break_room', 'copy_mail', 'training'], '≤0.35 m spread', ['plastic_light', 'fabric_blue'], { tiny: true, collision: 'none' }),
  entry('BRK-014', 'Snack packs & food containers', 'clutter', 'src/world/props/breakroom.js#snack_set', ['break_room'], '≤0.4 m spread', ['fabric_blue', 'plastic_light', 'cardboard'], { tiny: true, collision: 'none' }),
  entry('BRK-015', 'Paper-towel + soap dispenser pair', 'breakroom', 'src/world/props/breakroom.js#dispenser_pair', ['break_room'], '0.65 × 0.4 m wall', ['plastic_light', 'plastic_dark'], { collision: 'none (wall)' }),
  entry('BRK-016', 'Trash + recycle bin pair', 'breakroom', 'src/world/props/breakroom.js#bin_pair', ['break_room', 'copy_mail'], '0.9 × 0.67 × 0.4 m', ['plastic_dark', '(recycle blue)', 'paper']),

  // ---- restroom.js --------------------------------------------------------
  entry('RR-001', 'Sink counter, 2 basins + fake mirror + faucets', 'restroom', 'src/world/props/restroom.js#sink_counter', ['restroom_m', 'restroom_w'], '2.0 × 0.86(+mirror) × 0.56 m', ['tile_dark', '(porcelain)', 'steel', 'aluminum', 'metal_brushed@r0.08 mirror'], { evidence: shot('f3b_restrooms.png') }),
  entry('RR-002', 'Toilet (tank + bowl + seat)', 'restroom', 'src/world/props/restroom.js#toilet', ['restroom_m', 'restroom_w'], '0.4 × 0.86 × 0.57 m', ['(porcelain)', 'plastic_light', 'metal_brushed'], { collision: 'AABB, blocksSight:false' }),
  entry('RR-003', 'Urinal (+ optional divider)', 'restroom', 'src/world/props/restroom.js#urinal', ['restroom_m'], '0.34 × 1.15 × 0.24 m', ['(porcelain)', 'metal_brushed', 'tile_dark']),
  entry('RR-004', 'Stall system (n stalls, doors, 1.9 m, colliders)', 'restroom', 'src/world/props/restroom.js#stall_run', ['restroom_m', 'restroom_w'], 'n×0.95 × 1.9 × 1.45 m', ['metal_painted', '(porcelain)', 'plastic_light'], { discrepancies: ['partition tops overlap the 1.8 m frosted-window sill by ~0.1 m on the west wall — read as acceptable, windows are frosted'], evidence: shot('f3b_restrooms.png') }),
  entry('RR-005', 'Hand dryer', 'restroom', 'src/world/props/restroom.js#hand_dryer', ['restroom_m', 'restroom_w'], '0.26 × 0.32 m wall', ['metal_brushed', 'plastic_dark'], { collision: 'none (wall)' }),
  entry('RR-006', 'Restroom dispenser set', 'restroom', 'src/world/props/restroom.js#rr_dispensers', ['restroom_m', 'restroom_w'], '0.55 × 0.34 m wall', ['plastic_light', 'plastic_dark'], { collision: 'none (wall)' }),
  entry('RR-007', 'Pedal bin', 'restroom', 'src/world/props/restroom.js#bin_small', ['restroom_m', 'restroom_w'], '\u2300 0.29 × 0.38 m', ['metal_brushed', 'plastic_dark'], { tiny: true }),
  entry('RR-008', 'Floor drain plate', 'restroom', 'src/world/props/restroom.js#floor_drain', ['restroom_m', 'restroom_w', 'restroom_hall'], '0.22 × 0.01 m', ['metal_dark', 'metal_brushed'], { tiny: true, collision: 'none' }),
  entry('RR-009', 'Janitor mop sink', 'restroom', 'src/world/props/restroom.js#mop_sink', ['janitor'], '0.6 × 0.31(+tap) × 0.6 m', ['concrete_dark', 'metal_dark', 'steel']),

  // ---- maintenance.js (54 factories, grouped) -----------------------------
  entry('MNT-001', 'Electrical panel (door + breaker rows) / small breaker box', 'maintenance', 'src/world/props/maintenance.js#electrical_panel,breaker_box', ['mech_room', 'utility'], '0.6 × 0.9 / 0.32 × 0.44 m wall', ['metal_painted', 'plastic_dark', '(safety yellow)'], { collision: 'none (wall)' }),
  entry('MNT-003', 'Transformer cabinet w/ 600V hazard label', 'maintenance', 'src/world/props/maintenance.js#transformer_cabinet', ['mech_room', 'utility'], '0.9 × 1.75 × 0.8 m', ['metal_painted', 'metal_dark', '(paper-atlas label)'], { evidence: shot('f3b_mech_room.png') }),
  entry('MNT-004', 'Wall pipe runs w/ valves (param len/n) + vertical drop', 'maintenance', 'src/world/props/maintenance.js#pipe_run,pipe_vertical', ['janitor', 'mech_room', 'utility', 'service_corridor', 'garage', 'stairwells'], 'len × n pipes', ['metal_painted', 'metal_brushed', '(valve red)'], { collision: 'none (overhead)' }),
  entry('MNT-006', 'Portable HVAC / air-handler unit', 'maintenance', 'src/world/props/maintenance.js#hvac_unit', ['mech_room'], '1.5 × 1.35 × 0.85 m', ['metal_painted', 'metal_dark', 'aluminum']),
  entry('MNT-007', 'Fire extinguisher (+bracket) + glass fire cabinet', 'maintenance', 'src/world/props/maintenance.js#fire_extinguisher,fire_cabinet', ['east_hall', 'north_corridor', 'stairwells', 'b_finger'], '0.6 m ext / 0.45 × 0.75 cabinet', ['(extinguisher red)', 'metal_dark', '(glass)'], { acceptance: 'red audit: extinguishers are safety equipment — allowed red per bible §2' }),
  entry('MNT-009', 'Smoke detector (ceiling)', 'clutter', 'src/world/props/maintenance.js#smoke_detector', ['*'], '\u2300 0.14 m', ['plastic_light'], { tiny: true, collision: 'none' }),
  entry('MNT-010', 'Janitor cart (bucket/bottles/bags)', 'maintenance', 'src/world/props/maintenance.js#janitor_cart', ['janitor'], '1.3 × 1.05 × 0.55 m', ['(safety yellow)', 'metal_dark', 'fabric_gray', 'rubber'], { evidence: shot('f3b_janitor.png') }),
  entry('MNT-011', 'Mop + rolling bucket / broom / cleaning bottle set', 'maintenance', 'src/world/props/maintenance.js#mop_bucket,broom,bottle_set', ['janitor', 'utility'], '≤0.45 m', ['(safety yellow)', 'wood', 'fabric_gray'], { tiny: true }),
  entry('MNT-014', 'Wet-floor A-frame "CAUTION — ICE MELT"', 'maintenance', 'src/world/props/maintenance.js#wet_floor_sign', ['janitor', 'service_corridor'], '0.34 × 0.62 × 0.4 m', ['(safety yellow)', '(paper-atlas faces)'], { textures: ['atlas region: caution figure + ICE MELT text'] }),
  entry('MNT-015', 'Utility shelving (param bays/fill)', 'maintenance', 'src/world/props/maintenance.js#utility_shelf', ['storage_n', 'janitor', 'copy_mail', 'archive', 'mech_room', 'utility', 'loading', 'facilities'], 'bays×0.9 × 1.85 × 0.45 m', ['metal_painted', 'cardboard', 'plastic'], { evidence: shot('f3b_storage.png') }),
  entry('MNT-016', 'Cardboard box (3 sizes + stacks) / wooden crate / records box', 'clutter', 'src/world/props/maintenance.js#box_cardboard,crate_wood,records_box', ['storage_n', 'loading', 'archive', 'server_room'], 's/m/l', ['cardboard', 'paper', 'wood', 'wood_dark']),
  entry('MNT-018', 'Pallet (empty / boxes / shrink-wrapped)', 'maintenance', 'src/world/props/maintenance.js#pallet', ['loading'], '1.2 × 0.15..1.12 × 1.2 m', ['wood', 'wood_dark', 'cardboard', '(shrink wrap)'], { evidence: shot('f3b_loading.png') }),
  entry('MNT-019', 'Hand truck / A-frame ladder / tool case', 'maintenance', 'src/world/props/maintenance.js#hand_truck,ladder_aframe,tool_case', ['loading', 'storage_n', 'archive'], 'various ≤1.9 m', ['metal_dark', '(safety yellow/orange)', 'rubber']),
  entry('MNT-022', 'Workbench w/ pegboard + tools', 'maintenance', 'src/world/props/maintenance.js#workbench', ['facilities', 'mech_room', 'utility'], '1.8 × 0.92(+0.9 board) × 0.7 m', ['wood', 'laminate', 'metal_dark'], { evidence: shot('f3b_facilities.png') }),
  entry('MNT-023', 'Water-heater tank / pump+manifold assembly', 'maintenance', 'src/world/props/maintenance.js#water_heater,pump_manifold', ['utility', 'mech_room'], '\u2300 0.88 × 1.85 m / 1.1 × 0.95 m', ['metal_painted', 'metal_brushed', '(valve red)'], { evidence: shot('f3b_utility.png') }),
  entry('MNT-025', 'Storage locker bank (param n)', 'maintenance', 'src/world/props/maintenance.js#locker_bank', ['service_corridor'], 'n×0.38 × 1.8 × 0.45 m', ['metal_painted', 'metal_dark', 'metal_brushed']),
  entry('MNT-026', 'Traffic cone / parking bumper / tire stack / dock bumper', 'maintenance', 'src/world/props/maintenance.js#traffic_cone,parking_bumper,tire_stack,dock_bumper', ['garage', 'loading', 'service_corridor', 'janitor'], 'various', ['(safety orange)', 'concrete', 'rubber', '(safety yellow)']),
  entry('MNT-030', 'Dock leveler plate / roller-shutter control box', 'maintenance', 'src/world/props/maintenance.js#dock_leveler,shutter_control', ['loading', 'garage'], '2.2 × 1.7 plate / 0.22 × 0.3 box', ['metal_dark', '(safety yellow)', '(green/red buttons, emissive)'], { collision: 'leveler walkable (3 cm), box none' }),
  entry('MNT-032', 'Oil drum (gray/blue)', 'maintenance', 'src/world/props/maintenance.js#oil_drum', ['utility', 'garage', 'mech_room'], '\u2300 0.6 × 0.9 m', ['(drum gray/blue)', 'metal_dark']),
  entry('MNT-033', 'Archive ROLLING RACK (2.2 m, handwheel, boxed) — landmark', 'maintenance', 'src/world/props/maintenance.js#rolling_rack', ['archive'], '2.2(+wheel) × 2.2 × 0.75 m', ['metal_painted', 'metal_dark', 'cardboard', 'paper'], { evidence: shot('f3b_archive.png') }),
  entry('MNT-035', 'Server rack (emissive LED front, 3 variants)', 'electronics', 'src/world/props/maintenance.js#server_rack', ['server_room'], '0.6 × 2.0 × 1.0 m', ['metal_dark', '(emissive canvas front)'], { textures: ['canvas 128×384 1U/2U faces + ice/green/amber LEDs ×3 variants'], evidence: shot('f3b_server_room.png') }),
  entry('MNT-036', 'CRAC unit / overhead cable tray / UPS pair / KVM cart', 'electronics', 'src/world/props/maintenance.js#crac_unit,cable_tray,ups_unit,kvm_cart', ['server_room', 'service_corridor'], 'various', ['plastic_light', 'metal_painted', 'metal_dark', 'ice'], { evidence: shot('f3b_server_room.png') }),
  entry('MNT-040', 'Small potted plant (utility variant)', 'clutter', 'src/world/props/maintenance.js#plant_util', ['hallway_w', 'east_hall', 'north_corridor', 'restroom_hall', 'facilities'], '\u2300 0.28 × 0.85 m', ['plastic_dark', '(leaf green)']),
  entry('MNT-041', 'Key cabinet / clipboard row / boot tray / coat hooks', 'maintenance', 'src/world/props/maintenance.js#key_cabinet,clipboard_row,boot_tray,coat_hooks', ['facilities'], 'wall/floor kit', ['metal_painted', 'wood_dark', 'paper', 'rubber', '(hi-vis)'], { evidence: shot('f3b_facilities.png') }),
  entry('MNT-045', 'Lectern / training table', 'furniture', 'src/world/props/maintenance.js#lectern,training_table', ['training', 'archive', 'facilities'], '0.55×1.15 / 1.8×0.75×0.6 m', ['wood_dark', 'wood', 'laminate', 'metal_painted'], { evidence: shot('f3b_training.png') }),
  entry('MNT-047', 'Copy-room kit: work counter, mail sorter, cutting table, paper stacks', 'furniture', 'src/world/props/maintenance.js#work_counter,mail_sorter,cutting_table,paper_box_stack', ['copy_mail', 'loading'], 'various', ['laminate', 'plastic_light', 'paper', 'cardboard'], { evidence: shot('f3b_copy_mail.png') }),
  entry('MNT-051', 'Hall bench / wall water fountain', 'furniture', 'src/world/props/maintenance.js#hall_bench,water_fountain', ['east_hall', 'north_corridor', 'restroom_hall', 'hallway_w'], '1.5×0.47 / 0.4×0.95 m', ['wood', 'metal_dark', 'metal_brushed']),
  entry('MNT-053', 'Air compressor / rolling tool cabinet', 'maintenance', 'src/world/props/maintenance.js#compressor,tool_cabinet', ['garage'], '0.8×0.85 / 0.75×1.05 m', ['(extinguisher red)', 'metal_dark', 'rubber'], { evidence: shot('f3b_garage.png') }),

  // ---- signage.js ---------------------------------------------------------
  entry('SGN-001', 'Backlit NORTHSTAR DYNAMICS logo (star-north mark, half-lit)', 'signage', 'src/world/props/signage.js#sign_logo_backlit', ['lobby'], '5.6 × 1.06 m', ['metal_dark', '(emissive canvas)'], { textures: ['canvas 1024×200, starNorth path copied from ui/menus.js, 2 dimmed letter cells'], evidence: shot('f3b_lobby.png'), collision: 'none (wall @3.35)' }),
  entry('SGN-002', 'Lobby directory board', 'signage', 'src/world/props/signage.js#sign_directory', ['lobby'], '0.82 × 1.14 m', ['metal_dark', '(paper atlas)'], { textures: ['12-row directory, original room numbers'], collision: 'none (wall)' }),
  entry('SGN-003', 'Ceiling-hung directional sign (double-sided)', 'signage', 'src/world/props/signage.js#sign_wayfind', ['north_corridor', 'east_hall', 'hallway_w'], '1.7..2.0 × 0.32 m', ['metal_dark', '(paper atlas)'], { collision: 'none (hung ≥2.19 m clear)' }),
  entry('SGN-004', 'Door room-number plate (atlas text)', 'signage', 'src/world/props/signage.js#sign_doorplate', ['* (35 doors)'], '0.26 × 0.13 m', ['metal_dark', '(paper atlas)'], { collision: 'none (wall)', evidence: shot('f3b_north_corridor.png') }),
  entry('SGN-005', 'Department plate', 'signage', 'src/world/props/signage.js#sign_dept_plate', ['north_corridor'], '0.5 × 0.17 m', ['metal_dark', '(paper atlas)'], { collision: 'none (wall)' }),
  entry('SGN-006', 'Safety poster set (6 original designs)', 'signage', 'src/world/props/signage.js#sign_poster', ['training', 'east_hall', 'north_corridor', 'hallway_w', 'restroom_hall', 'break_room', 'facilities'], '0.56 × 0.72 m', ['metal_dark', '(paper atlas)'], { textures: ['lift / ice / exits / cleandesk / glacier(brand) / posture — all original fiction'], collision: 'none (wall)' }),
  entry('SGN-007', 'Evacuation diagram (true floor plan from map.js)', 'signage', 'src/world/props/signage.js#sign_evac', ['hallway_w', 'restroom_hall', 'east_hall', 'north_corridor', 'training', 'lobby', 'service_corridor'], '0.56 × 0.46 m', ['aluminum', '(paper atlas)'], { textures: ['plan drawn from ROOMS rects per level, exits + you-are-here'], collision: 'none (wall)' }),
  entry('SGN-008', 'Cork notice board w/ layered papers (seeded)', 'signage', 'src/world/props/signage.js#sign_corkboard', ['break_room', 'hallway_w', 'east_hall', 'north_corridor'], '1.2 × 0.9 m', ['wood_dark', '(paper atlas cork+papers)'], { collision: 'none (wall)' }),
  entry('SGN-009', 'Laminated notices (badge/authorized/blizzard/handwash/recycle/keys)', 'signage', 'src/world/props/signage.js#sign_notice', ['vestibule', 'server_room approach', '*'], '0.3 × 0.375 m', ['(paper atlas)'], { collision: 'none (wall)' }),
  entry('SGN-010', 'Restroom pictograms M/W', 'signage', 'src/world/props/signage.js#sign_pictogram', ['restroom_hall'], '0.18 × 0.18 m', ['metal_dark', '(paper atlas)'], { collision: 'none (wall)' }),
  entry('SGN-011', 'Stairwell level plate (stencil)', 'signage', 'src/world/props/signage.js#sign_level_plate', ['stair_w', 'stairwell', 'b_landing_w', 'b_stair_c'], '0.48 × 0.22 m', ['(paper atlas)'], { collision: 'none (wall)' }),
  entry('SGN-012', 'Garage bay letter (painted panel)', 'signage', 'src/world/props/signage.js#sign_bay_letter', ['garage'], '0.44 × 0.44 m', ['(paper atlas)'], { collision: 'none (wall)' }),
  entry('SGN-013', 'Tiny equipment / shipping labels', 'signage', 'src/world/props/signage.js#label_small', ['storage_n', 'archive', 'server_room', 'mech_room', 'utility', 'loading', 'garage', 'service_corridor'], '0.15 × 0.055 m', ['(paper atlas)'], { tiny: true, collision: 'none' }),
  entry('SGN-014', 'Wall whiteboard w/ original scribbles (2 contents)', 'signage', 'src/world/props/signage.js#whiteboard_wall', ['training', 'facilities'], '1.7..2.2 × ~1.2 m', ['aluminum', '(paper atlas)'], { collision: 'none (wall)' }),

  // ---- decals.js ----------------------------------------------------------
  {
    id: 'DCL-001', name: 'Static decal pass (wear/scuff/dirt/stains/tape/cable/footprints/oil/parking/drains)', category: 'decal', owner: F,
    files: ['src/world/decals.js#placeStaticDecals'], rooms: ['hallway_w', 'north_corridor', 'east_hall', 'training', 'break_room', 'copy_mail', 'janitor', 'vestibule', 'lobby', 'server_room', 'service_corridor', 'utility', 'loading', 'garage'],
    dimensions: '~75 quads, one 1024² alpha atlas', pivot: 'n/a',
    materials: ['(decal atlas, transparent, polygonOffset -2)'],
    textures: ['12 regions: wear ellipse, scuff, dirt, water stain, leak ring, tape, cable, footprints ×3 fade, oil, drain, worn stripe, lane arrow; deterministic Rng(360921/771003)'],
    collision: 'none', lod: 'single merged mesh (1 draw call)', animations: null, audio: null,
    status: 'integrated',
    acceptance: 'no z-fighting at grazing angles; parking bays = 5 stripes 0.12 m; footprints fade over 7 steps',
    evidence: shot('f3b_garage.png'), discrepancies: [],
  },
  {
    id: 'DCL-002', name: 'Runtime impact decals (pooled) + blood decals (reducedBlood-aware)', category: 'decal', owner: F,
    files: ['src/world/decals.js#spawnImpactDecal', 'src/world/decals.js#spawnBloodDecal'], rooms: ['*'],
    dimensions: 'impact ~0.12 m, blood ~0.42 m', pivot: 'surface point, oriented to normal',
    materials: ['5 impact canvases (concrete/drywall/wood/metal/tile)', 'blood canvas'],
    textures: ['64² impact per surface family, 96² blood pool; worldRng rotation/size'],
    collision: 'none', lod: 'InstancedMesh pools: 24×5 impacts (120), 40 blood, oldest recycled', animations: null, audio: null,
    status: 'integrated',
    acceptance: 'EXACT signatures spawnImpactDecal(surface, point, normal) / spawnBloodDecal(point, normal); import-safe (no world side effects); blood no-ops under reducedBlood',
    evidence: '', discrepancies: ['pools attach to the world group captured during placeStaticDecals; runtime spawns before world build are safely ignored'],
  },
];
