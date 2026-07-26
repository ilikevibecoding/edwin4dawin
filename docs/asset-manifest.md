# Asset Manifest — Northstar Rescue

Generated from the live asset registry (`src/assets/registry.js`) by
`npm run manifest`. Every production asset must be registered; unregistered
assets are a release defect. 179 assets registered.

Common fields: units = meters; Y-up; props pivot at floor-center facing -Z
unless noted; wall/ceiling props pivot at mount point. Collision: local AABBs
in `userData.collision` registered into the collision world at placement.
LOD strategy: merged static batching + camera-distance material simplicity
(no per-asset LOD swaps; documented budget per category). Audio: all sounds
are synthesized at runtime (no per-asset audio files); audio dependencies are
event-driven (see src/audio/audio.js).

Acceptance criteria (all categories): correct real-world scale, believable
materials (no missing textures), no z-fighting/floating/clipping in placed
locations, no console errors, visible in a reviewed gameplay screenshot.


## Materials (16)

| ID | Name | Owner | Dims (m) | Placed in map | Gallery | Status | Evidence |
|---|---|---|---|---|---|---|---|
| mat_acoustic_ceiling | Acoustic Ceiling Tile | fable3 | — | yes | yes | built | screenshots/materials/ |
| mat_bare_metal | Brushed / Bare Metal | fable3 | — | yes | yes | built | screenshots/materials/ |
| mat_carpet_blue | Commercial Carpet Tile | fable3 | — | yes | yes | built | screenshots/materials/ |
| mat_concrete | Sealed Concrete & Block | fable3 | — | yes | yes | built | screenshots/materials/ |
| mat_drywall_paint | Painted Drywall Family | fable3 | — | yes | yes | built | screenshots/materials/ |
| mat_emissive_set | Emissive Set | fable3 | — | yes | yes | built | screenshots/materials/ |
| mat_facade_panel | Exterior Facade Panels | fable3 | — | yes | yes | built | screenshots/materials/ |
| mat_glass | Architectural Glass | fable3 | — | yes | yes | built | screenshots/materials/ |
| mat_painted_metal | Painted Metal | fable3 | — | yes | yes | built | screenshots/materials/ |
| mat_paper_goods | Paper, Cardboard & Ceramic | fable3 | — | yes | yes | built | screenshots/materials/ |
| mat_plastic_rubber | Plastics & Rubber | fable3 | — | yes | yes | built | screenshots/materials/ |
| mat_porcelain_tile | Porcelain & Ceramic Tile | fable3 | — | yes | yes | built | screenshots/materials/ |
| mat_snow | Snow | fable3 | — | yes | yes | built | screenshots/materials/ |
| mat_upholstery | Upholstery & Leather | fable3 | — | yes | yes | built | screenshots/materials/ |
| mat_vinyl_laminate | Vinyl & Laminate | fable3 | — | yes | yes | built | screenshots/materials/ |
| mat_wood | Wood Veneer & Plank | fable3 | — | yes | yes | built | screenshots/materials/ |

## Architectures (14)

| ID | Name | Owner | Dims (m) | Placed in map | Gallery | Status | Evidence |
|---|---|---|---|---|---|---|---|
| arch_baseboard_kit | Baseboard & Concrete Curb | fable2 | 1.8m runs | yes | yes | built | screenshots/archkit/ |
| arch_blinds | Venetian Blinds + Sill | fable2 | per window | yes | yes | built | screenshots/archkit/ |
| arch_brand_wall | Lobby Brand Wall | fable2 | 3.4x1.3 | yes | yes | built | screenshots/archkit/ |
| arch_column_round | Round Lobby Column | fable2 | dia 0.44 | yes | yes | built | screenshots/archkit/ |
| arch_column_square | Square Structural Column | fable2 | 0.34x3.0 | yes | yes | built | screenshots/archkit/ |
| arch_duct_kit | Duct, Conduit & Cable Tray | fable2 | 0.5x0.28 duct | yes | yes | built | screenshots/archkit/ |
| arch_exit_sign | Exit Sign | fable2 | 0.34x0.16 | yes | yes | built | screenshots/archkit/ |
| arch_flagpole | Courtyard Flagpole | fable2 | 7.0m | yes | yes | built | screenshots/archkit/ |
| arch_handrail | Stair Handrail | fable2 | 0.95m high | yes | yes | built | screenshots/archkit/ |
| arch_pendant_lobby | Lobby Pendant Light | fable2 | dia 0.5 | yes | yes | built | screenshots/archkit/ |
| arch_planter | Concrete Planter (snowed) | fable2 | 1.6x0.6 | yes | yes | built | screenshots/archkit/ |
| arch_striplight | Industrial Strip Light | fable2 | 1.25m | yes | yes | built | screenshots/archkit/ |
| arch_troffer_light | Recessed Troffer Light | fable2 | 0.62x0.62 | yes | yes | built | screenshots/archkit/ |
| arch_wainscot | Restroom Tile Wainscot | fable2 | 1.35m band | yes | yes | built | screenshots/archkit/ |

