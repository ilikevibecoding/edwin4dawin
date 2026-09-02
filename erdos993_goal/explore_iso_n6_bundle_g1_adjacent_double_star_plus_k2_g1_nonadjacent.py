#!/usr/bin/env python3
"""Exact case probe: adjacent marked double-star plus one disjoint K2."""

from __future__ import annotations

import os

import sympy as sp

from explore_iso_n6_bundle_g2_marked_cone_g1_bernstein import reconstruct
from prove_iso_n6_bundle_g1_adjacent_double_star_actual_d_g1_nonadjacent import (
    certify,
    marked_rows,
)


def multiply_linear(rows, amount):
    return tuple(tuple(
        sp.expand(row[rank] + amount * row[rank - 1]) if rank else row[rank]
        for rank in range(8)
    ) for row in rows)


def build(expression, keep_u: int, keep_v: int, retained_edge_vertices: int):
    names = {str(symbol): symbol for symbol in expression.free_symbols}
    t, a, b, rx, ry, rz = sp.symbols("t a b rx ry rz", nonnegative=True)
    core_unmarked = t + 4
    x_count = core_unmarked * a
    y_count = core_unmarked * (1 - a) * b
    z_count = core_unmarked * (1 - a) * (1 - b)
    crows = multiply_linear(marked_rows(core_unmarked, x_count, y_count, 1, 1), 2)
    retained_x = x_count * rx
    retained_y = y_count * ry
    retained_z = z_count * rz
    drows = multiply_linear(marked_rows(
        retained_x + retained_y + retained_z,
        retained_x,
        retained_y,
        keep_u,
        keep_v,
    ), retained_edge_vertices)
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
    keep_u = int(os.environ.get("KEEP_U", "0"))
    keep_v = int(os.environ.get("KEEP_V", "0"))
    edge_q = int(os.environ.get("EDGE_Q", "0"))
    assert keep_u in (0, 1) and keep_v in (0, 1) and edge_q in (0, 1, 2)
    value, tail, variables = build(reconstruct(1), keep_u, keep_v, edge_q)
    result = certify(value, tail, variables)
    print("CASE", keep_u, keep_v, edge_q)
    print(result)
    print("PASS_EXACT_CASE_ISO_N6_BUNDLE_G1_ADJACENT_DOUBLE_STAR_PLUS_K2_G1_NONADJACENT")


if __name__ == "__main__":
    main()
