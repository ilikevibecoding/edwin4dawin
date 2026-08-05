# DEVIANT PROTOCOL

A cinematic, choice-driven interactive drama for the browser — a fan-made homage
inspired by **Detroit: Become Human** (Quantic Dream). You play **ADAM**, an
AD4M-900 android negotiator in Detroit, 2038, across three branching chapters
(~10 minutes): a rooftop hostage negotiation, an interrogation, and a final
choice between machine and deviant.

All scene art was generated for this demo. The engine is dependency-free
vanilla JS (ES modules) — no build step.

## Run

```bash
python3 -m http.server 8080
# open http://localhost:8080
```

Any static file server works.

## Features

- Fully cinematic presentation: crossfading plates with slow camera moves
  (Ken Burns), film grain, fog, vignette, letterboxing, procedural rain / snow /
  dust / petals, screen shake, RGB-split glitches.
- Procedural WebAudio soundtrack: ambient drones per mood, rain/wind beds,
  typewriter blips, timer ticks, heartbeats, chimes — no audio files.
- Timed choice wheels (DBH-style), with locked options that require evidence.
- QTEs (dodge, grab, ledge catch) with slow-mo treatment and fail branches.
- Investigation "Analyze Mode" with evidence hotspots that unlock dialogue.
- Negotiation **Probability of Success** meter and interrogation **Stress**
  meter with an optimal band and a self-destruction threshold.
- Persistent flags: Software Instability, Reese relationship, Public Opinion.
- The red **directive wall** — mash to break your programming.
- Per-chapter **flowchart** screens showing taken and locked branches.
- Multiple endings computed from your run; ending stats screen.

## Controls

- **Click / SPACE** — advance dialogue
- **Arrow keys or 1-4** — choices
- **SPACE (mash)** — QTEs and the wall
- **A** — toggle auto-advance

## Dev / testing affordances (URL params)

- `?fast=1` — fast text + short waits (for testing)
- `?ch=2` / `?ch=3` — jump to a chapter with sensible defaults
- `?gallery=1` — art review gallery of every plate (arrows to navigate)
- `?shot=ch1_rooftop_wide` — open gallery at a specific plate
- `?mute=1` — disable audio
- `?auto=1` — start with auto-advance on

## Structure

```
index.html            shell + layers
css/game.css          all styling
src/util.js           helpers + URL settings
src/audio.js          procedural WebAudio engine
src/fx.js             weather particles, grain, flash/shake/glitch
src/stage.js          shot registry, crossfades, camera moves, cards, boot
src/ui.js             dialogue, choices, QTE, wall, investigation, meters,
                      toasts, flowchart, ending screen
src/engine.js         beat interpreter (labels, jumps, flags, marks)
src/story/ch1..3.js   chapter scripts (pure data)
tests/validate_story.mjs  story graph validation
assets/img            generated cinematic plates
assets/fonts          self-hosted fonts
```

Run validation: `node tests/validate_story.mjs`