## Props (124)

| ID | Name | Owner | Dims (m) | Placed in map | Gallery | Status | Evidence |
|---|---|---|---|---|---|---|---|
| backpack | Backpack (leaning) | fable3 | 0.34×0.24×0.46 | yes | yes | built | screenshots/props/ |
| badge_id | ID badge + lanyard | fable3 | 0.16×0.2×0.01 | yes | yes | built | screenshots/props/ |
| barrier_loading | Loading barrier | fable3 | 1.5×0.4×1.05 | yes | yes | built | screenshots/props/ |
| bin_recycle | Recycling bin | fable3 | 0.4×0.32×0.55 | yes | yes | built | screenshots/props/ |
| bin_trash | Trash bin | fable3 | 0.36×0.36×0.6 | yes | yes | built | screenshots/props/ |
| binder_row | Binder row | fable3 | 0.34×0.29×0.32 | library | yes | built | screenshots/props/ |
| bookcase | Bookcase | fable3 | 0.9×0.32×1.9 | yes | yes | built | screenshots/props/ |
| bottle_cleaning | Cleaning spray bottle | fable3 | 0.1×0.08×0.28 | yes | yes | built | screenshots/props/ |
| bottle_water | Water bottle | fable3 | 0.07×0.07×0.23 | yes | yes | built | screenshots/props/ |
| box_cardboard | Cardboard box | fable3 | 0.5×0.4×0.35 | yes | yes | built | screenshots/props/ |
| briefcase | Briefcase | fable3 | 0.42×0.13×0.36 | yes | yes | built | screenshots/props/ |
| brochure_stand | Brochure stand | fable3 | 0.24×0.12×0.24 | yes | yes | built | screenshots/props/ |
| broom | Push broom (leaning) | fable3 | 0.45×0.2×1.35 | yes | yes | built | screenshots/props/ |
| cable_bundle | Floor cable bundle | fable3 | 1.1×0.5×0.05 | yes | yes | built | screenshots/props/ |
| cable_tray | Cable tray segment (1 m) | fable3 | 1×0.24×2.62 | yes | yes | built | screenshots/props/ |
| calendar_desk | Desk calendar (tent) | fable3 | 0.16×0.08×0.13 | library | yes | built | screenshots/props/ |
| can_soda | Soda can | fable3 | 0.07×0.07×0.116 | yes | yes | built | screenshots/props/ |
| cart_janitor | Janitor cart | fable3 | 1×0.52×1 | yes | yes | built | screenshots/props/ |
| chair_conf | Conference chair | fable3 | 0.56×0.58×0.88 | yes | yes | built | screenshots/props/ |
| chair_task | Task chair | fable3 | 0.62×0.62×0.98 | yes | yes | built | screenshots/props/ |
| chair_waiting | Waiting-area chair | fable3 | 0.54×0.54×0.8 | yes | yes | built | screenshots/props/ |
| clock_wall | Wall clock | fable3 | 0.32×0.06×2.35 | yes | yes | built | screenshots/props/ |
| coat_hook_wall | Wall coat hooks | fable3 | 0.42×0.08×1.75 | yes | yes | built | screenshots/props/ |
| coat_jacket | Winter jacket (hanging) | fable3 | 0.55×0.24×1.75 | library | yes | built | screenshots/props/ |
| coffee_machine | Drip coffee machine | fable3 | 0.26×0.32×0.38 | yes | yes | built | screenshots/props/ |
| cone_warning | Traffic cone | fable3 | 0.3×0.3×0.52 | yes | yes | built | screenshots/props/ |
| copier_large | Office copier | fable3 | 1.2×0.7×1.15 | yes | yes | built | screenshots/props/ |
| corkboard | Cork board | fable3 | 1.2×0.08×1.95 | yes | yes | built | screenshots/props/ |
| crate_shipping | Wood shipping crate | fable3 | 0.8×0.6×0.62 | yes | yes | built | screenshots/props/ |
| cubicle_panel | Cubicle partition panel | fable3 | 1.2×0.08×1.5 | yes | yes | built | screenshots/props/ |
| cup_coffee_togo | To-go coffee cup | fable3 | 0.09×0.09×0.14 | yes | yes | built | screenshots/props/ |
| cup_paper | Paper cup | fable3 | 0.08×0.08×0.11 | yes | yes | built | screenshots/props/ |
| decal_wet_floor_sign | Wet floor A-sign | fable3 | 0.32×0.4×0.62 | yes | yes | built | screenshots/props/ |
| desk_exec | Executive desk | fable3 | 2.2×1×0.75 | yes | yes | built | screenshots/props/ |
| desk_organizer | Desk organizer | fable3 | 0.26×0.14×0.12 | yes | yes | built | screenshots/props/ |
| desk_reception | Reception counter (curved) | fable3 | 2.7×1×1.13 | yes | yes | built | screenshots/props/ |
| desk_standard | Standard office desk | fable3 | 1.6×0.8×0.74 | yes | yes | built | screenshots/props/ |
| dispenser_soap | Soap dispenser | fable3 | 0.12×0.12×1.25 | library | yes | built | screenshots/props/ |
| dispenser_towel | Paper-towel dispenser | fable3 | 0.29×0.14×1.5 | yes | yes | built | screenshots/props/ |
| dock_station | Laptop dock | fable3 | 0.28×0.1×0.05 | library | yes | built | screenshots/props/ |
| drawer_unit | Under-desk drawer unit | fable3 | 0.42×0.58×0.6 | yes | yes | built | screenshots/props/ |
| duct_run | Duct segment (1 m) | fable3 | 1×0.55×2.6 | yes | yes | built | screenshots/props/ |
| filing_cabinet_4d | Filing cabinet (4 drawer) | fable3 | 0.47×0.62×1.32 | yes | yes | built | screenshots/props/ |
| fire_cabinet | Fire cabinet (glass front) | fable3 | 0.66×0.22×1.65 | yes | yes | built | screenshots/props/ |
| fire_extinguisher | Fire extinguisher + bracket | fable3 | 0.2×0.2×1.3 | yes | yes | built | screenshots/props/ |
| folder_stack | Folder stack | fable3 | 0.26×0.33×0.06 | yes | yes | built | screenshots/props/ |
| food_container | Food container | fable3 | 0.17×0.12×0.08 | library | yes | built | screenshots/props/ |
| frame_photo | Photo frame | fable3 | 0.16×0.06×0.13 | yes | yes | built | screenshots/props/ |
| fridge | Refrigerator | fable3 | 0.7×0.72×1.8 | yes | yes | built | screenshots/props/ |
| garage_control_box | Dock door control | fable3 | 0.18×0.1×1.45 | yes | yes | built | screenshots/props/ |
| hand_dryer | Hand dryer | fable3 | 0.26×0.18×1.3 | yes | yes | built | screenshots/props/ |
| hand_truck | Hand truck | fable3 | 0.52×0.5×1.2 | yes | yes | built | screenshots/props/ |
| headset_stand | Headset on stand | fable3 | 0.14×0.14×0.3 | library | yes | built | screenshots/props/ |
| hvac_unit | HVAC ceiling cassette | fable3 | 0.9×0.9×2.6 | library | yes | built | screenshots/props/ |
| kettle | Electric kettle | fable3 | 0.2×0.2×0.24 | yes | yes | built | screenshots/props/ |
| keyboard | Keyboard | fable3 | 0.44×0.15×0.03 | yes | yes | built | screenshots/props/ |
| keycard_prop | Security keycard | fable3 | 0.09×0.06×0.004 | library | yes | built | screenshots/props/ |
| kitchen_counter_run | Kitchen counter run | fable3 | 2.4×0.65×2.1 | yes | yes | built | screenshots/props/ |
| ladder_step | Step ladder (A-frame) | fable3 | 0.52×0.75×1.26 | yes | yes | built | screenshots/props/ |
| laptop | Laptop | fable3 | 0.32×0.24×0.24 | yes | yes | built | screenshots/props/ |
| light_emergency | Emergency twin-head light | fable3 | 0.5×0.16×2.42 | yes | yes | built | screenshots/props/ |
| mat_floor | Entry floor mat | fable3 | 1.2×0.75×0.02 | yes | yes | built | screenshots/props/ |
| microwave | Microwave | fable3 | 0.5×0.36×0.3 | yes | yes | built | screenshots/props/ |
| mirror_panel | Mirror panel | fable3 | 0.62×0.05×1.95 | library | yes | built | screenshots/props/ |
| monitor | Desktop monitor 27" | fable3 | 0.62×0.22×0.52 | yes | yes | built | screenshots/props/ |
| monitor_dual | Dual monitor rig | fable3 | 1.05×0.25×0.55 | yes | yes | built | screenshots/props/ |
| mop_bucket | Mop bucket + wringer | fable3 | 0.42×0.36×1.15 | yes | yes | built | screenshots/props/ |
| mouse_pad_set | Mouse + pad | fable3 | 0.27×0.23×0.04 | yes | yes | built | screenshots/props/ |
| mug | Coffee mug | fable3 | 0.12×0.09×0.1 | yes | yes | built | screenshots/props/ |
| notebook | Notebook (spiral) | fable3 | 0.16×0.22×0.02 | yes | yes | built | screenshots/props/ |
| notice_board | Staff notice board | fable3 | 1.2×0.08×1.95 | yes | yes | built | screenshots/props/ |
| pallet | Wood pallet | fable3 | 1.2×0.8×0.14 | yes | yes | built | screenshots/props/ |
| pallet_stack_boxes | Pallet with strapped boxes | fable3 | 1.2×0.8×1.15 | yes | yes | built | screenshots/props/ |
| panel_electrical | Electrical breaker panel | fable3 | 0.5×0.16×2.4 | yes | yes | built | screenshots/props/ |
| paper_pile_messy | Messy paper pile | fable3 | 0.45×0.4×0.03 | yes | yes | built | screenshots/props/ |
| paper_sheet | Paper sheet (A4) | fable3 | 0.21×0.3×0.002 | yes | yes | built | screenshots/props/ |
| paper_stack | Paper stack | fable3 | 0.22×0.31×0.06 | yes | yes | built | screenshots/props/ |
| pc_tower | Workstation tower | fable3 | 0.19×0.44×0.42 | yes | yes | built | screenshots/props/ |
| pen_cup | Pen cup | fable3 | 0.09×0.09×0.16 | yes | yes | built | screenshots/props/ |
| phone_desk | Desk phone | fable3 | 0.22×0.19×0.09 | yes | yes | built | screenshots/props/ |
| pipe_run | Pipe segment (1 m) | fable3 | 1×0.2×2.5 | yes | yes | built | screenshots/props/ |
| plant_desk_small | Small desk plant | fable3 | 0.14×0.14×0.24 | yes | yes | built | screenshots/props/ |
| plant_pot_large | Large office plant (ficus) | fable3 | 0.75×0.75×1.45 | yes | yes | built | screenshots/props/ |
| plate_stack | Plate stack | fable3 | 0.22×0.22×0.09 | yes | yes | built | screenshots/props/ |
| poster_evac | Evacuation plan | fable3 | 0.42×0.03×1.85 | yes | yes | built | screenshots/props/ |
| poster_safety | Safety poster | fable3 | 0.48×0.03×1.95 | yes | yes | built | screenshots/props/ |
| printer_desk | Desktop printer | fable3 | 0.44×0.38×0.26 | yes | yes | built | screenshots/props/ |
| projector_ceiling | Ceiling projector | fable3 | 0.4×0.32×2.6 | yes | yes | built | screenshots/props/ |
| rack_archive | Rolling archive rack | fable3 | 1×0.7×2.2 | yes | yes | built | screenshots/props/ |
| scissors | Scissors | fable3 | 0.18×0.08×0.015 | library | yes | built | screenshots/props/ |
| screen_projection | Projection screen | fable3 | 2×0.12×2.35 | yes | yes | built | screenshots/props/ |
| server_rack | Server rack | fable3 | 0.6×1×2 | yes | yes | built | screenshots/props/ |
| shelf_unit | Metal shelf unit | fable3 | 0.9×0.4×1.8 | yes | yes | built | screenshots/props/ |
| shelf_utility | Utility shelving (steel) | fable3 | 1×0.5×1.8 | yes | yes | built | screenshots/props/ |
| sign_directional | Directional sign | fable3 | 0.62×0.03×2.1 | yes | yes | built | screenshots/props/ |
| sign_exit | Exit sign (emissive) | fable3 | 0.4×0.09×2.6 | library | yes | built | screenshots/props/ |
| sign_room | Room door plate | fable3 | 0.3×0.03×1.6 | library | yes | built | screenshots/props/ |
| sink_kitchen | Kitchen sink unit | fable3 | 0.6×0.62×1.24 | library | yes | built | screenshots/props/ |
| sink_vanity | Restroom vanity (2 basins + mirror) | fable3 | 1.4×0.56×2 | yes | yes | built | screenshots/props/ |
| smoke_detector | Smoke detector | fable3 | 0.13×0.13×2.6 | library | yes | built | screenshots/props/ |
| snack_box | Snack box (open tray) | fable3 | 0.24×0.16×0.14 | yes | yes | built | screenshots/props/ |
| snow_boot_tray | Boot tray (melting snow) | fable3 | 0.72×0.42×0.28 | yes | yes | built | screenshots/props/ |
| sofa_2seat | Two-seat sofa | fable3 | 1.5×0.82×0.78 | yes | yes | built | screenshots/props/ |
| sprinkler_head | Sprinkler head | fable3 | 0.08×0.08×2.6 | library | yes | built | screenshots/props/ |
| stapler | Stapler | fable3 | 0.16×0.06×0.055 | library | yes | built | screenshots/props/ |
| sticky_notes | Sticky notes | fable3 | 0.2×0.12×0.025 | yes | yes | built | screenshots/props/ |
| table_break | Break-room table (round) | fable3 | 1.1×1.1×0.74 | yes | yes | built | screenshots/props/ |
| table_conference | Conference table (boat) | fable3 | 4.2×1.5×0.74 | yes | yes | built | screenshots/props/ |
| table_side | Side table | fable3 | 0.5×0.5×0.5 | yes | yes | built | screenshots/props/ |
| tape_dispenser | Tape dispenser | fable3 | 0.14×0.06×0.09 | library | yes | built | screenshots/props/ |
| toilet_stall | Toilet stall | fable3 | 1×1.55×2.05 | yes | yes | built | screenshots/props/ |
| tool_case | Tool case | fable3 | 0.46×0.2×0.36 | yes | yes | built | screenshots/props/ |
| transformer_cab | Utility transformer cabinet | fable3 | 0.8×0.62×1.5 | yes | yes | built | screenshots/props/ |
| tray_paperclips | Paper-clip tray | fable3 | 0.1×0.1×0.03 | library | yes | built | screenshots/props/ |
| tv_security | Security wall monitor | fable3 | 0.95×0.12×2.1 | yes | yes | built | screenshots/props/ |
| umbrella | Umbrella (closed, wet) | fable3 | 0.14×0.14×0.95 | yes | yes | built | screenshots/props/ |
| ups_unit | UPS battery unit | fable3 | 0.26×0.5×0.36 | yes | yes | built | screenshots/props/ |
| urinal | Urinal | fable3 | 0.38×0.35×1.3 | yes | yes | built | screenshots/props/ |
| valve_wheel | Riser valve | fable3 | 0.26×0.26×1.2 | library | yes | built | screenshots/props/ |
| van_cargo | Cargo van (extraction vehicle) | fable3 | 1.96×4.9×2.12 | yes | yes | built | screenshots/props/ |
| vending_machine | Vending machine | fable3 | 0.9×0.8×1.9 | yes | yes | built | screenshots/props/ |
| water_cooler | Water cooler | fable3 | 0.34×0.34×1.24 | yes | yes | built | screenshots/props/ |
| whiteboard | Whiteboard | fable3 | 1.8×0.1×2.1 | yes | yes | built | screenshots/props/ |
| wrapper_snack | Snack wrapper (dropped) | fable3 | 0.14×0.1×0.02 | yes | yes | built | screenshots/props/ |

