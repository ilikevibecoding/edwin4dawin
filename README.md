# SRV-BOT 01 — First-Person Robot House Cleanup

A browser demo built with vanilla Three.js (via CDN, no build step). You are a
small soft-shell service robot, seen entirely through its own head-mounted
camera. Drive around a four-room house in a sunny little neighborhood — real
glass windows look out on lawns, neighbor houses, and a street with passing
traffic — work the jointed claw arm like a claw machine, and relocate every
piece of scattered trash into the kitchen bin or the bedroom laundry basket.

## Run it

Any static file server works (ES modules need http, not `file://`):

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

Click to connect (pointer lock). Esc releases the mouse.

## Controls

| Input | Action |
| --- | --- |
| `W` / `S` | drive forward / back |
| `A` / `D` | skid-steer turn |
| Mouse | head look (pitch / yaw) |
| `↑` / `↓` | raise / lower the gripper |
| `←` / `→` | swing the arm side to side |
| `Q` / `E` | extend / retract reach |
| `Space` | open / close the gripper |
| `Shift` + arm keys | control the left arm instead |

## The grab is supposed to be hard

There is no click-to-pickup and nothing snaps. The claw is a rigid pincer at
the end of a two-segment arm hanging from a telescoping mast. To pick
something up you drive and swing until the claw is above the object, lower it
until the pincers are at object height, and only then close the grip. Closing
on empty air does nothing. The object must actually sit between the pincers,
fit within the jaw width, and be short enough for the mouth. Release mid-air
and it falls, tumbles, and settles under its own physics — it will not place
itself.

Trash counts as binned when it comes to rest inside the green kitchen bin or
the blue bedroom laundry basket. 32 items total: plates, cups, a pizza box and
wrappers in the kitchen; cushions, cans, a remote and magazines in the living
room; clothes, shoes and books in the bedroom; towels, bottles and
toilet-paper rolls in the bathroom.

Besides the two containers, props can be parked on any surface: window sills,
the open bookshelf's three boards, the kitchen cart and table, the counter,
the bedroom desk, the bathroom bench, the coffee and side tables — everything
has real collision, so stacking and knocking things off works.

## Tech notes

- Vanilla Three.js `0.170` from jsDelivr, ES modules through an import map.
  No bundler, no external models or textures — every mesh is primitive
  geometry and every texture (wood grain, grout tile, carpet, rugs, wall art,
  grass, asphalt, sky) is generated on a canvas at boot.
- Exterior walls are built from segments with genuine window openings; the
  neighborhood outside (skydome, lawn, road with two lanes of looping cars,
  eight neighbor houses, trees, fence, clouds) lives in the same scene and is
  simply visible through the glass. Sunlight pours through the openings and
  casts real window-shaped light patches.
- Image-based lighting via `RoomEnvironment` PMREM plus one shadow-casting
  sun and four soft room lights.
- Hand-rolled physics: gravity + oriented-box-derived world AABBs resolved
  against the floor, furniture and each other, with sleep states, an
  orientation settler so props come to rest flat, and kinematic push spheres
  for the robot base and moving claw. Fixed 120 Hz substeps. Sim cost is
  ~0.1 ms/frame with all 32 props; the scene draws in ~105 calls / ~3.7k tris,
  so 60 fps is not a concern on real hardware.
- The camera is parented inside the robot's head; mouse look is literally the
  head joint, so looking down shows the chest panel, mast, arms and base.

## Self-eval harness

`eval/shot.mjs` serves the repo, drives the game through a `window.__game`
test hook, and captures rubric screenshots from the robot's camera with
Playwright (software GL). Scenarios: `phase1` (house + drive + wall
collision), `phase2` (robot body in first person + debug third-person),
`phase3` (per-room props, settling, no floor clipping), `grab` (air-grab must
fail, misaligned-height grab must fail, aligned grab must succeed, mid-air
drop must tumble), `bin` (carry to bin and score), `shelf` (props rest on
every placement surface), `outside` (window views + cars verifiably moving),
`perf` (fps / sim cost / draw calls). `eval/debug-top.mjs` renders a top-down
house overview.

```bash
cd eval && npm i && npx playwright install chromium
node shot.mjs grab        # writes shots/grab-*.png and prints assertions
```
