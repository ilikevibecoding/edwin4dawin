#!/usr/bin/env python3
"""Search for obstructions to the stronger bottom-kernel difference pencil."""

from __future__ import annotations

import random

import numpy as np
import sympy as sp

from probe_group_as_bottom_difference import bottom, x, y


t, u = sp.symbols("t u")


def numerical_real_count(poly: sp.Poly):
    coeffs = np.array([float(v) for v in poly.all_coeffs()], dtype=float)
    coeffs /= np.max(np.abs(coeffs))
    roots = np.roots(coeffs)
    return int(np.sum(np.abs(roots.imag) < 1e-6)), roots


if __name__ == "__main__":
    rng = random.Random(8675309)
    for m in range(1, 8):
        N, d = 3 * m + 4, 2 * m + 5
        a = bottom(N + 1, d)
        b = bottom(N, d - 2)
        pencils = {"minus": a - u * b, "plus": a + u * b}
        failures = {}
        for label, pencil in pencils.items():
            for trial in range(80):
                values = {
                    x: rng.randint(-30, 30) + rng.randint(1, 9) * t,
                    y: rng.randint(-30, 30) + rng.randint(1, 9) * t,
                    u: rng.randint(-30, 30) + rng.randint(1, 9) * t,
                }
                line = sp.Poly(sp.expand(pencil.subs(values)), t)
                count, roots = numerical_real_count(line)
                if count != line.degree():
                    failures[label] = {
                        "values": {str(k): str(v) for k, v in values.items()},
                        "degree": line.degree(),
                        "numerical_real_count": count,
                        "max_imaginary": float(np.max(np.abs(roots.imag))),
                    }
                    break
        print("m", m, failures, flush=True)