## Characters (6)

| ID | Name | Owner | Dims (m) | Placed in map | Gallery | Status | Evidence |
|---|---|---|---|---|---|---|---|
| char_enemy_heavy | Kestrel heavy (armor plates + helmet) | fable4 | 1.78m tall | yes | yes | registered | screenshots/characters/ |
| char_enemy_merc | Kestrel mercenary (softshell + plate carrier) | fable4 | 1.78m tall | yes | yes | registered | screenshots/characters/ |
| char_enemy_scout | Kestrel scout (hoodie + chest rig) | fable4 | 1.78m tall | yes | yes | registered | screenshots/characters/ |
| char_head_variants | Hostile head variants (balaclava / beanie / cap / helmet) | fable4 | bust lineup | yes | yes | registered | screenshots/characters/ |
| char_hostage_analyst | Hostage — analyst (blue shirt + lanyard) | fable4 | 1.78m tall | yes | yes | registered | screenshots/characters/ |
| char_hostage_manager | Hostage — manager (waistcoat + tie) | fable4 | 1.78m tall | yes | yes | registered | screenshots/characters/ |

## Weapons (9)

| ID | Name | Owner | Dims (m) | Placed in map | Gallery | Status | Evidence |
|---|---|---|---|---|---|---|---|
| wpn_ad9 | Aster Dynamics AD-9 Sidearm | fable4 | — | yes | yes | ready | screenshots/viewmodel/ |
| wpn_bdr15 | Borealis Defense BDR-15 Carbine | fable4 | — | yes | yes | ready | screenshots/viewmodel/ |
| wpn_flash | MK2 Dazzler Flash Device | fable4 | — | yes | yes | ready | screenshots/viewmodel/ |
| wpn_fp_arms | First-Person Arms (gloves + sleeves) | fable4 | — | yes | yes | ready | screenshots/viewmodel/ |
| wpn_havelock | Havelock S8 Shotgun | fable4 | — | yes | yes | ready | screenshots/viewmodel/ |
| wpn_knife | K2 Field Knife | fable4 | — | yes | yes | ready | screenshots/viewmodel/ |
| wpn_meridian | Meridian LR-7 Precision Rifle | fable4 | — | yes | yes | ready | screenshots/viewmodel/ |
| wpn_smoke | Cirrus Screen Smoke Device | fable4 | — | yes | yes | ready | screenshots/viewmodel/ |
| wpn_vesper | Vesper K10 SMG | fable4 | — | yes | yes | ready | screenshots/viewmodel/ |

