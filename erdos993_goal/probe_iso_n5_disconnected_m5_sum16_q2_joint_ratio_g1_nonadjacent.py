#!/usr/bin/env python3
"""Numeric/exact-corner reconnaissance for joint P0/H q=2 ratio cones."""

import itertools

import numpy as np
import sympy as sp

from probe_iso_n5_disconnected_m5_sum16_q2_component_newton_g1_nonadjacent import (
    generic_newton_rows,
)
from prove_iso_n5_disconnected_m5_middle_interval_g1_nonadjacent import choose


def ratio_sequence(prefix, first, last_ceiling, sector):
    w, alpha = sp.symbols(f"{prefix}_w {prefix}_alpha", nonnegative=True)
    last = last_ceiling * w
    if sector == "high":
        z = sp.symbols(f"{prefix}_z0:{4 if prefix.startswith('x') else 3}", nonnegative=True)
        excess = first - last - len(z)
        values = [last]
        for variable in reversed(z):
            values.append(values[-1] + 1 + excess * variable)
        return tuple(reversed(values)), (w,), z
    z = sp.symbols(f"{prefix}_z0:{3 if prefix.startswith('x') else 2}", nonnegative=True)
    excess = first - last - (4 if prefix.startswith('x') else 3)
    values = [last]
    for variable in reversed(z[1:]):
        values.append(values[-1] + 1 + excess * variable)
    values.append(values[-1] + 2 - alpha + excess * z[0])
    values.append(values[-1] + alpha)
    return tuple(reversed(values)), (w, alpha), z


def coefficient_substitutions(order, ratios, maximum_rank):
    product = 1
    result = {}
    for rank, rho in zip(range(2, maximum_rank + 1), ratios):
        product *= rho
        result[rank] = order * product / (2 ** (rank - 1) * sp.factorial(rank))
    return result


def cone(mode, x_sector, h_sector):
    x, h, rows = generic_newton_rows()
    e = sp.symbols("e", positive=True)
    order = e + (2 if mode == "distinct" else 1)
    x_first = sp.factor(4 * (choose(order, 2) - e) / order)
    x_last_ceiling = 2 * (order - 5)
    xr, xcubes, xz = ratio_sequence(f"x_{mode}_{x_sector}", x_first, x_last_ceiling, x_sector)

    h_first = sp.factor(4 * (choose(e, 2) - (e - 2)) / e)
    # The high/low forest cone itself gives rho4<=rho1-3.
    hr, hcubes, hz = ratio_sequence(f"h_{mode}_{h_sector}", h_first, h_first - 3, h_sector)
    xcoeff = coefficient_substitutions(order, xr, 6)
    hcoeff = coefficient_substitutions(e, hr, 5)
    substitutions = {x[1]: order, h[1]: e}
    substitutions.update({x[k]: value for k, value in xcoeff.items()})
    substitutions.update({h[k]: value for k, value in hcoeff.items()})
    expressions = [row.subs(substitutions) for row in rows[:3]]
    return e, (*xcubes, *hcubes), xz, hz, expressions


def probe(mode, xs, hs):
    e, cubes, xz, hz, expressions = cone(mode, xs, hs)
    rng = np.random.default_rng(993 + len(mode) + len(xs) + 2 * len(hs))
    for row_index, expression in enumerate(expressions):
        failures = []
        for order in (13, 20, 40, 100):
            for corner in itertools.product((0, 1), repeat=len(cubes)):
                for xi in range(len(xz)):
                    for hi in range(len(hz)):
                        value = sp.factor(expression.subs({
                            e: order,
                            **dict(zip(cubes, corner)),
                            **{v: int(index == xi) for index, v in enumerate(xz)},
                            **{v: int(index == hi) for index, v in enumerate(hz)},
                        }))
                        if value < 0:
                            failures.append((order, corner, xi, hi, value))
        evaluator = sp.lambdify((e, *cubes, *xz, *hz), expression, modules="numpy")
        best = None
        samples = 5000
        for order in (13, 20, 40, 100):
            cv = [rng.random(samples) for _ in cubes]
            xraw = rng.exponential(size=(len(xz), samples)); xv = xraw / xraw.sum(axis=0)
            hraw = rng.exponential(size=(len(hz), samples)); hv = hraw / hraw.sum(axis=0)
            values = np.asarray(evaluator(order, *cv, *xv, *hv), dtype=float)
            index = int(np.argmin(values))
            point = (float(values[index]), order)
            best = point if best is None or point < best else best
        print(mode, xs, hs, row_index, "corner_neg", len(failures), "best", best, flush=True)
        for failure in failures[:3]:
            print("NEG", failure, flush=True)


def main():
    for mode in ("distinct", "shared"):
        for xs in ("high", "low"):
            for hs in ("high", "low"):
                probe(mode, xs, hs)


if __name__ == "__main__":
    main()
