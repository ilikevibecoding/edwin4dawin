"""Numerically locate the largest below-both-tails Weyl crossing."""

import json
from pathlib import Path
import random

import numpy as np

import probe_adjacent_cubic_tail_weyl_collision_index as tw


def ghost(fun, r, u, v, c):
    z = [float(x) for x in fun(r, u, v, c)]
    da0, da1, da2, ba1, ba2, dh0, dh1, bh1 = z
    na, qa = tw.poly_tail3(da0, da1, da2, ba1, ba2)
    nh, qh = tw.poly_tail2(dh0, dh1, bh1)
    ea = np.linalg.eigvalsh(tw.matrix3(da0, da1, da2, ba1, ba2))
    eh = np.linalg.eigvalsh(tw.matrix2(dh0, dh1, bh1))
    candidates = []
    for root in np.roots(na * qh - nh * qa):
        if abs(root.imag) < 1e-7 and 0 < root.real < min(ea[0], eh[0]):
            candidates.append(float(root.real))
    return max(candidates) if candidates else None


def main():
    rng = random.Random(993_20260806)
    maxima = {}
    total = 0
    for parity in ("odd", "even"):
        fun = tw.load(parity)
        best = None
        r_values = list(range(31)) + [40, 60, 100, 150, 250, 500]
        for r in r_values:
            parameters = [
                (0, 0, 10**x) for x in np.linspace(-6, 6, 49)
            ] + [
                (0, 1, 10**x) for x in np.linspace(-6, 6, 49)
            ] + [
                (1, 1, 10**x) for x in np.linspace(-6, 6, 49)
            ]
            parameters += [
                (rng.random(), rng.random(), 10 ** rng.uniform(-6, 6))
                for _ in range(300)
            ]
            for u, v, c in parameters:
                y = ghost(fun, r, u, v, c)
                total += 1
                if y is not None and (best is None or y > best["y"]):
                    best = {"parity": parity, "r": r, "u": u, "v": v, "c": c, "y": y}
        maxima[parity] = best
    report = {"samples": total, "maxima": maxima, "overall": max(maxima.values(), key=lambda x: x["y"])}
    out = Path(__file__).with_name("tail_ghost_root_maximum_scan_20260806.json")
    out.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
