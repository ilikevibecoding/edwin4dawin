#!/usr/bin/env python3
"""Curate screenshot evidence: downscale artifacts/ captures into docs/screenshots/.

Rooms come from the latest clean audit tour (artifacts/audit4). Weapon, character,
UI and VFX evidence are cherry-picked from the per-agent capture sets.
Output is 1280px-wide JPEG (q82) to keep the committed evidence set small;
the hero image is handled separately (PNG, captured live).
"""
import os
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'docs', 'screenshots')
os.makedirs(OUT, exist_ok=True)

WIDTH = 1280

# (source relative to artifacts/, output name without extension)
PICKS = []

ROOMS = ['spawn', 'vestibule', 'lobby', 'waiting', 'restrooms', 'janitor',
         'cubicles', 'cubicles_135', 'copy_mail', 'conference', 'exec_corridor',
         'exec_office', 'archive', 'it_room', 'server_room', 'east_hall',
         'break_room', 'training', 'facilities', 'storage', 'north_corridor',
         'north_corridor_w', 'north_corridor_e', 'stairwell_top',
         'stair_west_top', 'mech_room', 'service_corridor', 'utility',
         'loading', 'garage', 'extraction']
for r in ROOMS:
    PICKS.append((f'audit4/{r}.png', f'final_{r}'))

PICKS += [
    # UI states
    ('f1_title.png', 'ui_title'),
    ('f1_settings.png', 'ui_settings'),
    ('f1_briefing.png', 'ui_briefing'),
    ('f1_loadout.png', 'ui_loadout'),
    ('f1_hud.png', 'ui_hud'),
    ('f1_pause.png', 'ui_pause'),
    ('f1_victory.png', 'ui_victory'),
    ('f1_defeat.png', 'ui_defeat'),
    # Weapons (first-person)
    ('f4_vm_idle.png', 'weapon_ridgeline_idle'),
    ('f4c_ads_ridgeline.png', 'weapon_ridgeline_ads'),
    ('f4_vm_reload.png', 'weapon_reload'),
    ('f4c_ads_vireo.png', 'weapon_vireo_ads'),
    ('f4c_ads_kestrel.png', 'weapon_kestrel_ads'),
    ('f4_vm_boreas_pump.png', 'weapon_boreas_pump'),
    ('f4_vm_longwatch_ads.png', 'weapon_longwatch_ads'),
    ('f4_vm_knife.png', 'weapon_knife'),
    ('f4_vm_throw.png', 'weapon_grenade_throw'),
    ('opus2_recoil_hipfire_trio.png', 'weapon_recoil_trio'),
    # Characters
    ('f4_chars_lineup.png', 'chars_enemy_lineup'),
    ('f4c_enemy_lineup.png', 'chars_enemy_lineup_close'),
    ('f4_hostage_bound.png', 'chars_hostage_bound'),
    ('f4_hostage_follow.png', 'chars_hostage_follow'),
    # VFX
    ('f4b_muzzle_burst.png', 'vfx_muzzle_flash'),
    ('f4b_tracers_fight.png', 'vfx_tracers'),
    ('f4b_impact_drywall.png', 'vfx_impact_drywall'),
    ('f4b_impact_metal.png', 'vfx_impact_metal'),
    ('f4b_glass_shatter.png', 'vfx_glass_shatter'),
    ('f4b_smoke_tuned.png', 'vfx_smoke_volume'),
    ('f4b_flash_burst.png', 'vfx_flash_device'),
]

done, missing = 0, []
for src, name in PICKS:
    path = os.path.join(ROOT, 'artifacts', src)
    if not os.path.exists(path):
        missing.append(src)
        continue
    img = Image.open(path).convert('RGB')
    if img.width > WIDTH:
        img = img.resize((WIDTH, round(img.height * WIDTH / img.width)),
                         Image.LANCZOS)
    out = os.path.join(OUT, f'{name}.jpg')
    img.save(out, 'JPEG', quality=82, optimize=True)
    done += 1

print(f'curated {done} images -> docs/screenshots/')
if missing:
    print('MISSING:')
    for m in missing:
        print(' -', m)
total = sum(os.path.getsize(os.path.join(OUT, f)) for f in os.listdir(OUT))
print(f'total size of docs/screenshots: {total/1e6:.1f} MB')
