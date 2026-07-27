# Evidence package — Northstar Rescue

Captured by `tools/evidence.mjs` (Opus 4, WP-016). 86 frames, 5.81 MB total,
1280x720 JPEG at quality 78. Regenerate with:

```bash
npx vite --port 5187 --strictPort            # or point SERVER= at a running dev server
node tools/evidence.mjs                      # all categories; or: node tools/evidence.mjs rooms ui
```

Every frame is taken through the deterministic QA interface (`window.__qa`, `advanceTime`) on a
fresh page, so the same command reproduces the same set. Screenshots are JPEG rather than PNG on
purpose: the equivalent PNG set is about 340 MB, which does not belong in a repository.

## Title screen

_1 frames, 0.06 MB_

| File | What it shows |
|---|---|
| `title--title-screen.jpg` | Title screen: cinematic plaza camera, snowfall, logotype and menu |

## Rooms (a): every checkpoint in the building

_43 frames, 3.17 MB_

| File | What it shows |
|---|---|
| `rooms--asst.jpg` | Assistant station outside the executive office |
| `rooms--break.jpg` | Break room |
| `rooms--conference.jpg` | Conference room |
| `rooms--copy.jpg` | Copy and supply room |
| `rooms--corr-e.jpg` | East corridor, ground floor |
| `rooms--corr-n.jpg` | North corridor, first floor |
| `rooms--corr-w.jpg` | West corridor, first floor |
| `rooms--courtyard.jpg` | Exterior courtyard on the west flank |
| `rooms--cubes.jpg` | Open-plan office, east bank of cubicles |
| `rooms--cubes-west.jpg` | Open-plan office, west bank of cubicles |
| `rooms--exec.jpg` | Executive office — hostage B is held here |
| `rooms--exec-corr.jpg` | Executive corridor |
| `rooms--gallery.jpg` | Gallery wing off the atrium |
| `rooms--garage.jpg` | Extraction garage and the response van |
| `rooms--hr.jpg` | HR office |
| `rooms--it.jpg` | IT workshop |
| `rooms--janitor.jpg` | Janitor closet |
| `rooms--loading.jpg` | Loading bay with the roller shutter |
| `rooms--lobby.jpg` | Lobby atrium — the widest sightline on the ground floor |
| `rooms--lobby-desk.jpg` | Reception desk and visitor seating |
| `rooms--mech.jpg` | Mechanical plant |
| `rooms--mezz-east.jpg` | Mezzanine, east span |
| `rooms--mezz-south.jpg` | Mezzanine, south span above the entrance |
| `rooms--mezz-west.jpg` | Mezzanine, west span |
| `rooms--plaza.jpg` | Entrance plaza, snowbound facade under the canopy |
| `rooms--plaza-spawn.jpg` | Insertion point at the plaza edge, looking towards the doors |
| `rooms--print.jpg` | Print and mail room, first floor |
| `rooms--records.jpg` | Records room |
| `rooms--rr-m.jpg` | Restroom, main |
| `rooms--rr-w.jpg` | Restroom, west |
| `rooms--sc-east.jpg` | Service corridor, east end |
| `rooms--sc-mid.jpg` | Service corridor, midpoint |
| `rooms--sc-west.jpg` | Service corridor, west end |
| `rooms--sec.jpg` | Security office with the monitor wall |
| `rooms--server.jpg` | Server room — hostage A is held here |
| `rooms--stair-a.jpg` | Stairwell A, ground landing |
| `rooms--stair-a1.jpg` | Stairwell A, first-floor landing |
| `rooms--stair-b.jpg` | Stairwell B, ground landing |
| `rooms--stair-b1.jpg` | Stairwell B, first-floor landing |
| `rooms--store.jpg` | Storage room, first floor |
| `rooms--vest.jpg` | Vestibule between the outer doors and the atrium |
| `rooms--wait.jpg` | East waiting area by the curtain wall |
| `rooms--well.jpg` | Light well overlooking the atrium |

## Weapons (b): all eight, first person, hip and sights

_16 frames, 1.12 MB_

