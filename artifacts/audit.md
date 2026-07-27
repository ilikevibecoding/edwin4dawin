# Northstar Rescue — room audit

Generated 2026-07-27T02:26:08.429Z by `node tools/audit.mjs` — 29 checkpoints at 1920x1080, quality `medium`, resolution scale 0.75, lighting `default`.

18 of 29 checkpoints are inside the bar. Severity is the weighted
sum of every shortfall at that checkpoint, so the ranking below is where to spend attention first.

Rendered headless through SwiftShader: treat exposure, contrast and content counts as real signal,
and absolute frame cost as relative-only.

## Largest discrepancies

| # | Checkpoint | Room | Severity | Findings |
| --- | --- | --- | --- | --- |
| 1 | [stairwell](./screenshots/audit-stairwell.jpg) | `stairwell` | 26 | only 86 distinct colours — the room may be unfurnished<br>only 2 registered asset(s) visible (bar 3) |
| 2 | [upperweststair](./screenshots/audit-upperweststair.jpg) | `upperweststair` | 26 | only 71 distinct colours — the room may be unfurnished<br>only 1 registered asset(s) visible (bar 3) |
| 3 | [weststair](./screenshots/audit-weststair.jpg) | `weststair` | 26 | only 70 distinct colours — the room may be unfurnished<br>only 1 registered asset(s) visible (bar 3) |
| 4 | [garage](./screenshots/audit-garage.jpg) | `garage` | 18 | only 2 registered asset(s) visible (bar 3) |
| 5 | [extraction](./screenshots/audit-extraction.jpg) | `garage` | 18 | only 2 registered asset(s) visible (bar 3) |
| 6 | [insertion](./screenshots/audit-insertion.jpg) | `courtyard` | 14 | 30.40 ms per median frame (bar 26 ms; mean 235.61 ms, worst 1396.70 ms) |
| 7 | [archive](./screenshots/audit-archive.jpg) | `archive` | 12 | 44% of the frame is crushed to black |
| 8 | [janitor](./screenshots/audit-janitor.jpg) | `janitor` | 8 | only 81 distinct colours — the room may be unfurnished |
| 9 | [serverroom](./screenshots/audit-serverroom.jpg) | `serverroom` | 8 | only 87 distinct colours — the room may be unfurnished |
| 10 | [mechanical](./screenshots/audit-mechanical.jpg) | `mechanical` | 8 | only 79 distinct colours — the room may be unfurnished |
| 11 | [loading](./screenshots/audit-loading.jpg) | `loading` | 8 | only 81 distinct colours — the room may be unfurnished |

## Every checkpoint

