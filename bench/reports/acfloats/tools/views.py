#!/usr/bin/env python3
"""Shot spec for bench/scripts/shots.mjs: the three canonical views the float rig must be judged in
(rear / front three-quarter, the reference aerial) plus fixed dev close-ups of the floats posed in the
aircraft's body frame (camera offset and look-at point in body metres: +X nose, +Y up, +Z starboard).

    python3 bench/reports/acfloats/tools/views.py <port> <outdir> [views,comma,separated|all] [w h] > spec.txt
    node bench/scripts/shots.mjs spec.txt 640 360 3        # iteration (pass 640 360 to views.py too)
    node bench/scripts/shots.mjs spec.txt 1280 720 3       # round evidence

The close-ups never change between rounds so before / after crops line up pixel for pixel.
"""
import math
import sys

SEED = 20260904
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 4620
OUT = sys.argv[2] if len(sys.argv) > 2 else '/tmp/acfloats/shots'
ONLY = sys.argv[3].split(',') if len(sys.argv) > 3 and sys.argv[3] != 'all' else None
W = int(sys.argv[4]) if len(sys.argv) > 4 else 1280
H = int(sys.argv[5]) if len(sys.argv) > 5 else 720

# moored / taxiing pose shared by the canonical aircraft views (rest datum y 1.96)
P = (420.0, 1.96, 1905.0)
# in flight over the bay
FLY = (420.0, 60.0, 1905.0)
# parked on runway 09 (elevation 2.9, wheel rest datum 2.57): the amphibious gear is down over land
LAND = (-8500.0, 2.9 + 2.57, -1350.0)


def frame(heading_deg):
    h = math.radians(heading_deg)
    fwd = (math.sin(h), 0.0, -math.cos(h))
    stb = (-fwd[2], 0.0, fwd[0])  # starboard = forward x up
    return fwd, stb


def world(p, heading_deg, body):
    fwd, stb = frame(heading_deg)
    bx, by, bz = body
    return (p[0] + fwd[0] * bx + stb[0] * bz, p[1] + by, p[2] + fwd[2] * bx + stb[2] * bz)


def look(cam, target):
    d = (target[0] - cam[0], target[1] - cam[1], target[2] - cam[2])
    horiz = math.hypot(d[0], d[2])
    hdg = math.degrees(math.atan2(d[0], -d[2]))
    pch = math.degrees(math.atan2(d[1], horiz))
    return hdg, pch


def dev(label, cam_body, target_body, fov=35, time=10.0, plane=P, heading=240, pitch=0, bank=0, speed=3.5, throttle=0.12, weather='clear', extra=''):
    cam = world(plane, heading, cam_body)
    tgt = world(plane, heading, target_body)
    hdg, pch = look(cam, tgt)
    q = (f"bench=dev&cam={cam[0]:.2f},{cam[1]:.2f},{cam[2]:.2f}&hdg={hdg:.2f}&pch={pch:.2f}&fov={fov}&time={time}&weather={weather}"
         f"&plane={plane[0]},{plane[1]},{plane[2]},{heading},{pitch},{bank},{speed},{throttle}&nohud=1{extra}")
    return label, q


VIEWS = [
    ('rear', 'bench=plane-rear-quarter'),
    ('front', 'bench=plane-front-quarter'),
    ('aerial', 'bench=aerial-a'),
    # low three-quarter from the water surface off the starboard bow, lens 0.7 m over the water: hull sections,
    # freeboard, bow, spray rails, struts and spreader bars against the fuselage
    dev('riglow', (6.0, -1.25, 4.6), (0.3, -1.75, 0.5), fov=40, time=14.0),
    # straight on from ahead, lens 1 m over the water: the two hulls' sections, the X wires, strut splay
    dev('bowon', (10.0, -0.95, 0.0), (2.6, -1.65, 0.0), fov=34, time=10.0),
    # from below and behind in flight against the sky: keels, step, afterbody, transoms, water rudders, wheel wells
    dev('belowaft', (-9.0, -5.5, 3.2), (-0.3, -1.9, 0.0), fov=40, time=14.0, plane=FLY, speed=52, throttle=0.7),
    # along the port float deck from above the bow: deck finish, hatches, cleats, spreader saddles, the ladder
    dev('deck', (5.2, 0.7, -2.9), (-0.8, -1.65, -1.2), fov=36, time=14.0),
    # parked on the runway, gear down: tyres, hubs, axle fairings, retract linkage under the hulls
    dev('gear', (5.5, -1.0, 4.2), (0.2, -2.1, 0.4), fov=38, time=10.0, plane=LAND, heading=90, speed=0, throttle=0),
]

for label, q in VIEWS:
    if ONLY and label not in ONLY:
        continue
    print(f"{OUT}/{label}.png\thttp://127.0.0.1:{PORT}/?{q}&w={W}&h={H}&freeze=1&seed={SEED}")