| File | What it shows |
|---|---|
| `weapons--boreal-k5-ads.jpg` | Boreal K5 submachine gun: aiming down the sights |
| `weapons--boreal-k5-hip.jpg` | Boreal K5 submachine gun: hip-fired viewmodel |
| `weapons--cq-blade-ads.jpg` | Fieldman CQ blade: right mouse held — this class has no sighted stance, so the pose is unchanged |
| `weapons--cq-blade-hip.jpg` | Fieldman CQ blade: hip-fired viewmodel |
| `weapons--fb-3-ads.jpg` | FB-3 Dazzler flash device: right mouse held — this class has no sighted stance, so the pose is unchanged |
| `weapons--fb-3-hip.jpg` | FB-3 Dazzler flash device: hip-fired viewmodel |
| `weapons--halcyon-hc4-ads.jpg` | Halcyon HC-4 carbine: aiming down the sights |
| `weapons--halcyon-hc4-hip.jpg` | Halcyon HC-4 carbine: hip-fired viewmodel |
| `weapons--karst-p9-ads.jpg` | Karst P9 sidearm: aiming down the sights |
| `weapons--karst-p9-hip.jpg` | Karst P9 sidearm: hip-fired viewmodel |
| `weapons--meridian-lr8-ads.jpg` | Meridian LR-8 precision rifle: aiming down the sights |
| `weapons--meridian-lr8-hip.jpg` | Meridian LR-8 precision rifle: hip-fired viewmodel |
| `weapons--sg-2-ads.jpg` | SG-2 Veil smoke device: right mouse held — this class has no sighted stance, so the pose is unchanged |
| `weapons--sg-2-hip.jpg` | SG-2 Veil smoke device: hip-fired viewmodel |
| `weapons--vanta-s12-ads.jpg` | Vanta S-12 shotgun: aiming down the sights |
| `weapons--vanta-s12-hip.jpg` | Vanta S-12 shotgun: hip-fired viewmodel |

## Characters (c): hostile variants and hostages at three metres

_5 frames, 0.36 MB_

| File | What it shows |
|---|---|
| `chars--hostage-a.jpg` | Hostage D. Okafor, captive — orbit camera at 3 m |
| `chars--hostage-b.jpg` | Hostage M. Lindqvist, captive — orbit camera at 3 m |
| `chars--hostile-heavy.jpg` | Heavy: armoured kit, Vanta S-12, slow and close-range — orbit camera at 3 m |
| `chars--hostile-scout.jpg` | Scout: light kit, Boreal K5, the fastest of the three — orbit camera at 3 m |
| `chars--hostile-trooper.jpg` | Trooper: standard kit, Halcyon HC-4, the backbone of the roster — orbit camera at 3 m |

## UI screens (d): every screen a player can reach

_12 frames, 0.55 MB_

| File | What it shows |
|---|---|
| `ui--extraction-chip.jpg` | Extraction hold: centred countdown chip and the live exfil objective row |
| `ui--restart-confirm.jpg` | Restart confirmation armed inline on the pause menu |
| `ui--scope-overlay.jpg` | LR-8 scope overlay: reticle, blackout ring and crosshair suppressed |
| `ui--screen-briefing.jpg` | Mission briefing: intel, objectives and the building diagram |
| `ui--screen-defeat.jpg` | Defeat debrief with the cause of failure |
| `ui--screen-difficulty.jpg` | Difficulty select: three tiers with insignia and blurbs |
| `ui--screen-hud.jpg` | In-mission HUD: objectives, hostage chips, vitals, ammo, tac-map, clock |
| `ui--screen-loading.jpg` | Loading screen: rotating tactical tip and progress treatment |
| `ui--screen-loadout.jpg` | Loadout: primary weapon cards, sidearm and equipment |
| `ui--screen-paused.jpg` | Pause menu over the frozen mission |
| `ui--screen-settings.jpg` | Settings: grouped display, audio and control sections |
| `ui--screen-victory.jpg` | Victory debrief: outcome, time and shooting statistics |

## Cause and effect (e): the systems caught in the act

_9 frames, 0.56 MB_

