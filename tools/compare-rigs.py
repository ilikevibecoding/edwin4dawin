#!/usr/bin/env python3
"""Compare the rest poses of two glTF skeletons.

Animation clips store local bone rotations relative to the rest pose, so clips
can only be reused across rigs by renaming tracks if the rest poses agree.
"""
import math
import sys

sys.path.insert(0, __file__.rsplit('/', 1)[0])
from inspect_glb import read_glb_json  # noqa: E402


def quat_of(node):
    r = node.get('rotation')
    if r:
        return r
    m = node.get('matrix')
    if m:
        # column-major 4x4 -> rotation part (assume no shear, uniform scale)
        import numpy as np
        M = np.array(m).reshape(4, 4).T
        R = M[:3, :3]
        sx = np.linalg.norm(R[:, 0]) or 1
        R = R / sx
        t = R.trace()
        if t > 0:
            s = math.sqrt(t + 1.0) * 2
            w = 0.25 * s
            x = (R[2, 1] - R[1, 2]) / s
            y = (R[0, 2] - R[2, 0]) / s
            z = (R[1, 0] - R[0, 1]) / s
        else:
            w, x, y, z = 1, 0, 0, 0
        return [x, y, z, w]
    return [0, 0, 0, 1]


def bones_of(g):
    joints = set()
    for s in g.get('skins', []):
        joints.update(s.get('joints', []))
    out = {}
    for i in joints:
        n = g['nodes'][i]
        name = n.get('name', '')
        canon = name.split(':')[-1]
        out[canon] = quat_of(n)
    return out


def angle_between(q1, q2):
    d = abs(sum(a * b for a, b in zip(q1, q2)))
    d = min(1.0, d)
    return math.degrees(2 * math.acos(d))


a_path, b_path = sys.argv[1], sys.argv[2]
A = bones_of(read_glb_json(a_path))
B = bones_of(read_glb_json(b_path))
shared = sorted(set(A) & set(B))
print(f"{a_path} vs {b_path}: {len(shared)} shared bones")
worst = []
for name in shared:
    ang = angle_between(A[name], B[name])
    worst.append((ang, name))
worst.sort(reverse=True)
print("largest rest-pose differences (degrees):")
for ang, name in worst[:16]:
    print(f"  {ang:7.2f}  {name}")
avg = sum(a for a, _ in worst) / len(worst)
print(f"mean difference: {avg:.2f} deg")
