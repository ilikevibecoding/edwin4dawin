#!/usr/bin/env python3
"""Shot spec for bench/scripts/shots.mjs: the three canonical aircraft views plus dev close-ups posed in the
aircraft's body frame (camera offset and look-at point in body metres: +X nose, +Y up, +Z starboard).

    python3 bench/reports/acgeo/tools/views.py <port> <outdir> [views,comma,separated] > spec.txt
    node bench/scripts/shots.mjs spec.txt 1280 720
"""
import math
import sys

SEED = 20260904
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 4543
OUT = sys.argv[2] if len(sys.argv) > 2 else '/tmp/acgeo/shots'
ONLY = sys.argv[3].split(',') if len(sys.argv) > 3 else None

# moored / taxiing pose shared by the canonical aircraft views
P = (420.0, 1.96, 1905.0)


def frame(heading_deg):
    h = math.radians(heading_deg)
    fwd = (math.sin(h), 0.0, -math.cos(h))
    # starboard = forward x up
    stb = (fwd[1] * 0 - fwd[2] * 1, fwd[2] * 0 - fwd[0] * 0, fwd[0] * 1 - fwd[1] * 0)
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
         f"&plane={plane[0]},{plane[1]},{plane[2]},{heading},{pitch},{bank},{speed},{throttle}{extra}")
    return label, q


FLY = (420.0, 60.0, 1905.0)
VIEWS = [
    ('front', 'bench=plane-front-quarter'),
    ('rear', 'bench=plane-rear-quarter'),
    ('glass', 'bench=glass-sun'),
    # cowl from the port bow, 4.5 m: nose bowl, inlets, exhaust, cowl fasteners, spinner integration
    dev('nose', (8.6, 0.5, -3.2), (4.0, 0.1, 0.0), fov=32, time=10.0),
    # port wing tip / aileron from behind and below (airfoil section, hinge gap, tip, nav light) against the sky
    dev('wingtip', (-4.5, 0.2, -8.5), (-0.6, 1.3, -6.0), fov=34, time=14.0),
    # tail from the starboard rear quarter, 6 m: stabiliser, elevator / rudder gaps, trim tab, fin proportions
    dev('tail', (-9.5, 1.8, 3.8), (-4.6, 0.9, 0.0), fov=34, time=14.0),
    # float rig from astern-low: struts, spreader bars, wires, water rudders, cables, cleats
    dev('rig', (-6.5, -0.4, 2.8), (0.0, -1.6, 0.0), fov=38, time=14.0),
    # door side, 5 m: door seam, handle, hinges, steps, window seals, rivet lap joints
    dev('door', (2.2, 0.2, -5.2), (1.3, 0.2, 0.0), fov=34, time=10.0),
    # silhouette at 30 m, chase-like rear quarter in flight against the sky and water
    dev('chase30', (-24.0, 6.0, -16.0), (0.0, 0.0, 0.0), fov=40, time=14.0, plane=FLY, speed=52, throttle=0.7),
    # straight below in flight: the underside against the sky (undersides, flap / aileron cut-outs, float bottoms)
    dev('below', (2.0, -22.0, -6.0), (0.0, 0.0, 0.0), fov=40, time=14.0, plane=FLY, speed=52, throttle=0.7),
    # tail-on and nose-on, 16 m, level
    dev('tailon', (-16.0, 1.0, 0.6), (-2.0, 0.6, 0.0), fov=36, time=14.0, plane=FLY, speed=52, throttle=0.7),
    dev('noseon', (16.0, 0.6, -0.8), (2.0, 0.4, 0.0), fov=36, time=10.0, plane=FLY, speed=52, throttle=0.7),
    # starboard lower cowl from ahead and below, 4 m: exhaust tailpipe and heat shield, cowl flaps, chin scoop
    dev('exhaust', (6.2, -0.9, 3.4), (3.0, -0.35, 0.2), fov=34, time=10.0),
    # port stern quarter at water level, 7 m: ventral fin, water rudders, stern cleats, tail light
    dev('stern', (-9.0, -0.6, -4.0), (-4.2, -0.6, 0.0), fov=34, time=14.0),
]

for label, q in VIEWS:
    if ONLY and label not in ONLY:
        continue
    print(f"{OUT}/{label}.png\thttp://127.0.0.1:{PORT}/?{q}&freeze=1&seed={SEED}")
