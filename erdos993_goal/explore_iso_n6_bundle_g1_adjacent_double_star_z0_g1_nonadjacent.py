#!/usr/bin/env python3
"""Exact tensor probe for adjacent double-stars with no common isolates."""

from __future__ import annotations

import sympy as sp

from explore_iso_n6_bundle_g1_adjacent_double_star_actual_d_g1_nonadjacent import marked_rows
from explore_iso_n6_bundle_g1_edgeless_w_sector_g1_nonadjacent import bernstein_rows
from explore_iso_n6_bundle_g2_marked_cone_g1_bernstein import reconstruct


def main():
    expression = reconstruct(1)
    names = {str(x): x for x in expression.free_symbols}
    t, a, rx, ry = sp.symbols("t a rx ry", nonnegative=True)
    n, m = t + 8, t + 6
    x_count, y_count = m*a, m*(1-a)
    crows = marked_rows(m, x_count, y_count, 1, 1)
    for keep_u in (0, 1):
        for keep_v in (0, 1):
            retained_x, retained_y = x_count*rx, y_count*ry
            total = retained_x + retained_y
            drows = marked_rows(total, retained_x, retained_y, keep_u, keep_v)
            substitutions = {}
            for prefix, rows in (("c", crows), ("d", drows)):
                for family, row in zip("EUVW", rows):
                    for rank in range(8):
                        name = f"{prefix}{family}{rank}"
                        if name in names:
                            substitutions[names[name]] = row[rank]
            value = sp.expand_func(expression.subs(substitutions))
            degrees, rows = bernstein_rows(value, (a, rx, ry))
            bad = []
            minimum = None
            scalar = 0
            for index, row in rows.items():
                powers = sp.Poly(sp.expand(row), t).all_coeffs()
                scalar += len(powers)
                local = min(powers)
                minimum = local if minimum is None else min(minimum, local)
                if any(item < 0 for item in powers):
                    bad.append((index, sp.factor(row), powers))
            print("CASE", keep_u, keep_v, "DEGREES", degrees, "ROWS", len(rows), "SCALARS", scalar, "MIN", minimum, "BAD", len(bad))
            print("FIRST_BAD", bad[:1])


if __name__ == "__main__":
    main()
