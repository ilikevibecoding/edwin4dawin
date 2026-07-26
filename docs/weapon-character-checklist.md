# Final weapon and character checklist

Owner: **Opus 4** (evidence) with **Fable 4** (assets) and **Opus 2** (handling).

Legend: ✔ present and verified · A automated assertion · S screenshot evidence

## Weapons

Original fictional manufacturers. No real-world or Counter-Strike branding,
silhouettes or inventory presentation.

| | VSC-9 pistol | Kestrel K-7 SMG | Northwind NW-4 | Borealis B-12 | Meridian M-700 | Talon TX knife | Halo flash | Veil smoke |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| World model | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| First-person model | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| LOD 1 (≤40% triangles) | ✔ 24% | ✔ 29% | ✔ 28% | ✔ 28% | ✔ 38% | ✔ 35% | ✔ 31% | ✔ 38% |
| Triangles (LOD 0) | 3 412 | 4 752 | 6 136 | 3 648 | 4 936 | 890 | 1 376 | 1 120 |
| Magazine as a separate part | ✔ | ✔ | ✔ | tube | ✔ | — | — | — |
| Chamber / bolt / slide visible in operation | ✔ slide | ✔ bolt | ✔ bolt + charging handle | ✔ bolt | ✔ bolt lift-pull-close | — | — | — |
| Muzzle device | ✔ | ✔ | ✔ | ✔ | ✔ brake | — | — | — |
| Sights (alignment error) | ✔ 0.00° | ✔ 0.00° | ✔ 0.00° | ✔ 0.00° | ✔ 0.00° scope | — | — | — |
| Ejection port (real opening) | ✔ | ✔ | ✔ | ✔ | ✔ | — | — | — |
| Shell casing | ✔ 9 mm | ✔ 9 mm | ✔ 5.56 | ✔ 12 g hull | ✔ 7.62 | — | — | — |
| Ammunition representation | ✔ | ✔ | ✔ | ✔ | ✔ | — | 2 carried | 2 carried |
| Pickup presentation | ✔ `buildPickup` | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| HUD icon | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| Inventory icon | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| Muzzle flash (family-specific) | ✔ | ✔ | ✔ | ✔ | ✔ | — | — | — |
| Muzzle smoke | ✔ | ✔ | ✔ | ✔ | ✔ | — | — | — |
| Tracer treatment | ✔ | ✔ | ✔ | ✔ | ✔ | — | — | — |
| Recoil behaviour | A pattern `pistol` | A `smg` | A `rifle` | A `shotgun` | A `dmr` | ✔ | — | — |
| Sound set | ✔ fire/tail/reload/dry | ✔ | ✔ | ✔ + shell + pump | ✔ + bolt | ✔ swing/hit | ✔ | ✔ |

### Weapon animation states

| State | Pistol | SMG | Carbine | Shotgun | DMR | Knife | Grenades |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Draw | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| Holster | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| Idle (breathing + settle) | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| Fire | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ swing | ✔ throw |
| Aim transition in / out | ✔ | ✔ | ✔ | ✔ | ✔ scope | — | — |
| Reload with rounds remaining | ✔ | ✔ | ✔ | ✔ per shell | ✔ | — | — |
| Empty reload (slide lock + release) | ✔ | ✔ | ✔ | ✔ | ✔ | — | — |
| Magazine removal | ✔ | ✔ | ✔ | — | ✔ | — | — |
| Magazine insertion | ✔ | ✔ | ✔ | ✔ shell | ✔ | — | — |
| Chambering | ✔ | ✔ | ✔ | ✔ pump | ✔ bolt | — | ✔ pin |
| Recoil recovery | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | — |
| Dry fire | ✔ | ✔ | ✔ | ✔ | ✔ | — | — |
| Movement sway / bob | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| Landing response | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| Lowered near a wall | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| Inspect | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | — |

**First-person constraints verified:** the view model is rendered by a dedicated
overlay camera after a depth clear, so it cannot intersect world geometry or be
cut by the world near plane. At rest the weapon centre sits about 21° below the
camera axis and the model occupies roughly the lower-right third of the frame at
1920×1080.

## Characters

| | kestrel.assault | kestrel.heavy | kestrel.scout | kestrel.warden | analyst | executive | operator arms | operator body |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Height (m) | 1.86 | 1.88 | 1.80 | 1.82 | 1.66 | 1.76 | — | — |
| Clean silhouette at 8 m | S | S | S | S | S | S | S | S |
| Clothing layers (jacket / carrier / webbing / boots / gloves) | ✔ | ✔ | ✔ | ✔ | shirt/trousers/shoes | shirt/skirt/shoes | sleeve/cuff/glove | ✔ |
| Original insignia | ✔ Kestrel armband | ✔ | ✔ | ✔ beret patch | lanyard ID | lanyard ID | — | — |
| Material variation (fabric/armour/skin/rubber/metal) | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| Rigging (19 bones) | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ + fingers | ✔ |
| Weapon attachment point | ✔ `weaponMount` ≤1.0° tracking error | ✔ | ✔ | ✔ | — | — | ✔ | — |
| Correct hand placement | ✔ | ✔ | ✔ | ✔ | — | — | ✔ IK support hand | — |
| Hit regions (7) | A | A | A | A | A | A | — | — |
| Shadow casting | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| Distance simplification (LOD, 18 m) | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | — | — |
| No mesh separation in motion | ✔ joint spheres | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| No weapon clipping | ✔ low ready | ✔ | ✔ | ✔ | — | — | ✔ | — |
| Head variants used | aspen/birch/cedar/flint/larch (5, rotated per spawn) | | | | distinct hair | distinct hair | — | — |

### Character animation states

| State | Hostiles | Hostages | Player arms |
| --- | --- | --- | --- |
| Idle | ✔ | ✔ | ✔ |
| Breathing | ✔ | ✔ | ✔ |
| Walking (1.4 m/s, 1.66 steps/s) | ✔ | ✔ | — |
| Running (3.6 m/s, 3.01 steps/s) | ✔ | ✔ | — |
| Crouching (idle + move) | ✔ | ✔ | ✔ |
| Turning | ✔ | ✔ | — |
| Aiming | ✔ | — | ✔ |
| Firing (additive) | ✔ | — | ✔ |
| Reloading | ✔ | — | ✔ |
| Flinch | ✔ | ✔ | ✔ |
| Taking cover | ✔ | — | — |
| Investigating | ✔ | — | — |
| Searching | ✔ | — | — |
| Death variations | ✔ ×3, settle and freeze | ✔ | — |
| Hostage idle | — | ✔ | — |
| Hostage fear response | — | ✔ hands raised, trembling | — |
| Hostage crouch | — | ✔ kneeling, hands behind head | — |
| Hostage following | — | ✔ hurried civilian jog | — |
| Hostage stopping | — | ✔ | — |
| Hostage extraction | — | ✔ relieved jog | — |
| Surrender | ✔ | ✔ | — |

**Reviewed:** foot placement is speed-locked so there is no skating at the
authored speeds; weapon alignment during `aim` tracks the look direction to
within 1°; `fire` and `flinch` are additive so they never cancel the base state;
deaths ease into three distinct floor poses and then stop updating.

## Evidence

- `screenshots/combat/*.png` — firing, reload, hostile hit, hostile down, glass,
  utility, each with the matching `render_game_to_text()` payload.
- `screenshots/rooms-audit/*.png` — hostiles and hostages in production lighting
  at gameplay distance in their real rooms.
- `screenshots/fable4/after/*.png` — arms rebuild and the four-variant lineup.
- `tests/combat.spec.js` — eight automated cause-and-effect chains.
