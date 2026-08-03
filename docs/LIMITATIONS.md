# Known limitations

Honest list of what this build does not do, and why.

## Rendering

**Shadows are interior-only.** Four of the corridor's ceiling lamps cast point
shadows at medium and high. Nothing casts a shadow in space: a 1.6 km hull and a
150 m hull sharing one shadow camera needs a cascaded setup that would cost more
than it returns at these camera distances, so the space scenes are shaped by a
single directional key, two fills and image-based lighting instead. The most
visible consequence is that the destroyer never darkens the corvette when it
passes overhead.

**Depth of field is an approximation.** A two-tap circle-of-confusion blur, not
a gathering or scatter-based one. On very high-contrast edges — a bright engine
bell against black — you can see a faint halo where a real lens would show a
clean bokeh disc. It is restrained deliberately and switched off below the high
tier.

**Bloom is threshold-based.** Emissive surfaces are authored to sit under the
threshold unless they are meant to bloom, which works, but a sufficiently
grazing specular on the glossier materials can still tip over it and flare for
a frame or two.

**No motion blur.** The pursuit chapter relies on plumes, star streaks and
camera movement for the sense of speed. Per-object motion blur would help the
corvette's entrance in particular.

## Characters

**Stylised low-poly figures on one shared rig.** Silhouette, colour, posture and
movement carry the identification; there is no facial animation, no finger
articulation and no cloth simulation beyond the vertex-level sway on Vader's
cape. Up very close — closer than any authored shot goes — the joints read as
what they are, spheres bridging boxes.

**Blocking is keyframed, not planned.** Characters follow authored paths and do
not path-find or avoid each other at runtime. Every shot has been checked for
intersections, but if you scrub to an arbitrary moment in Explore mode and fly
into the middle of the firefight you can find two figures closer together than
a director would allow.

**No inverse kinematics on the legs.** Feet are placed by a gait cycle whose
stride length is derived from ground speed, which keeps them from sliding on
the flat corridor floor, but there is no ground adaptation — nothing in the set
needs it, and it would be wrong on a slope.

## Audio

**Narration is pre-rendered.** The words live in `src/timeline/Script.ts`, and
the subtitles read straight from there, so editing the script updates the
captions immediately. The audio needs `npm run narration`, which needs Piper and
FFmpeg installed locally. Without the generated clips the app falls back to the
browser's `speechSynthesis`, which is intelligible and correctly timed but
noticeably flatter, and its voice varies by platform.

**The score does not modulate to the picture.** Moods change on chapter
boundaries and crossfade, but there is no beat-level hit synchronisation — the
brass swell at the destroyer reveal is placed by hand at a fixed time rather
than driven by the shot.

**Spatialisation is stereo panning plus distance.** No HRTF, no occlusion, no
reverb zones. The corridor gets a fixed early-reflection character rather than a
real convolution.

## Content and scope

**Six minutes and forty-four seconds, eight chapters.** Everything is authored
against that fixed length. There is no procedural variation between runs by
design: the same seed produces the same show, which is what makes the visual QA
tour meaningful.

**The interior is one set.** A corridor, a vestibule and a pod bay. Leia's
"separate route through the ship" is implied by geography and dialogue rather
than shown as distinct rooms.

**No mobile or touch support.** The layout is responsive from 1280×720 to 4K,
but Explore mode assumes a mouse and a keyboard, and the quality tiers are
tuned for desktop GPUs.

**Browser support is modern-evergreen.** WebGL 2 is required. It is developed
against Chromium; Firefox and Safari run it, but the startup benchmark tends to
pick a lower tier on Safari than the hardware warrants.

## Testing

**The automated tour is a still-frame test.** It asserts on composition,
visibility, coverage and luminance at 27 moments, plus seven control
behaviours. It cannot judge whether a move feels good, whether a cut lands, or
whether the mix is pleasant — those are on the manual checklist.

**No unit tests.** The project has no pure logic worth isolating from the
renderer; correctness here is visual, and the checkpoint tour is the harness
that carries it.