## Environments (10)

| ID | Name | Owner | Dims (m) | Placed in map | Gallery | Status | Evidence |
|---|---|---|---|---|---|---|---|
| env_buildings_far | Distant City Blocks | fable2 | — | yes | yes | built | screenshots/environment/ |
| env_cars_snowed | Snowed-In Car | fable2 | — | yes | yes | built | screenshots/environment/ |
| env_fence | Chain-Link Site Fence | fable2 | — | yes | yes | built | screenshots/environment/ |
| env_light_pole | Parking LED Light Pole | fable2 | — | yes | yes | built | screenshots/environment/ |
| env_road | Plowed Access Road | fable2 | — | yes | yes | built | screenshots/environment/ |
| env_skydome | Winter Sky Dome | fable2 | — | yes | yes | built | screenshots/environment/ |
| env_snowfall | Falling Snow System | fable2 | — | yes | yes | built | screenshots/environment/ |
| env_terrain_snow | Snowfield Terrain Patch | fable2 | — | yes | yes | built | screenshots/environment/ |
| env_tree_bare | Leafless Tree | fable2 | — | yes | yes | built | screenshots/environment/ |
| env_trees_spruce | Snow-Capped Spruce | fable2 | — | yes | yes | built | screenshots/environment/ |

## Remaining discrepancies

Tracked in docs/checklists.md (known-issues list).
