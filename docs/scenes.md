# Writing a scene

A scene is one file in `src/scenes/`. It owns its own `THREE.Scene`, its lighting,
its camera choreography and its sound cues. The director builds every scene up
front, then cuts between them on the timeline in `src/story.js`.

## Contract

```js
export const id = 'chase';

export async function build(ctx) {   // ctx: {dur, id, start, quality, renderer}
  const scene = new THREE.Scene();
  // ...build everything once...
  return {
    scene,
    cues: [ { t: 3.2, sfx: 'turbolaser', opts: { gain: 0.9 } } ],  // local times
    update(t, c) { /* c: {camera, T, stage} */ },
  };
}
```

- `t` is **local** scene time, from 0 to `ctx.dur`.
- `c.camera` is the shared perspective camera. Set its position/rotation/fov
  every frame; do not create your own.
- `cues` are sound effects at local times; the director offsets them to absolute
  time and schedules them on the same context as the music, in both live
  playback and the offline film render.

## The one hard rule: `update(t)` must be a pure function of `t`

The film is rendered by seeking to individual frames, out of order, in several
browsers at once. If `update` integrates velocity, toggles a flag the first time
a beat passes, or calls `Math.random()`, the render will not match what you saw
and frames will not match each other.

Wrong:
```js
ship.position.z -= 40 * dt;          // accumulates
if (t > 3 && !fired) { fire(); }     // one-shot state
```
Right:
```js
ship.position.z = START - 40 * t;                        // closed form
bolts.update(t);                                          // declarative events
const k = beat(t, 3.0, 4.2);                              // 0..1 progress
```

`src/scenes/_kit.js` exists so that every time-varying effect can stay
declarative. Use it.

## The kit — `src/scenes/_kit.js`

| helper | what it does |
| --- | --- |
| `lightRig(scene, preset, o)` | complete light setup: `space`, `interior`, `desert`, `battle`, `trench` |
| `beat(t, t0, t1)` | 0 before `t0`, ramps to 1 at `t1` |
| `smoothstep`, `lerp`, `clamp`, `pulse`, `noise` | timing maths |
| `new Bolts(parent, shots, o)` | laser fire; `shots` are `{t0, from, to, speed, color, len}`; call `.update(t)` |
| `volley(o)` | generates a burst of `shots` from a muzzle to a target with spread |
| `new Impacts(parent, list)` | additive hit flashes at `{t, pos, size, color}` |
| `new BrickBurst(parent, o)` | a shower of tumbling bricks — the house explosion |
| `new Fireball(parent, o)` | expanding fireball + shock ring + brick shrapnel |
| `new Smoke(parent, o)` | drifting soft billboards |
| `stars(scene, o)` | quick starfield |
| `flyAlong(obj, t, path, o)` | position + orient + bank a ship along `path(t)` |
| `flash(stage, t, events)` | full-frame colour flashes through the film pass |
| `chroma(stage, amount)` | radial chromatic stretch (hyperspace) |

Every one of those takes absolute local time and computes state from scratch.

## Models

- `src/models/ships.js` — corvette, starDestroyer, escapePod, xwing, tiefighter,
  falcon, sandcrawler, turbolaserTower, proximityBolt.
- `src/models/characters.js` — stormtrooper, vader, rebelTrooper, princess,
  pilot, imperialOfficer, jawa, astromech, protocolDroid, props, plus the
  `minifig` rig and `pose`/`walk`/`aimBlaster` from `src/lego/minifig.js`.
- `src/models/environments.js` — starfield, spaceBackdrop, planet, twinSuns,
  battleStation, corridor, blastDoor, podBay, desert, trench, stationSurface,
  explosionBurst and friends.

All models face `-Z`. See `docs/modeling.md`.

## Sound

Cue names come from `SFX` in `src/audio/sfx.js`. Cue generously — engine passes,
impacts, door blasts, droid chatter, wind. Each cue is
`{ t, sfx: 'name', opts: {...} }` in local scene time.

## Reviewing your shots

```
# a grid of stills across your scene — the fastest way to spot bad framing
node tools/contact-sheet.mjs --scene chase --n 12 --out /tmp/chase.png

# one exact moment, full size
node tools/shot.mjs "http://127.0.0.1:5175/index.html?render=1&t=52&w=1280&h=720" /tmp/f.png --w 1280 --h 720
```

`t` in the film URL is **absolute** film time; look up your scene's start in
`src/story.js`. Port 5175 runs with HMR disabled, which is what you want for
screenshots.

**Look at every still.** A scene is not done until the contact sheet reads like
a storyboard: every tile framed, lit, and unmistakably about something.
