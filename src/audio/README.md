# Audio — Northstar Rescue (owner: fable4)

**Everything is synthesised at runtime with the Web Audio API.** There are no
audio files anywhere in the project — no samples, no recordings, nothing that
can 404 and nothing anyone holds a copyright on. The raw materials are
oscillators, self-filled noise `AudioBuffer`s, biquad filters, waveshapers and
`ConvolverNode`s fed with procedurally generated impulse responses.

## Files

| File | Contents |
| --- | --- |
| `engine.js` | `AudioEngine`: graph, buses, reverb, voice pool, event wiring, listener |
| `synth.js` | shared noise buffers, IR generator, envelope helpers, the per-trigger `Kit` |
| `sfx.js` | recipe registry + all weapon / movement / world / UI / stinger recipes |
| `vox.js` | formant-synthesis vocalisations (enemy barks, hostages, grunts) |
| `ambience.js` | loop recipes + room-placed emitters (from `map/layout.js`) with culling |
| `music.js` | procedural tension bed (drone + sparse pluck + combat pulse) |
| `manifest.js` | `registerAudioAssets()` — every sound id registered with acceptance |

## Graph

```
voice gain ──[PannerNode]──> bus (sfx | voice | music | ambience | ui)
    buses ──> DynamicsCompressor (limiter) ──> master gain ──> destination
    sfx/voice/ambience ──per-bus send──> reverb in
        reverb in ──> convolver A/B (crossfaded) ──> wet gain ──> limiter
```

- **Buses**: `sfx`, `voice`, `music`, `ambience`, `ui`. Live-tied to
  `masterVolume` / `effectsVolume` / `musicVolume` / `voiceVolume` via
  `EVT.SETTINGS_CHANGED`.
- **Limiter**: a hard-kneed compressor on the sum so stacked gunfire can never
  clip.
- **Reverb**: six procedural IRs (exponentially decaying noise with
  progressive one-pole damping, pre-delay, early-reflection taps, optional
  flutter comb): `outdoor`, `office` (carpeted, dead), `restroom` (small,
  tiled, bright), `concrete` (stairwell/garage/service), `server` (tight,
  fluttery), `atrium` (large, glassy, long pre-delay). Zone switches crossfade
  two convolvers; the current room is derived from the listener position via
  `ROOMS`, with id overrides (lobby/stairwell → atrium, restrooms → restroom).
- **Ducking**: voice lines and announcements briefly attenuate the sfx and
  ambience buses; a close flashbang ducks hard and adds a tinnitus ring.
- **Panners**: `equalpower` by default, `HRTF` for sparse important sources
  (gunfire, voices, shatters) while the pool is light.
- **Listener**: `setListener()` is honoured; otherwise a service tick reads
  the camera from a discoverable game handle, falling back to event-payload
  positions (footsteps / weapon fire), so spatialisation works with zero
  integration effort.

## Voice management

- One-shot cap **28 voices** with priority-based stealing (0 = debris …
  4 = stingers/announcements): the weakest, oldest voice at or below the
  incoming priority is faded 15 ms and stopped. Triggers beyond a recipe's
  audible range are culled before allocating anything.
- Loops (ambience, smoke hiss, shutter motor) live in a separate pool capped
  at 12, driven by distance culling with hysteresis.
- Every source is `start()`/`stop()` scheduled up front; a 120 ms service
  tick reaps finished voices and disconnects their gain/panner nodes. Noise
  buffers are rendered once per context and shared; waveshaper curves and IRs
  are cached.

## Synthesis notes per family

- **Gunshots** — four layers: ~10 ms transient click, pitched body thump
  gliding into the chest range, driven band-passed noise crack, filtered
  noise tail. One recipe per family (pistol/SMG/rifle/shotgun/sniper) with
  different weights and tunings. `distance` morphs the same recipe: the
  transient and crack fade, the low-pass closes and the tail stretches, so a
  shot from another room is duller and longer. The suppressed VK-7 is a
  band-passed "thut" whose bolt clatter is louder than the muzzle.
- **Handling** — a vocabulary of metal ticks, seat thunks and cloth swishes
  sized per family; bespoke pump (two-stroke + rattle) and bolt (five-beat)
  cycles; brass shell drops are detuned ping clusters that settle faster and
  faster (plastic clunk for shotgun hulls, dull tick on carpet/snow).
- **Footsteps** — per-surface recipes (carpet, tile, vinyl, concrete, snow,
  metal, wood) each with 3–4 authored variants plus per-trigger pitch/level
  jitter; crouching drops the bright content. Snow is amplitude-modulated
  crackle; metal adds detuned panel rings; a following hostage echoes the
  player's steps softly, half a beat late.
- **Doors** — handle/latch hardware + filtered-noise leaf swing + a stop,
  voiced per construction: timber, glazed (pane ring), security metal (heavy
  bolt), fire door (panic bar + closer piston hiss), roller shutter (geared
  saw-pair motor + slat rattle, stopped by the settled event). Locked is a
  refused rattle, keycard unlock is a chirp + maglock bolt.
- **Glass** — crack (ping cluster), shatter (high noise burst + a rain of
  detuned pings), late fragment tinkles.
- **Voices** — a glottal source (two detuned saws + breath noise) through
  three parallel band-pass formant filters travelling between vowel targets;
  utterances are wordless syllable gates with a pitch contour, breathiness,
  tremor and waveshaper "strain". Hostiles are low/tense with falling command
  contours (17 distinct barks incl. band-passed radio calls with squelch);
  hostages are higher, breathier, with sobs/fear-breathing scheduled while
  bound and the player is near. Subtitles carry the actual words.
- **Music** — A-minor drone (detuned saw pairs under a breathing low-pass) +
  sparse pentatonic noise-excited pluck; combat heat (from fire/alert events,
  cooling over ~7 s) opens the filter and fades in a 92 bpm sub-pulse and
  offbeat tick. Starts on `MISSION_START`, ends with the mission.
- **Ambience** — emitters placed from `ROOMS`: fluorescent hum (120 Hz buzz +
  ballast hiss + flicker ticks), HVAC rumble, plant-room air handler, server
  fan wall (beating twin whines), wind at exterior openings, restroom drip,
  the dying tube in the service corridor, and a global storm bed with
  scheduled gusts and distant rumble.

## Autoplay & robustness

The `AudioContext` is constructed **only inside `resume()`** (called by the
game on gesture-driven flows and by UI events), so no Chromium autoplay
warning is ever emitted. If `AudioContext` is unavailable, construction
fails, or `resume()` never happens, every public method and every event
handler is a safe no-op. Recipes run inside try/catch: a bad payload can
never take the audio system down.

## Verification

`node --check` on all modules, plus a headless Chromium (Playwright) smoke
test: construct without gesture (no warnings), resume, exercise **all 194
registered recipes**, spam 80 shots (pool holds at 28), drive the full event
matrix (fire/footsteps/impacts/glass/doors/shutter/voices/hostages/
objectives/announce/flash/smoke/mission end) and confirm zero console
errors/warnings, 10 live ambience emitters and clean teardown.
