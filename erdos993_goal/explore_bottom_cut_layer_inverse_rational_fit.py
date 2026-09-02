#!/usr/bin/env python3
"""Fit fixed checker-inverse cross ratios of W as rational functions of d."""

from __future__ import annotations

import sympy as sp
from sympy.polys.polyfuncs import rational_interpolate

from verify_bottom_q_pencil_null_deflation import null_coordinate_data


D = sp.symbols("d")
samples: dict[tuple[int, int], list[tuple[int, sp.Expr]]] = {
    (0, 0): [],
    (0, 1): [],
    (1, 0): [],
    (1, 1): [],
}

for d in range(4, 19):
    _, _, _, _, middle1 = null_coordinate_data(d)
    w = middle1[:-1, 1:]
    signs = sp.diag(*[(-1) ** i for i in range(w.rows)])
    inverse = sp.simplify(signs * w.inv() * signs)
    for i, j in samples:
        samples[i, j].append((d, sp.factor(inverse[i, j])))
    print(f"built d={d}")

derived = {
    "entry00": samples[0, 0],
    "cross00": [
        (
            d,
            sp.factor(
                samples[0, 0][k][1] * samples[1, 1][k][1]
                / (samples[0, 1][k][1] * samples[1, 0][k][1])
            ),
        )
        for k, (d, _) in enumerate(samples[0, 0])
    ],
}

for name, data in derived.items():
    training = data[:10]
    holdout = data[10:]
    print(name)
    found = False
    for numerator_degree in range(0, len(training)):
        candidate = sp.factor(rational_interpolate(training, numerator_degree, X=D))
        if all(sp.factor(candidate.subs(D, d) - value) == 0 for d, value in holdout):
            print(" fit", numerator_degree, candidate)
            found = True
            break
    if not found:
        print(" no rational fit survived holdout")
