#!/usr/bin/env python3
"""Exact actual-induced-D scan on the adjacent marked-star obstruction family."""

from __future__ import annotations

from math import comb

import sympy as sp

from explore_iso_n6_bundle_g2_marked_cone_g1_bernstein import reconstruct


def edgeless(order):
    return tuple(comb(order, rank) if rank <= order else 0 for rank in range(8))


def star(leaves):
    row = list(edgeless(leaves))
    row[0] = 1
    row[1] += 1
    return tuple(row)


def evaluate_function():
    expression = reconstruct(1)
    variables = tuple(sorted(expression.free_symbols, key=str))
    evaluate = sp.lambdify(variables, expression, "math")
    def value(crows, drows):
        data = {}
        for prefix, rows in (("c", crows), ("d", drows)):
            for family, row in zip("EUVW", rows):
                for rank in range(8):
                    data[f"{prefix}{family}{rank}"] = row[rank]
        return int(evaluate(*(data[str(variable)] for variable in variables)))
    return value


def main():
    evaluate = evaluate_function()
    minimum = None
    negative = None
    cells = 0
    for order in range(2, 1001):
        m = order - 2
        crows = (star(order - 1), edgeless(order - 1), star(m), edgeless(m))
        for retained in range(m + 1):
            for keep_u in (0, 1):
                for keep_v in (0, 1):
                    if keep_u:
                        drows = (
                            star(retained + keep_v),
                            edgeless(retained + keep_v),
                            star(retained),
                            edgeless(retained),
                        )
                    else:
                        drows = (
                            edgeless(retained + keep_v),
                            edgeless(retained + keep_v),
                            edgeless(retained),
                            edgeless(retained),
                        )
                    value = evaluate(crows, drows)
                    record = (value, order, retained, keep_u, keep_v)
                    minimum = record if minimum is None or record < minimum else minimum
                    cells += 1
                    if value < 0:
                        negative = record
                        break
                if negative:
                    break
            if negative:
                break
        if negative:
            break
    print("CELLS", cells, "MINIMUM", minimum, "FIRST_NEGATIVE", negative)
    print("PROBE_EXACT_ISO_N6_BUNDLE_G1_ADJACENT_STAR_ACTUAL_D_G1_NONADJACENT")


if __name__ == "__main__":
    main()
