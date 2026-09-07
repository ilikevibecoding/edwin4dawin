#!/usr/bin/env python3
"""Write a still spec for session.mjs: `mkspec.py <round> <port> [views...]` -> /tmp/accockpit/queue/<round>.spec with
one line per view, stills to /tmp/accockpit/shots/<round>/<view>.png. Views are the bench ids plus the gauntlet's
dev cameras below (aircraft moored off the marina at 420,1.96,1905 heading 240, as in the plane-* bench views).
Body -> world for heading 240: fwd = (-0.866, 0, 0.5), right (+Z body) = (-0.5, 0, -0.866)."""
import os, sys

DEV = {
    # from the pilot's eye, 30 cm ahead of it (fixed cameras have a 0.4 m near plane), down at the panel
    'panel': 'dev&cam=419.02,2.86,1905.91&hdg=240&pch=-14&fov=45&time=14&follow=1&plane=420,1.96,1905,240,0,0,0,0.12',
    # from the eye, steeply down at the yoke and hands
    'hands': 'dev&cam=419.24,2.91,1905.78&hdg=240&pch=-35&fov=40&time=14&follow=1&plane=420,1.96,1905,240,0,0,0,0.12',
    # the pilot through the windshield from ahead-left
    'pilot': 'dev&cam=415.84,3.26,1908.79&hdg=48.7&pch=-4.4&fov=20&time=14&follow=1&plane=420,1.96,1905,240,0,0,0,0',
    # the pilot's head through the windshield from ahead-left, 2.3 m away (the head sits at the door's rear post,
    # so a profile through the door window is half hidden)
    'head': 'dev&cam=418.0,3.06,1907.54&hdg=37.6&pch=-3.8&fov=12&time=14&follow=1&plane=420,1.96,1905,240,0,0,0,0',
    # the nose from ahead-right, engine idling (throttle 0.12 -> ~980 RPM)
    'prop': 'dev&cam=415.19,2.26,1910.67&hdg=13.8&pch=-4.6&fov=30&time=14&follow=1&plane=420,1.96,1905,240,0,0,0,0.12',
    # the same nose at the idle floor (throttle 0 -> 760 RPM) and stopped (the engine floor is 760: stopped is
    # not reachable from the URL, the blades at rest are the 760 state with the shortest smear)
    'prop-idle': 'dev&cam=415.19,2.26,1910.67&hdg=13.8&pch=-4.6&fov=30&time=14&follow=1&plane=420,1.96,1905,240,0,0,0,0',
    # the same nose at cruise power in the air (~2200 RPM): the blur disc
    'propfast': 'dev&cam=415.19,150.30,1910.67&hdg=13.8&pch=-4.6&fov=30&time=14&follow=1&presim=3&plane=420,150,1905,240,0,0,50,0.8',
    # idle from the seat: throttle 0 (760 RPM) with the panel and the prop through the windshield
    'cockpit-idle': 'dev&mode=cockpit&fov=50&time=14&plane=420,1.96,1905,240,0,0,0,0',
    # night cockpit: instrument lighting
    'cockpit-night': 'dev&mode=cockpit&fov=50&time=22&plane=-400,320,-900,318,0,0,55,0.7&presim=30',
    # sun ahead from the seat: the windshield's dust and scratches against the light (17:50, sun in the west, heading 262)
    'cockpit-sun': 'dev&mode=cockpit&fov=50&time=17.9&plane=1400,280,600,262,1,0,55,0.7&presim=30',
}
STEPS = {'cockpit-city': 0}

def main():
    rnd, port, *views = sys.argv[1:]
    if not views:
        views = ['cockpit-city', 'glass-sun', 'plane-front-quarter', 'plane-rear-quarter', 'panel', 'hands', 'pilot', 'head', 'prop', 'propfast']
    os.makedirs('/tmp/accockpit/queue', exist_ok=True)
    lines = []
    for v in views:
        q = DEV.get(v, v)
        out = f'/tmp/accockpit/shots/{rnd}/{v}.png'
        lines.append(f'{out}\thttp://127.0.0.1:{port}/?bench={q}\t{STEPS.get(v, 0)}')
    spec = f'/tmp/accockpit/queue/{rnd}.spec'
    with open(spec + '.tmp', 'w') as f:
        f.write('\n'.join(lines) + '\n')
    os.rename(spec + '.tmp', spec)
    print(spec)

if __name__ == '__main__':
    main()
