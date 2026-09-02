#!/usr/bin/env python3
"""Exact fast-Bernstein probe for nonadjacent marks with edgeless W."""

from __future__ import annotations

import itertools
import os

import sympy as sp

from explore_iso_n6_bundle_g1_adjacent_double_star_fast_bernstein_g1_nonadjacent import (
    invert_axis,
    transform_axis,
)
from explore_iso_n6_bundle_g2_marked_cone_g1_bernstein import reconstruct


def marked_rows(total, x_count, y_count, common_count, keep_u, keep_v):
    rows = []
    for remove_u, remove_v in ((0, 0), (1, 0), (0, 1), (1, 1)):
        ku = keep_u and not remove_u
        kv = keep_v and not remove_v
        rows.append(tuple(
            sp.binomial(total, rank)
            + int(ku) * sp.binomial(total - x_count - common_count, rank - 1)
            + int(kv) * sp.binomial(total - y_count - common_count, rank - 1)
            + int(ku and kv) * sp.binomial(
                total - x_count - y_count - common_count,
                rank - 2,
            )
            for rank in range(8)
        ))
    return tuple(rows)


def build(common: int, keep_common: int, keep_u: int, keep_v: int):
    expression = reconstruct(1)
    names = {str(x): x for x in expression.free_symbols}
    t, a, b, rx, ry, rz = sp.symbols("t a b rx ry rz", nonnegative=True)
    n, m = t + 8, t + 6
    budget = m - common
    x_count = budget * a
    y_count = budget * (1 - a) * b
    z_count = budget * (1 - a) * (1 - b)
    crows = marked_rows(m, x_count, y_count, common, 1, 1)
    retained_x = x_count * rx
    retained_y = y_count * ry
    retained_z = z_count * rz
    dtotal = retained_x + retained_y + retained_z + keep_common
    drows = marked_rows(
        dtotal,
        retained_x,
        retained_y,
        keep_common,
        keep_u,
        keep_v,
    )
    substitutions = {}
    for prefix, rows in (("c", crows), ("d", drows)):
        for family, row in zip("EUVW", rows):
            for rank in range(8):
                name = f"{prefix}{family}{rank}"
                if name in names:
                    substitutions[names[name]] = row[rank]
    value = sp.expand_func(expression.subs(substitutions))
    return value, t, (a, b, rx, ry, rz)


def main():
    common = int(os.environ.get("G1_COMMON", "0"))
    keep_common = int(os.environ.get("G1_KEEP_COMMON", "0"))
    case = os.environ.get("G1_KEEP_CASE", "00")
    assert common in (0, 1)
    assert keep_common in range(common + 1)
    value, tail, variables = build(common, keep_common, int(case[0]), int(case[1]))
    polynomial = sp.Poly(value, *variables)
    degrees = tuple(polynomial.degree(variable) for variable in variables)
    original = {index: sp.expand(coefficient) for index, coefficient in polynomial.terms()}
    values = dict(original)
    for axis in range(len(variables)):
        values = transform_axis(values, degrees, axis)
        print("FORWARD_AXIS", axis, str(variables[axis]), "ROWS", len(values), flush=True)
    negative = []
    minimum = None
    scalar_count = 0
    for index in sorted(values):
        coefficients = sp.Poly(values[index], tail).all_coeffs()
        scalar_count += len(coefficients)
        local = min(coefficients)
        minimum = local if minimum is None else min(minimum, local)
        if any(coefficient < 0 for coefficient in coefficients):
            negative.append((index, sp.factor(values[index]), coefficients))
    recovered = dict(values)
    for axis in reversed(range(len(variables))):
        recovered = invert_axis(recovered, degrees, axis)
    full_indices = itertools.product(*(range(degree + 1) for degree in degrees))
    assert all(
        sp.expand(recovered[index] - original.get(index, 0)) == 0
        for index in full_indices
    )
    print("COMMON", common, "KEEP_COMMON", keep_common, "CASE", case)
    print("DEGREES", degrees, "POWER_TERMS", len(original))
    print("BERNSTEIN_ROWS", len(values), "TAIL_SCALARS", scalar_count)
    print("MINIMUM", minimum, "NEGATIVE_ROWS", len(negative))
    print("FIRST_NEGATIVE", negative[:1])
    print("PROBE_EXACT_ISO_N6_BUNDLE_G1_NONADJACENT_EDGELESS_W_FAST_BERNSTEIN_G1_NONADJACENT")


if __name__ == "__main__":
    main()
