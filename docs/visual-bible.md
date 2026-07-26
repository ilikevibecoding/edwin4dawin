# Visual Bible — Northstar Rescue (Fable 1)

## Fiction

**Norrsken Dynamics** — a fictional Scandinavian geodata/energy-analytics firm.
Headquarters: the **Northstar Administrative Annex**, a two-story satellite office on a
mountain campus, cut off by a blizzard. Hostiles ("Kestrel Cell") seized the annex at
06:10. Two staff members are unaccounted for. The player is **VANGUARD-2**, a solo
tactical-response operator inserted through the snowbound employee entrance.

All branding is invented: Norrsken Dynamics logo (an eight-point star in a circle),
department signage, "Kestrel" insignia (a diving bird chevron). No real or Valve/CS
marks anywhere.

## Visual target

Grounded stylized realism: believable materials, real-world scale and proportion,
readable silhouettes, slightly simplified geometric detail. Think "professionally
art-directed tactical slice", not photoreal and not toy-like.

## Color script (hex anchors)

| Zone | Key | Fill | Accent |
|---|---|---|---|
| Exterior / entrance | Cold daylight `#b8cfe8` | Snow bounce `#dce9f5` | Steel blue `#5b7d9e` |
| Lobby / reception | Cool day + warm brand wall | Birch `#c9a97a`, slate `#4a5560` | Norrsken teal `#2e7d84` |
| Cubicle floor | Neutral fluorescent `#eef2ec` (subtle green) | Carpet `#5a6068`, panel `#9aa1a6` | Muted teal |
| Conference/executive | Warm lamps `#ffd9a0` | Walnut `#6d4f35`, charcoal | Brass `#a98d5f` |
| Service / maintenance | Sparse cool fluorescent | Concrete `#8d8d88`, OSHA gray | Safety yellow `#d8b13a` |
| Server room | Dim + emissive | Near-black racks `#22262a` | LED cyan `#37d0e6`, status amber |
| Garage / loading | Cold spill + sodium `#ffb46b` | Concrete, galvanized | Hazard stripes |
| Danger / objective | — | — | Restrained red `#c8402e`, objective gold `#e6b64c` |

Rule: every camera angle should contain a cold source, a neutral fill, and one warm or
emissive accent. Never a uniformly-lit flat scene; never crushed blacks (floor of
~RGB 18/22/26 in the darkest service spaces).

## Shape language

- Architecture: rectilinear, 0.02–0.04 m chamfers on every exposed edge. No razor edges.
- Norrsken furniture: rounded-rectangle profiles, tapered legs, birch + graphite.
- Kestrel (hostiles): angular, asymmetric silhouettes, olive/charcoal/snow-camo.
- Weapons: practical, matte, slightly chunky readable forms ("Vektra Arms" fiction).

## Scale standards

Human 1.62–1.88 m. Desk h 0.74. Seat h 0.45. Counter 0.92. Door 0.9×2.05. Cubicle
panel 1.5. Ceiling: office 2.7, lobby 5.6 (two-story void), service 2.6, garage 4.2.

## Typography & UI

- UI font stack: "Rajdhani"-like technical feel via system stack `'Segoe UI', 'Inter',
  sans-serif` with letterspaced uppercase for headings; tabular numerals for ammo/timer.
- HUD: minimal, bottom corners, thin 1px strokes, `#dce9f5` on translucent charcoal
  panels (blur), accents teal/gold/red per state. Crosshair: 4-line + dot, dynamic gap.
- Title treatment: "NORTHSTAR RESCUE" — wide tracking, thin weight, eight-point star
  replacing the A's crossbar accents; horizon rule beneath.

## Lighting references (plan, not random placement)

1. Sun: single cold directional (az 205°, el 18°, `#cfe0f2`, shadows) through south glass.
2. Every window: local cool fill point ("snow bounce") + frost gradient on glass edges.
3. Office ceilings: fluorescent troffers on a 2.4 m grid, slightly green `#eef2ec`.
4. Warm accents: desk lamps (exec, reception), break-room pendants, garage sodium.
5. Emergency: red strobes OFF by default; steady red exit-route markers in service halls.
6. Emissives: exit signs, monitor screens, server LEDs, vending panel, copier status.

## Material standards

PBR. Roughness variation is mandatory on every large surface (wear maps). Metalness
binary (0 or 1) except brushed transitions. No baked directional lighting in albedo.
AO baked subtly into corner-grime decals, not into flat tile centers.

## Readability rules

- Enemies must silhouette against their backdrop at 25 m (rim of snow-light or emissive
  backdrop in dark zones).
- Objectives/interactables: gold marker language. Danger: red. Navigation: teal.
- Fog of dust/snow only near exteriors; never in combat sightlines indoors.
