# Known limitations

## Rendering and performance

- **Quality tier changes are only partly live.** Pixel ratio, shadows, bloom,
  grain and depth cueing switch immediately. Particle capacities, crowd size,
  sphere tessellation, star count and greeble density are baked when the world
  is constructed, so those parts of a tier change take effect on the next load.
  The choice is persisted, so a reload is all it takes.
- **No frame-rate figures from real hardware.** The environment this was built
  and tested in has no GPU; Chrome falls back to SwiftShader and renders at
  roughly 10 fps regardless of tier. Draw calls (a few hundred) and triangle
  counts are the only performance evidence measured here, and both are modest.
  The automated tour's `low-fps` warnings are an artefact of that environment.
- **Shadows are used sparingly.** The corridor and pod bay rely on lamp
  placement and ambient occlusion baked into the panel maps rather than on real
  shadow maps, which keeps the interiors readable at every tier but means
  characters do not cast contact shadows onto the deck.

## Simulation

- **Ship flight is authored, not simulated.** Positions come from closed-form
  functions of show time. Headings are derived from the path derivative, so the
  ships do point where they are going, but there is no physics: a change to a
  path is a change to a curve, not to a force.
- **Characters do not collide.** Tracks are hand-authored and spaced so nobody
  intersects anybody in the shots that exist. Flying through the corridor in
  Explore mode during the firefight will find figures that overlap when seen
  from angles the piece never uses.
- **Fallen characters stay where they land.** They are posed prone and left
  there for the rest of the piece rather than being cleared.

## Content

- **The interior is one corridor and one bay.** Leia's route, the boarding
  action and the droids' run all happen along the same 60 m of set, redressed by
  lighting and staging. Shots are chosen so this is not apparent, but Explore
  mode will show you the seams.
- **Only the pod's cabin is modelled inside.** Looking through any other window
  or hatch in the piece shows a lit surface, not a room.
- **Narration is synthetic.** It is original text in a neutral synthesised
  voice, deliberately not a performance. If the pre-rendered clips are missing,
  the browser's own speech synthesis takes over, which sounds noticeably
  different between platforms; the diagnostics overlay says when that has
  happened.

## Browser support

- **WebGL 2 required.** There is no WebGL 1 path. If context creation fails the
  error boundary explains why rather than showing a blank canvas.
- **Autoplay.** Audio cannot start before the enter click, by design and by
  browser policy. Reloading mid-show returns to the gate.
- **Safari.** Developed against Chromium. The Web Audio graph avoids anything
  Safari-specific, but the piece has not been verified there.