| Checkpoint | Room | Mean lum | Std dev | Contrast | Crushed | Colours | Assets in view | Median frame ms | Engine cpu ms | Draws | Severity |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| [insertion](./screenshots/audit-insertion.jpg) | `courtyard` | 0.5361 | 0.1816 | 1 | 4% | 122 | 5 | 30.4 | 6.80 | 1444 | 14 |
| [entrance](./screenshots/audit-entrance.jpg) | `entrance` | 0.4452 | 0.1809 | 1 | 3% | 98 | 5 | 14.8 | 0.90 | 1293 | 0 |
| [vestibule](./screenshots/audit-vestibule.jpg) | `vestibule` | 0.3995 | 0.2477 | 1 | 21% | 91 | 4 | 12.5 | 1.10 | 1090 | 0 |
| [lobby](./screenshots/audit-lobby.jpg) | `lobby` | 0.2054 | 0.214 | 1 | 24% | 159 | 3 | 15.3 | 1.10 | 820 | 0 |
| [reception](./screenshots/audit-reception.jpg) | `lobby` | 0.1453 | 0.1527 | 1 | 12% | 130 | 6 | 6.4 | 1.00 | 682 | 0 |
| [waiting](./screenshots/audit-waiting.jpg) | `waiting` | 0.3553 | 0.2288 | 1 | 19% | 108 | 7 | 7.9 | 4.80 | 317 | 0 |
| [stairwell](./screenshots/audit-stairwell.jpg) | `stairwell` | 0.2966 | 0.1541 | 1 | 8% | 86 | 2 | 13.7 | 1.00 | 813 | 26 |
| [openoffice](./screenshots/audit-openoffice.jpg) | `openoffice` | 0.3357 | 0.2202 | 1 | 9% | 143 | 11 | 9.6 | 0.80 | 715 | 0 |
| [officeWest](./screenshots/audit-officewest.jpg) | `openoffice` | 0.4277 | 0.2144 | 1 | 5% | 107 | 8 | 5.1 | 0.80 | 468 | 0 |
| [conference](./screenshots/audit-conference.jpg) | `conference` | 0.5086 | 0.2298 | 1 | 9% | 148 | 6 | 4.0 | 0.70 | 563 | 0 |
| [breakroom](./screenshots/audit-breakroom.jpg) | `breakroom` | 0.558 | 0.2398 | 1 | 7% | 142 | 10 | 3.8 | 0.80 | 196 | 0 |
| [restrooms](./screenshots/audit-restrooms.jpg) | `restrooms` | 0.4629 | 0.2182 | 1 | 3% | 144 | 8 | 2.9 | 0.60 | 480 | 0 |
| [midcorr](./screenshots/audit-midcorr.jpg) | `midcorr` | 0.5546 | 0.1988 | 1 | 3% | 113 | 6 | 14.8 | 1.00 | 746 | 0 |
| [janitor](./screenshots/audit-janitor.jpg) | `janitor` | 0.2702 | 0.1604 | 1 | 13% | 81 | 5 | 9.1 | 0.70 | 1256 | 8 |
| [copyroom](./screenshots/audit-copyroom.jpg) | `copyroom` | 0.4192 | 0.2002 | 1 | 10% | 103 | 6 | 15.2 | 5.20 | 983 | 0 |
| [itroom](./screenshots/audit-itroom.jpg) | `itroom` | 0.4386 | 0.1651 | 1 | 5% | 100 | 3 | 19.0 | 0.90 | 1031 | 0 |
| [serverroom](./screenshots/audit-serverroom.jpg) | `serverroom` | 0.192 | 0.0999 | 1 | 13% | 87 | 4 | 15.8 | 1.00 | 1045 | 8 |
| [mechanical](./screenshots/audit-mechanical.jpg) | `mechanical` | 0.1767 | 0.1179 | 1 | 19% | 79 | 6 | 18.0 | 0.90 | 1000 | 8 |
| [servicecorr](./screenshots/audit-servicecorr.jpg) | `servicecorr` | 0.1806 | 0.1151 | 1 | 5% | 143 | 5 | 9.7 | 1.20 | 655 | 0 |
| [loading](./screenshots/audit-loading.jpg) | `loading` | 0.1643 | 0.124 | 1 | 31% | 81 | 3 | 11.7 | 0.90 | 1184 | 8 |
| [garage](./screenshots/audit-garage.jpg) | `garage` | 0.2463 | 0.1344 | 1 | 8% | 113 | 2 | 2.3 | 0.80 | 120 | 18 |
| [extraction](./screenshots/audit-extraction.jpg) | `garage` | 0.2463 | 0.1343 | 1 | 8% | 114 | 2 | 3.2 | 0.70 | 120 | 18 |
| [execcorr](./screenshots/audit-execcorr.jpg) | `execcorr` | 0.3234 | 0.2834 | 1 | 20% | 184 | 9 | 6.1 | 0.70 | 615 | 0 |
| [execoffice](./screenshots/audit-execoffice.jpg) | `execoffice` | 0.2106 | 0.2336 | 1 | 26% | 257 | 7 | 7.2 | 1.00 | 731 | 0 |
| [archive](./screenshots/audit-archive.jpg) | `archive` | 0.2214 | 0.2398 | 1 | 44% | 190 | 5 | 4.9 | 1.10 | 454 | 12 |
| [upperlanding](./screenshots/audit-upperlanding.jpg) | `upperlanding` | 0.3301 | 0.3076 | 1 | 30% | 123 | 7 | 17.1 | 4.80 | 1058 | 0 |
| [upperweststair](./screenshots/audit-upperweststair.jpg) | `upperweststair` | 0.1829 | 0.0583 | 1 | 3% | 71 | 1 | 10.3 | 0.80 | 1598 | 26 |
| [weststair](./screenshots/audit-weststair.jpg) | `weststair` | 0.2316 | 0.0626 | 1 | 3% | 70 | 1 | 8.9 | 0.70 | 1231 | 26 |
| [eastlink](./screenshots/audit-eastlink.jpg) | `eastlink` | 0.4822 | 0.2571 | 1 | 4% | 124 | 6 | 5.4 | 0.70 | 468 | 0 |

