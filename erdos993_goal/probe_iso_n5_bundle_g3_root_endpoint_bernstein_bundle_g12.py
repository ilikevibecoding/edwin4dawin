#!/usr/bin/env python3
"""Exact Bernstein discovery probe for two rank-five g3 modes.

Uses the proved high-motif charges and a valid two-mark wedge cone.  A passing
row is an exact sufficient tail certificate, but this discovery file does not
promote the result to a theorem and leaves uncovered finite orders explicit.
"""

from __future__ import annotations

import itertools
import json
from math import factorial
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent


def falling(value, degree):
    return factorial(value) // factorial(value - degree)


def compositions(total, parts):
    if parts == 1:
        yield (total,)
        return
    for first in range(total + 1):
        for rest in compositions(total - first, parts - 1):
            yield (first, *rest)


def simplex_coefficients(polynomial, variables, degree):
    power = dict(sp.Poly(sp.expand(polynomial), *variables).terms())
    for alpha in compositions(degree, len(variables) + 1):
        selected = alpha[1:]
        coefficient = 0
        for beta, value in power.items():
            if all(b <= a for b, a in zip(beta, selected)):
                multiplier = sp.Integer(1)
                for aa, bb in zip(selected, beta):
                    multiplier *= falling(aa, bb)
                multiplier /= falling(degree, sum(beta))
                coefficient += value * multiplier
        yield alpha, sp.factor(coefficient)


def all_power_nonnegative(expression, variable):
    return all(c >= 0 for c in sp.Poly(sp.expand(expression), variable).all_coeffs())


def bernstein_sign(expression, variables, tail, sign):
    n = sp.Symbol("n")
    m = sp.Symbol("tail_m", nonnegative=True)
    transformed = sp.cancel(sign * expression.subs(n, tail + m))
    degree = max(sum(monomial) for monomial in sp.Poly(transformed, *variables).monoms())
    rows = list(simplex_coefficients(transformed, variables, degree))
    return all(all_power_nonnegative(coefficient, m) for _, coefficient in rows), degree, rows


def main():
    report = json.loads((HERE / "iso_n5_bundle_g3_five_mode_configuration_bundle_g12_20260829.json").read_text())
    n = sp.Symbol("n")
    e = sp.Symbol("C_edges")
    du, dv, adjacent = sp.symbols("C_degree_u C_degree_v C_adjacent")
    wedges = sp.Symbol("C_wedges")
    xu, xv = sp.symbols("C_neighbor_excess_u C_neighbor_excess_v")
    common = sp.Symbol("C_common_neighbor")
    sx, sy, sr = sp.symbols("sx sy sr", nonnegative=True)
    variables = (sx, sy, sr)
    m = sp.Symbol("tail_m", nonnegative=True)

    modes = {
        "no_mark_root_k0": 18,
        "singleton_endpoint": 8,
    }
    for cutoff in range(8, 81):
        success = True
        records = []
        for mode, motif_charge in modes.items():
            residual = sp.sympify(report["modes"][mode]["residual_without_high_motifs"])
            for a in (0, 1):
              for zu, zv in itertools.product((0, 1), repeat=2):
                total = n - 1 - a - zu - zv
                x, y, r = zu * total * sx, zv * total * sy, total * sr
                structural = {
                    adjacent: a,
                    du: a + zu + x,
                    dv: a + zv + y,
                    e: a + zu + zv + x + y + r,
                }
                # Exact valid forest cap.  After removing u,v there are r
                # edges.  Every remaining edge contributes at most two mark-
                # attachment incidences, so the other-vertex wedge count is
                # at most C(r+2,2).
                wedge_cap = (
                    (a + zu + x) * (a + zu + x - 1) / 2
                    + (a + zv + y) * (a + zv + y - 1) / 2
                    + (r + zu + zv) * (r + zu + zv - 1) / 2
                )
                if a == 0:
                    # If u,v are nonadjacent, a connected three-edge subtree
                    # containing both marks either uses their length-2 path
                    # and one extension, or is their unique length-3 path.
                    # In both cases R3_both<=n-3.
                    r3_both_bound = zu * zv * (n - 3)
                else:
                    # Exact count when uv is an edge: choose two further
                    # edges at u/v, or extend once past a neighbour.
                    total_mark_excess = du + dv - 2
                    r3_both_bound = (
                        total_mark_excess * (total_mark_excess - 1) / 2
                        + xu + xv - du - dv + 2
                    )
                charged = sp.expand(residual - motif_charge * r3_both_bound)
                derivatives = {
                    "wedges": sp.factor(sp.diff(charged, wedges).subs(structural)),
                    "xu": sp.factor(sp.diff(charged, xu).subs(structural)),
                    "xv": sp.factor(sp.diff(charged, xv).subs(structural)),
                    "common": sp.factor(sp.diff(charged, common).subs(structural)),
                }
                signs = {}
                expected = {"wedges": -1, "xu": 1, "xv": 1, "common": -1}
                for key, derivative in derivatives.items():
                    ok, degree, rows = bernstein_sign(derivative, variables, cutoff, expected[key])
                    signs[key] = ok
                    if not ok:
                        success = False
                lower = sp.expand(charged.subs(structural).subs({
                    wedges: wedge_cap,
                    xu: 0,
                    xv: 0,
                    common: (1 - a) * zu * zv,
                }))
                ok, degree, rows = bernstein_sign(lower, variables, cutoff, 1)
                if not ok:
                    success = False
                records.append((mode, a, zu, zv, signs, ok, degree, len(rows)))
        if success:
            print("PASS_CUTOFF", cutoff)
            for row in records:
                print(row)
            return
        if cutoff in (8, 12, 20, 40, 80):
            print("FAIL_CUTOFF", cutoff, records)


if __name__ == "__main__":
    main()
