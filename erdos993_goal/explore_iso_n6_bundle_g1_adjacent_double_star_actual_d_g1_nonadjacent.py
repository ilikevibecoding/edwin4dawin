#!/usr/bin/env python3
"""Explore exact Bernstein closure for adjacent double-stars plus isolates."""

from __future__ import annotations

import os

import sympy as sp

from explore_iso_n6_bundle_g2_marked_cone_g1_bernstein import reconstruct
from explore_iso_n6_bundle_g1_edgeless_w_sector_g1_nonadjacent import bernstein_rows


def marked_rows(total, x_count, y_count, keep_u, keep_v):
    rows = []
    for remove_u, remove_v in ((0, 0), (1, 0), (0, 1), (1, 1)):
        ku = keep_u and not remove_u
        kv = keep_v and not remove_v
        rows.append(tuple(
            sp.binomial(total, rank)
            + int(ku) * sp.binomial(total - x_count, rank - 1)
            + int(kv) * sp.binomial(total - y_count, rank - 1)
            for rank in range(8)
        ))
    return tuple(rows)


def main():
    expression = reconstruct(1)
    names = {str(x): x for x in expression.free_symbols}
    t, a, b, rx, ry, rz = sp.symbols("t a b rx ry rz", nonnegative=True)
    n = t + int(os.environ.get("G1_ORDER_FLOOR", "8"))
    m = n - 2
    x_count = m * a
    y_count = m * (1 - a) * b
    z_count = m * (1 - a) * (1 - b)
    crows = marked_rows(m, x_count, y_count, 1, 1)
    only_case = os.environ.get("G1_KEEP_CASE")
    for keep_u in (0, 1):
        for keep_v in (0, 1):
            if only_case is not None and only_case != f"{keep_u}{keep_v}":
                continue
            retained_x = x_count * rx
            retained_y = y_count * ry
            retained_z = z_count * rz
            total = retained_x + retained_y + retained_z
            drows = marked_rows(total, retained_x, retained_y, keep_u, keep_v)
            substitutions = {}
            for prefix, rows in (("c", crows), ("d", drows)):
                for family, row in zip("EUVW", rows):
                    for rank in range(8):
                        name = f"{prefix}{family}{rank}"
                        if name in names:
                            substitutions[names[name]] = row[rank]
            value = sp.expand_func(expression.subs(substitutions))
            variables = (a, b, rx, ry, rz)
            degrees, rows = bernstein_rows(value, variables)
            bad = []
            scalar = 0
            minimum = None
            for index, row in rows.items():
                coefficients = sp.Poly(sp.expand(row), t).all_coeffs()
                scalar += len(coefficients)
                local = min(coefficients)
                minimum = local if minimum is None else min(minimum, local)
                if any(item < 0 for item in coefficients):
                    bad.append((index, sp.factor(row), coefficients))
            print("CASE", keep_u, keep_v, "DEGREES", degrees, "ROWS", len(rows), "SCALARS", scalar, "MIN", minimum, "BAD", len(bad))
            print("FIRST_BAD", bad[:1])


if __name__ == "__main__":
    main()
