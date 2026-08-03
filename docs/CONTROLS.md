# Controls reference

## Getting in

Click **Enter the Galaxy**. Browsers will not start audio without a user gesture, so this button is
also what unlocks the Web Audio context. If you skip it (or your browser blocks audio anyway), the
picture and the subtitles carry the whole story regardless.

## Cinematic mode

| Key | Action |
| --- | --- |
| `Space` | Play / pause |
| `←` / `→` | Skip back / forward 10 seconds |
| `,` / `.` | Step back / forward 1 second |
| `R` | Restart from the top |
| `1` – `8` | Jump to a chapter |
| `E` | Toggle Cinematic / Explore |
| `C` | Subtitles on / off |
| `F` | Fullscreen |
| `H` | Help panel |
| `` ` `` | Debug overlay (hidden by default) |

The transport bar carries play/pause, restart, ±10 s, the clock, the current chapter, and buttons
for **Chapters**, **Explore**, **Settings**, **Help** and **Fullscreen**. It fades out after a few
seconds of uninterrupted playback and returns the moment you move the pointer or press a key.

**Timeline scrubber.** Click anywhere on the track to jump; drag to scrub. Chapter boundaries are
marked as ticks, and a tooltip shows the time under the cursor. Playback resumes if it was running
before the drag. Focus the scrubber and use `←` / `→` / `Home` for keyboard scrubbing.

## Settings

| Control | Range |
| --- | --- |
| Master | 0 – 100% |
| Narration | 0 – 100% |
| Music | 0 – 100% (auto-ducks 45% under narration) |
| Effects | 0 – 100% |
| Quality | Low / Medium / High — a startup probe suggests one; you can override it any time |
| Subtitles | On / off |
| Debug overlay | On / off |

## Explore mode

Press `E`, click **Explore**, or use the button on the closing card. The timeline pauses and the
camera becomes yours.

| Input | Action |
| --- | --- |
| Left-drag | Orbit around the pivot |
| Wheel | Dolly in / out |
| `W` `A` `S` `D` | Fly the pivot in the camera's own basis |
| `Q` / `Z` | Down / up |
| `Shift` | Move four times faster |
| Click | Select a ship, droid or character |

Interactive subjects lift subtly under the pointer. Selecting one opens a dossier panel with a
short original description, measured dimensions and three actions:

- **Follow** — lock the pivot to the subject; it stays framed as it moves.
- **Inspect** — frame the subject tightly from a three-quarter angle.
- **Return to camera** — hand control back to the cinematic camera at the current timestamp.

Movement speed scales with your distance from the pivot, and both Follow and Return always put you
somewhere sensible, so it is not possible to get irretrievably lost. Press `E` again (or use the
transport button) to resume the cinematic.

## Debug overlay

Hidden by default; toggle with `` ` `` or from Settings. Shows chapter and index, the current
narrative beat, the active shot id and name, scene, timeline position, camera position, frame rate
and frame time, draw calls, triangles and shader programs, quality and pixel ratio, particle usage,
audio context state, master peak and limiter reduction, the narration cue, the current subtitle,
and the live results of the runtime sanity checks.

## URL parameters

| Parameter | Effect |
| --- | --- |
| `?quality=low\|medium\|high` | Force a quality preset and skip the startup suggestion |
| `?qa=1` | Skip the enter gate and start immediately (used by the automated harness) |