## Findings by kind

| Kind | Checkpoints |
| --- | --- |
| colours | 7 |
| empty | 5 |
| slow | 1 |
| crushed | 1 |

## Asset registry

- 464 records registered across 17 categories.
- 65 record(s) registered but never instantiated.
- 0 `assetId`(s) in the scene graph with no record behind them.
- 0 record(s) with incomplete manifest fields.

Never instantiated: `ARCH-WALL-CORNER`, `ARCH-HALFWALL`, `ARCH-COLUMN`, `ARCH-BASEBOARD`, `ARCH-CROWN-TRIM`, `ARCH-CEIL-TILE-INTACT`, `ARCH-CEIL-TILE-STAINED`, `ARCH-CEIL-TILE-MISSING`, `ARCH-STAIR-LANDING`, `ARCH-DUCT`, `ARCH-PIPE`, `ARCH-CABLETRAY`, `ARCH-ACCESS-PANEL`, `ARCH-FLOORDRAIN`, `ARCH-LOADING-DOCK`, `ARCH-GARAGE-SHUTTER`, `GLASS-BROKEN`, `PROP-CUBE-PANEL-SIDE`, `ELEC-DOCK`, `CLUT-STAPLER`, `CLUT-SCISSORS`, `CLUT-BADGE`, `CHAR-HEAD-BALACLAVA`, `CHAR-HEAD-RESPIRATOR`, `CHAR-HEAD-BEANIE`, `CHAR-HEAD-HEADSET`, `CHAR-VM-ARMS`, `WPN-NW9-SIDEARM`, `WPN-VK7-WHISPER`, `WPN-KD4-RANGER`, `WPN-CS12-BREAKER`, `WPN-HL700-LONGSIGHT`, `WPN-TALON-KNIFE`, `WPN-LX2-FLASHBANG`, `WPN-SM6-SMOKE`, `ANIM-IDLE`, `ANIM-BREATHING`, `ANIM-GUARD`, `ANIM-WALK`, `ANIM-RUN`, `ANIM-CROUCH-IDLE`, `ANIM-CROUCH-WALK`, `ANIM-TURN-LEFT`, `ANIM-TURN-RIGHT`, `ANIM-AIM`, `ANIM-FIRE`, `ANIM-RELOAD`, `ANIM-FLINCH`, `ANIM-TAKE-COVER`, `ANIM-INVESTIGATE`, `ANIM-SEARCH`, `ANIM-DEATH-FORWARD`, `ANIM-DEATH-BACK`, `ANIM-DEATH-SLUMP`, `ANIM-HOSTAGE-IDLE`, `ANIM-HOSTAGE-FEAR`, `ANIM-HOSTAGE-CROUCH`, `ANIM-HOSTAGE-FOLLOW`, `ANIM-HOSTAGE-STOP`, `ANIM-HOSTAGE-EXTRACT`, `ANIM-RELOAD-EMPTY`, `ANIM-RELOAD-TACTICAL`, `ANIM-ADS`, `ANIM-VM-DRAW`, `ANIM-VM-INSPECT`