| File | What it shows |
|---|---|
| `moments--door-mid-swing.jpg` | Door caught mid-swing (state: opening) after an E interaction |
| `moments--dropped-weapon-prompt.jpg` | Weapon dropped by a fallen trooper, offered as "Take Halcyon HC-4" |
| `moments--extraction-zone.jpg` | Extraction zone held in the garage, countdown at 3.6 s |
| `moments--flash-whiteout.jpg` | FB-3 Dazzler detonating in the player's face (blindness 0.82) |
| `moments--glass-broken.jpg` | Second round breaks it: shards falling, the opening now shoots through |
| `moments--glass-cracked.jpg` | First round cracks a pane: spidered decal, pane still stops bullets |
| `moments--hostage-following.jpg` | D. Okafor secured and following, 3.74 m behind (following) |
| `moments--muzzle-flash.jpg` | Muzzle flash on round 3 of a burst: flash sprite, hot core, dynamic muzzle light on the ceiling and walls |
| `moments--smoke-cloud.jpg` | SG-2 Veil: a settled smoke volume that AI perception cannot see through |

## Before and after — graybox against the finished art

The "before" frames come from `artifacts/before-wp011/`, captured from the same checkpoints with
the same camera before the art waves landed. The set that used to sit at
`artifacts/shots/graybox-rooms--*.png` has since been overwritten by later runs of the same
scenario name and now shows finished art, so it is no longer a valid "before"; `before-wp011/` is
the earliest surviving capture of these cameras. `artifacts/` is git-ignored, so both sides of
each pair are reproducible rather than committed:

```bash
node tools/capture.js graybox-rooms          # re-shoots the same 40 cameras at the current art
```

| Room | Before (graybox) | After (final) | What changed |
|---|---|---|---|
| lobby | `artifacts/before-wp011/graybox-rooms--lobby.png` | `docs/evidence/rooms--lobby.jpg` | Atrium: flat white boxes become a tiled floor, a coffered ceiling, reception and planting |
| cubes | `artifacts/before-wp011/graybox-rooms--cubes.png` | `docs/evidence/rooms--cubes.jpg` | Open-plan office: bare slab becomes desks, monitors, chairs and cable trays |
| garage | `artifacts/before-wp011/graybox-rooms--garage.png` | `docs/evidence/rooms--garage.jpg` | Garage: empty bay becomes the response van, racking and painted floor markings |
| conference | `artifacts/before-wp011/graybox-rooms--conference.png` | `docs/evidence/rooms--conference.jpg` | Conference room: box table becomes a real table, chairs, screen and glass wall |
| exec | `artifacts/before-wp011/graybox-rooms--exec.png` | `docs/evidence/rooms--exec.jpg` | Executive office: grey shell becomes desk, shelving, art and warm accent light |
| server | `artifacts/before-wp011/graybox-rooms--server.png` | `docs/evidence/rooms--server.jpg` | Server room: placeholder racks become populated cabinets with status lighting |
| break | `artifacts/before-wp011/graybox-rooms--break.png` | `docs/evidence/rooms--break.jpg` | Break room: empty room becomes counters, appliances, seating and clutter |
| plaza | `artifacts/before-wp011/graybox-rooms--plaza.png` | `docs/evidence/rooms--plaza.jpg` | Plaza: white ground plane becomes snow, canopy, signage and the lit facade |

Both sides are 16:9 at the same field of view and the same checkpoint, so the pairs line up frame
for frame; the before set is 1920x1080 PNG and the after set is 1280x720 JPEG.

## Two things to know when reading these frames

**Nine of the room frames are shot from on top of the furniture.** `__qa.teleport()` drops the
player onto whatever surface is under the checkpoint, and nine checkpoints sit over a desk, a
cabinet or a stair tread rather than clear floor — `cubes`, `cubes-west`, `conference`, `asst`,
`store`, `janitor`, `stair-b`, `stair-a1` and `stair-b1`. Those frames look down over the
partitions from roughly 0.7 m too high. It is a checkpoint-placement defect rather than a capture
bug (filed as NS-10 in `docs/reports/wp-016.md`), and it is worth knowing before treating any of
those nine as a representative player view.

**Exposure is audited, not eyeballed.** `node tools/evidence.mjs --audit` decodes every frame in
this directory and reports mean luminance and the share of pixels clipped to white or crushed to
black, writing `artifacts/evidence-exposure.json`. It is how NS-11 (the security office blowing
out) was found and how the dark menu screens were cleared as intentional rather than broken.
