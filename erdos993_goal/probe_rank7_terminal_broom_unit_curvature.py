#!/usr/bin/env python3
"""Numerically probe curvature in the actual nested unit-box coordinates.

This is exploratory only.  It distinguishes concavity in independent defect
variables from concavity after the conditional endpoint maps used by the
Bernstein corner calculations.
"""

from __future__ import annotations

import argparse
import random

import sympy as sp

from verify_rank7_terminal_broom_middle_differences import (
    D4_CEILING,
    abstract_numerator,
)


def unit_expression(rank: int):
    numerator, _, variables = abstract_numerator(rank)
    n, w, x, u, v, z, s, d = variables
    U, V, Z, S, D = sp.symbols("U V Z S D")
    u0 = (2 + x) / 10
    um = u0 + (D4_CEILING - u0) * U
    x5 = x / (1 - um)
    v0 = (2 + x5) / 12
    v1 = sp.Rational(1, 6) + x5 / 2
    vm = v0 + (v1 - v0) * V
    x6 = x5 / (1 - vm)
    z0 = (2 + x6) / 14
    z1 = sp.Rational(1, 7) + x6 / 2
    zm = z0 + (z1 - z0) * Z
    mapped = sp.cancel(
        numerator.subs(
            {u: um, v: vm, z: zm, s: (1 + S) / 2, d: (1 + D) / 2},
            simultaneous=True,
        )
    )
    return mapped, (n, w, x, U, V, Z, S, D)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--rank", type=int, choices=range(3, 7), required=True)
    parser.add_argument("--samples", type=int, default=2000)
    args = parser.parse_args()
    expression, variables = unit_expression(args.rank)
    curvatures = [sp.lambdify(variables, sp.diff(expression, q, 2), "numpy")
                  for q in variables[3:]]
    rng = random.Random(9931761 + args.rank)
    extrema = [[float("inf"), float("-inf"), None, None]
               for _ in curvatures]
    for _ in range(args.samples):
        n = rng.randint(39, 2000)
        w = rng.uniform(3 / (n - 3), 3 * (n - 1) / ((n - 3) * (n - 4)))
        x = rng.uniform(8 * w / (6 - w), 4 * w / (3 * (1 - w)))
        point = (n, w, x, *(rng.random() for _ in range(5)))
        for j, curvature in enumerate(curvatures):
            value = float(curvature(*point))
            if value < extrema[j][0]:
                extrema[j][0], extrema[j][2] = value, point
            if value > extrema[j][1]:
                extrema[j][1], extrema[j][3] = value, point
    print("rank", args.rank)
    for variable, values in zip(variables[3:], extrema):
        print("curvature", variable, "min", values[0], "max", values[1])
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
