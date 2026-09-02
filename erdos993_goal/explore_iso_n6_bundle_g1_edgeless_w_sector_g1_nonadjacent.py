#!/usr/bin/env python3
"""Test all 256 exact g1 containment sectors on the edgeless-W boundary."""

from __future__ import annotations

import sympy as sp
import itertools
import os

from explore_iso_n6_bundle_g1_sector_elimination_g1_nonadjacent import sectors
from prove_iso_n6_bundle_g4_marked_edge_bernstein_g1_bernstein import (
    marked_geometry_branches,
)


def bernstein_rows(expression, variables):
    polynomial = sp.Poly(sp.cancel(expression), *variables)
    degrees = tuple(polynomial.degree(variable) for variable in variables)
    power = dict(polynomial.terms())
    values = {}
    for index in itertools.product(*(range(degree + 1) for degree in degrees)):
        value = 0
        for monomial, coefficient in power.items():
            if all(left <= right for left, right in zip(monomial, index)):
                multiplier = 1
                for exponent, location, degree in zip(monomial, index, degrees):
                    multiplier *= sp.binomial(location, exponent) / sp.binomial(degree, exponent)
                value += coefficient * multiplier
        values[index] = sp.factor(value)
    return degrees, values


def main():
    n, t = sp.symbols("n t", integer=True, nonnegative=True)
    a, b, c, d = sp.symbols("a b c d", nonnegative=True)
    failures = []
    passed = coefficients = scalar_coefficients = 0
    minimum = None
    mask_limit = int(os.environ.get("G1_MASK_LIMIT", "256"))
    for mask, expression, names in sectors():
        if mask >= mask_limit:
            break
        nvalue = t + 8
        m = nvalue - 2
        for branch in marked_geometry_branches(m, a, b, c, d):
            label, variables, x, y, edges, z2, z3 = branch
            assert sp.expand(edges.subs(c, 0)) == 0
            substitutions = {n: nvalue}
            for rank in range(2, 8):
                substitutions[names[f"CW{rank}"]] = sp.binomial(m, rank)
                substitutions[names[f"CA{rank}"]] = sp.binomial(m - x, rank - 1)
                substitutions[names[f"CB{rank}"]] = sp.binomial(m - y, rank - 1)
                substitutions[names[f"CZ{rank}"]] = (
                    sp.Integer(z2) if rank == 2 else sp.binomial(z3, rank - 2)
                )
            value = sp.expand_func(expression.subs(substitutions).subs({c: 0, d: 0}))
            bounded = tuple(v for v in variables if v in value.free_symbols and v not in (c, d))
            degrees, rows = bernstein_rows(value, bounded)
            bad = []
            for index, row in rows.items():
                powers = sp.Poly(sp.expand(row), t).all_coeffs()
                scalar_coefficients += len(powers)
                local = min(powers)
                minimum = local if minimum is None else min(minimum, local)
                if any(item < 0 for item in powers):
                    bad.append((index, row, powers))
            coefficients += len(rows)
            if bad:
                failures.append((mask, label, degrees, bad[0], len(bad)))
                print("FAIL", failures[-1])
                if len(failures) >= 10:
                    print("STOP_FAILURES", len(failures))
                    return
            else:
                passed += 1
    print("PASSED", passed, "COEFFICIENTS", coefficients, "SCALARS", scalar_coefficients, "MIN", minimum)
    print("FAILURES", failures)


if __name__ == "__main__":
    main()
