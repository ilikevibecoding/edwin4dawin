#!/usr/bin/env python3
"""Reconnaissance for the fully general active-root sum16 induced cone."""

import itertools

import numpy as np
import sympy as sp

from probe_iso_n5_disconnected_m5_sum16_q2_component_newton_g1_nonadjacent import (
    generic_newton_rows,
)
from prove_iso_n5_disconnected_m5_middle_interval_g1_nonadjacent import choose


def cone(sector):
    x, h, rows = generic_newton_rows()
    e, a, q = sp.symbols("e a q", positive=True)
    N = e + a
    sub = {
        x[1]: N,
        x[2]: choose(N, 2) - e,
        h[1]: e,
        h[2]: choose(e, 2) - (e - q),
    }
    h3_floor = choose(e, 3) - (e - q) * (e - 2)
    d4_floor = choose(a, 4) + e * choose(a, 3) - q * choose(a - 1, 2)
    d5_floor = choose(a, 5) + e * choose(a, 4) - q * choose(a - 1, 3)
    lower = [
        sp.expand(rows[index].subs(sub).subs({
            h[3]: h3_floor,
            h[4]: x[4] - d4_floor,
            h[5]: x[5] - d5_floor,
        }))
        for index in range(3)
    ]
    A, Q, w, alpha = sp.symbols("A Q w alpha", nonnegative=True)
    a_box = 1 + A * (e - 1)
    q_box = a_box + Q * (e - a_box)
    N_box = sp.expand(N.subs(a, a_box))
    rho1 = sp.factor(4 * (choose(N, 2) - e) / N)
    rho5 = 2 * (N - 5) * w
    excess = rho1 - rho5 - 4
    if sector == "high":
        z = sp.symbols("high_z0:4", nonnegative=True)
        r4 = rho5 + 1 + excess * z[3]
        r3 = r4 + 1 + excess * z[2]
        r2 = r3 + 1 + excess * z[1]
        r1 = r2 + 1 + excess * z[0]
        cubes = (A, Q, w)
    else:
        z = sp.symbols("low_z0:3", nonnegative=True)
        r4 = rho5 + 1 + excess * z[2]
        r3 = r4 + 1 + excess * z[1]
        r2 = r3 + 2 - alpha + excess * z[0]
        r1 = r2 + alpha
        cubes = (A, Q, w, alpha)
    product = 1
    xsub = {}
    for rank, rho in zip(range(2, 7), (r1, r2, r3, r4, rho5)):
        product *= rho
        xsub[x[rank]] = N * product / (2 ** (rank - 1) * sp.factorial(rank))
    expressions = [
        row.subs(xsub).subs({q: q_box, a: a_box})
        for row in lower
    ]
    return e, cubes, z, expressions, N_box


def probe(sector):
    e, cubes, z, rows, _N = cone(sector)
    rng = np.random.default_rng(993 + len(sector))
    for row_index, row in enumerate(rows):
        failures = []
        for E in (13, 20, 40, 100):
            for corner in itertools.product((0, 1), repeat=len(cubes)):
                for chosen in range(len(z)):
                    value = sp.factor(row.subs({
                        e: E,
                        **dict(zip(cubes, corner)),
                        **{v: int(index == chosen) for index, v in enumerate(z)},
                    }))
                    if value < 0:
                        failures.append((E, corner, chosen, value))
        evaluator = sp.lambdify((e, *cubes, *z), row, modules="numpy")
        best = None
        samples = 30000
        for E in (13, 20, 40, 100):
            cv = [rng.random(samples) for _ in cubes]
            raw = rng.exponential(size=(len(z), samples)); zv = raw / raw.sum(axis=0)
            values = np.asarray(evaluator(E, *cv, *zv), dtype=float)
            index = int(np.argmin(values))
            point = (float(values[index]), E, tuple(float(v[index]) for v in cv))
            best = point if best is None or point < best else best
        print(sector, row_index, "corner_neg", len(failures), "best", best, flush=True)
        for failure in failures[:10]:
            print("NEG", failure, flush=True)


def main():
    for sector in ("high", "low"):
        probe(sector)


if __name__ == "__main__":
    main()
