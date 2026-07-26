# Audio report — Wave B soundscape pass (Fable 4, audio duty)

Owner: audio engineer. Files touched: `src/core/audio.js`, `src/core/sounds.js`,
`assets/manifest/audio.js`, this report. Everything remains runtime-synthesized
WebAudio — zero media files, all original synthesis. Every pre-existing sfx
name is still registered; test mode (`?test=1` without `&sound=1`) stays fully
silent (all new paths guard on `muted || !ctx`).

## Signal chain

```
per-sfx gain ──> [pan] ──> sfxBus ──> duck (lowpass, normally open) ──> master
     └────────────> revSend ──> convSmall(0.8s IR) ──> revSmall ──┐
                    revSend ──> convLarge(1.6s IR) ──> revLarge ──┴──> sfxBus
ambience layers ──> ambBus ──> master          music loop ──> musicBus ──> master
```

- **Reverb**: one shared send bus feeding two ConvolverNodes with generated
  impulse responses (stereo exp-decaying noise, darkened tail; 0.8 s "small
  office" at k=8.6, 1.6 s "concrete shell" at k=4.3, `normalize=true`). Every
  sfx sends post-gain/pre-pan. `setAmbienceZone` ramps the two return levels
  over 2 s: offices/break/server = small+dry (0.09–0.16), corridors/archive a
  hint of large, stair/basement/loading/garage = large+wet (0.18–0.26),
  exterior = none.
- **Hurt duck**: `player_hurt` momentarily closes the sfx-bus lowpass
  (18 kHz → 620 Hz in 25 ms, back open by 175 ms) — a short muffle dip that
  makes taking hits feel physical. Triggered inside `sfx()`, no wiring needed.

## Zone ambience beds (setAmbienceZone)

Beds are 12 shared **loop layers**; each zone is a mix of layers. A zone
change linear-ramps every layer gain to its new target over 2 s, so walking
lobby → exterior swells the storm rather than swapping beds. Loops are 4–8 s
buffers whose seam is crossfaded *inside* the buffer (filter/LFO state runs
past the end and folds back over the head); tonal components (hums, fan
whines, LFOs) are quantized to whole cycles per loop so they are phase-exact
at the seam. Layers start at a random loop offset, at gain 0, on the amb bus
(`0.8 × sfxVolume`), scaled by a global `AMB_LEVEL = 0.3` — effective bed
peaks sit around 0.06–0.1 versus ~0.9 gunshots (≈ −20 dB), server ≈ −14 dB
(loudest interior), exterior ≈ −11 dB (most dramatic). `setAmbienceZone(null)`
fades everything out and stops/clears all sources after the fade.

| layer | character |
|---|---|
| amb_hvac | soft double-lowpassed rumble, slow breathing LFO |
| amb_hum | faint fluorescent 100/120 Hz pair + 240 Hz edge + buzz grit |
| amb_ticks | 6 sparse muffled structural ticks per 8 s |
| amb_air | airy neutral wash (tall lobby volume, stairwells) |
| amb_storm | dark gusting noise + 46 Hz howl (storm through the shell) |
| amb_fridge | compressor kicks in at 0.4 s, runs ~5 s, shuts off |
| amb_vent | banded fan whir + 88 Hz blade tone with flutter |
| amb_server | three quantized rotor tones + dense mid noise + faint 4.15/8.3 kHz whine |
| amb_rumble | triple-lowpassed deep building rumble |
| amb_drips | 5 random-pitch pipe plinks + faint echoes per 8 s |
| amb_wind | brighter whistling band, two competing gust cycles |
| amb_snowhiss | dry highpassed hiss against the glass |

Zone mixes (see `ZONE_MIX` in audio.js): office/exec/archive = hvac+hum+ticks;
lobby = air+hvac+distant storm; break = hvac+hum+fridge; rr = vent+hum;
server = server+hvac (loudest interior); stair = air+rumble; corridor =
hvac+hum; service/basement/loading = rumble+drips (+air in loading); garage =
rumble+storm+air; exterior = storm 1.4 + wind 1.2 + snowhiss 0.9 (blizzard).

## Weapon layer design

Every player shot is four layers glued by a `tanh` soft-clip (peaks ≤ 0.92 by
construction):

1. **transient crack** — wideband highpassed noise, decay 260–400 (the snap)
2. **mid body** — lowpassed noise burst (the bark)
3. **low thump** — pitch-dropping sine (chest punch)
4. **indoor tail** — slow dark noise (short room boom)

Family balance: pistol = dry hard snap, tight 150 Hz thump, short tail; smg =
fast light crack that reads in bursts; carbine = full mid body, solid 105 Hz
thump; shotgun = reduced crack, wide dark body, 72 Hz boom, long tail;
precision = hottest, brightest crack + 62 Hz thump + the longest tail (1.0 s).
`*_d` distant variants (enemy fire) drop the transient entirely: heavy-lowpass
body + soft thump + proportionally larger tail (walls swallow the snap). Added
`shot_pistol_d` for completeness. Mechanicals rebuilt crunchier with an
inharmonic-partial `ping` primitive (brass/steel character): two-stage pump
with clack, bolt lift/pull/return, firm mag-seat thock, sharper sear-click
`dry_fire`. New `casing`: three descending brass pings over 0.5 s — VFX agent
can call `sfx('casing', { rateJitter: 0.15 })` for variety.

## Combat feedback

- `bullet_whiz`: supersonic snap (decay 450 hp noise) then a 0.13 s whoosh.
- `player_hurt`: sub-heavy (85 + 55 Hz thumps, soft-clipped) + the sfx-bus
  lowpass dip described above.
- `hit_tick` (2.15 kHz tick) and `hit_kill` (two-tone thock + thump)
  registered — **not wired**; lead should call `sfx('hit_tick')` /
  `sfx('hit_kill')` from the hit-marker events.

## Interface & mission

Glassy quiet UI set (detuned high sine pairs, fast decays, peaks ≤ 0.45);
`objective_ping` is now a cold pure fifth (1320/1980 Hz) with detune shimmer;
`hostage_freed` = noise exhale + relieved rising two-tone (440→587 Hz);
`mission_win` = original 4-note A-minor resolve (E4 A4 C5 E5, detuned pairs
over a 110 Hz root pad); `mission_fail` = three sagging tri tones, each
sliding flat, over a dark noise floor. `radio_in`/`radio_out` squelches
(static crack + band-limited blip) registered for Overwatch subtitles — lead
wires them around subtitle show/hide.

## New API surface (for the lead to wire)

| API | wiring |
|---|---|
| `startMenuMusic()` / `stopMenuMusic()` (audio.js) | call on TITLE enter/exit; 2.4 s fade-in, 1.2 s fade-out, on musicVolume bus |
| `sfx('hit_tick')`, `sfx('hit_kill')` | hit-marker / kill-confirm events |
| `sfx('radio_in')`, `sfx('radio_out')` | Overwatch subtitle open/close |
| `sfx('casing', {rateJitter:0.15})` | VFX shell ejection (guarded call is safe) |
| `__audioDebugBuildAll()` (sounds.js) | QA-only: builds every buffer, returns {name, seconds, peak, rms, nan} |

Menu music is a generative cold pad: original progression **Am–F–C–G
(i–VI–III–VII)**, 24 s seamless loop, detuned sine pairs with 1.7 s attacks
and long releases plus a soft filtered-noise swell cresting mid-chord.
Restrained by design (peak 0.33).

## Buffer validation (probe-built in page, all 75 recipes)

Method: `node tools/shot.mjs "/?test=1&qa=1&sound=1" … "window.__probe =
__audioDebugBuildAll()"`. Result: **75 buffers, max peak 0.952 (flash_pop,
tanh-limited), zero NaN samples, zero console errors.** One clipper was found
and fixed during this pass (first amb_rumble draft peaked at 2.50; gain
rebalanced to 0.55).

| recipe | seconds | peak | rms | NaN |
|---|---|---|---|---|
| ui_click | 0.06 | 0.446 | 0.0645 | 0 |
| ui_hover | 0.05 | 0.149 | 0.0242 | 0 |
| ui_confirm | 0.30 | 0.246 | 0.0570 | 0 |
| ui_back | 0.16 | 0.224 | 0.0379 | 0 |
| shot_pistol | 0.42 | 0.908 | 0.1602 | 0 |
| shot_smg | 0.32 | 0.900 | 0.1643 | 0 |
| shot_carbine | 0.52 | 0.910 | 0.1732 | 0 |
| shot_shotgun | 0.70 | 0.916 | 0.2034 | 0 |
| shot_precision | 1.00 | 0.911 | 0.1651 | 0 |
| shot_pistol_d | 0.40 | 0.650 | 0.1101 | 0 |
| shot_smg_d | 0.42 | 0.616 | 0.1079 | 0 |
| shot_carbine_d | 0.55 | 0.671 | 0.0944 | 0 |
| shot_shotgun_d | 0.70 | 0.638 | 0.0834 | 0 |
| shot_precision_d | 0.95 | 0.657 | 0.0732 | 0 |
| dry_fire | 0.07 | 0.508 | 0.0383 | 0 |
| casing | 0.50 | 0.184 | 0.0155 | 0 |
| pump | 0.32 | 0.820 | 0.0799 | 0 |
| bolt_cycle | 0.44 | 0.626 | 0.0613 | 0 |
| reload_mag | 0.60 | 0.831 | 0.0598 | 0 |
| reload_empty | 0.80 | 0.808 | 0.0514 | 0 |
| reload_start | 0.25 | 0.278 | 0.0243 | 0 |
| reload_end | 0.22 | 0.680 | 0.0672 | 0 |
| shell_insert | 0.16 | 0.515 | 0.0489 | 0 |
| weapon_draw | 0.22 | 0.229 | 0.0226 | 0 |
| throw | 0.18 | 0.165 | 0.0209 | 0 |
| knife_swing | 0.16 | 0.152 | 0.0230 | 0 |
| knife_hit | 0.20 | 0.745 | 0.1122 | 0 |
| knife_wall | 0.12 | 0.449 | 0.0398 | 0 |
| step_carpet | 0.18 | 0.221 | 0.0316 | 0 |
| step_tile | 0.18 | 0.478 | 0.0596 | 0 |
| step_vinyl | 0.18 | 0.403 | 0.0471 | 0 |
| step_concrete | 0.18 | 0.487 | 0.0616 | 0 |
| step_metal | 0.18 | 0.571 | 0.0649 | 0 |
| step_snow | 0.18 | 0.352 | 0.0550 | 0 |
| step_wood | 0.18 | 0.498 | 0.0535 | 0 |
| step_drywall | 0.18 | 0.437 | 0.0524 | 0 |
| step_glass | 0.18 | 0.498 | 0.0550 | 0 |
| door_open | 0.50 | 0.319 | 0.0342 | 0 |
| door_close | 0.40 | 0.850 | 0.1026 | 0 |
| door_locked | 0.28 | 0.210 | 0.0513 | 0 |
| door_unlock | 0.35 | 0.218 | 0.0496 | 0 |
| glass_crack | 0.30 | 0.534 | 0.0467 | 0 |
| glass_break | 0.90 | 0.652 | 0.0660 | 0 |
| player_hurt | 0.35 | 0.827 | 0.2658 | 0 |
| enemy_hurt | 0.20 | 0.320 | 0.0499 | 0 |
| enemy_death | 0.60 | 0.670 | 0.1027 | 0 |
| enemy_bark | 0.30 | 0.247 | 0.0415 | 0 |
| bullet_whiz | 0.13 | 0.275 | 0.0329 | 0 |
| hit_tick | 0.06 | 0.204 | 0.0270 | 0 |
| hit_kill | 0.18 | 0.345 | 0.0657 | 0 |
| flash_pop | 1.00 | 0.952 | 0.1728 | 0 |
| smoke_pop | 0.80 | 0.630 | 0.0765 | 0 |
| grenade_bounce | 0.15 | 0.441 | 0.0336 | 0 |
| pickup | 0.30 | 0.248 | 0.0621 | 0 |
| keycard_read | 0.40 | 0.219 | 0.0372 | 0 |
| hostage_freed | 0.60 | 0.183 | 0.0395 | 0 |
| hostage_secured | 0.70 | 0.272 | 0.0678 | 0 |
| objective_ping | 0.45 | 0.199 | 0.0344 | 0 |
| radio_in | 0.22 | 0.163 | 0.0166 | 0 |
| radio_out | 0.16 | 0.166 | 0.0144 | 0 |
| mission_win | 2.20 | 0.407 | 0.0881 | 0 |
| mission_fail | 2.40 | 0.363 | 0.0739 | 0 |
| amb_hvac | 6.00 | 0.693 | 0.1376 | 0 |
| amb_hum | 4.00 | 0.231 | 0.1176 | 0 |
| amb_ticks | 8.00 | 0.360 | 0.0031 | 0 |
| amb_air | 6.00 | 0.697 | 0.1301 | 0 |
| amb_storm | 8.00 | 0.766 | 0.1137 | 0 |
| amb_fridge | 8.00 | 0.355 | 0.0969 | 0 |
| amb_vent | 5.00 | 0.438 | 0.1067 | 0 |
| amb_server | 6.00 | 0.740 | 0.1726 | 0 |
| amb_rumble | 8.00 | 0.550 | 0.1225 | 0 |
| amb_drips | 8.00 | 0.334 | 0.0136 | 0 |
| amb_wind | 8.00 | 0.706 | 0.0997 | 0 |
| amb_snowhiss | 5.00 | 0.132 | 0.0368 | 0 |
| music_title | 24.00 | 0.333 | 0.0775 | 0 |

## Verification runs

1. **Hearing probe** (`?test=1&qa=1&sound=1`, mission start + firing with an
   active AudioContext): zero console errors, zero warnings.
2. **Buffer probe** (table above): 75/75 clean.
3. **Zone-walk probe**: teleport lobby → cubicles → server_room → garage →
   spawn with 3 s crossfades between, then `startMenuMusic()` /
   `stopMenuMusic()`, then `abortToTitle()` (exercises
   `setAmbienceZone(null)` dispose): zero errors.
4. **Playwright suite**: 14 tests. The shared workspace was being edited by
   other agents during runs (Vite full reloads destroy Playwright execution
   contexts mid-test), so the suite was also run in an isolated snapshot of
   the tree on port 5199: 13/14 passed, with the one failure (S43, which
   fast-forwards 13 sim-minutes inside a 2-minute wall clock) timing out
   under VM load and passing cleanly when rerun (1.9 m). All observed
   failures were reload/CPU-contention artifacts; none implicate audio —
   in test mode the audio paths are muted no-ops.
5. **A/B sim-cost control**: two isolated snapshots (baseline `HEAD`
   audio.js/sounds.js vs this pass), same probe measuring the wall cost of
   `advanceTime(30000)` in muted test mode, three interleaved samples each:
   baseline 1602/1760/2354 ms, this pass 2215/1819/1480 ms — identical
   within load noise, confirming the audio pass adds no cost to the tested
   path and S43's occasional timeout is VM contention (multiple agents run
   suites on this box concurrently).
