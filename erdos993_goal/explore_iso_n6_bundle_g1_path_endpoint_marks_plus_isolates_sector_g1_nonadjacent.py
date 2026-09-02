#!/usr/bin/env python3
"""Exact large-parameter sector probe for endpoint-marked paths plus isolates."""

from __future__ import annotations

import hashlib

import sympy as sp

from explore_iso_n6_bundle_g1_marked_cone_g1_nonadjacent import doubly_partitioned_g1


def main():
    _, expression, _, _ = doubly_partitioned_g1()
    names = {str(x): x for x in expression.free_symbols}
    for family in "WABZ":
        for rank in range(2, 8):
            names.setdefault(f"C{family}{rank}", sp.Symbol(f"C{family}{rank}", nonnegative=True))
    dvars = tuple(sorted((x for x in expression.free_symbols if str(x).startswith("D")), key=str))
    base = sp.expand(expression.subs({x: 0 for x in dvars}))
    always_negative = {"DA6", "DB6", "DW5", "DW6", "DZ6"}
    always_positive = {"DA4", "DB4", "DZ5"}
    mixed = tuple(sorted(set(map(str, dvars)) - always_negative - always_positive))

    length, isolates, t, s = sp.symbols("length isolates t s", integer=True, nonnegative=True)

    def path_value(family, rank):
        lower = {"W": rank, "A": rank - 1, "B": rank - 1, "Z": rank - 2}[family]
        return sp.binomial(length - rank - 1, lower)

    rows = {}
    for family in "WABZ":
        for rank in range(2, 8):
            rows[names[f"C{family}{rank}"]] = sum(
                sp.binomial(isolates, shift) * path_value(family, rank - shift)
                for shift in range(rank + 1)
            )

    failures = []
    coefficient_count = 0
    minimum = None
    stream = hashlib.sha256()
    for mask in range(1 << len(mixed)):
        current = base
        selected = always_negative | {
            name for bit, name in enumerate(mixed) if mask & (1 << bit)
        }
        for dvar in dvars:
            if str(dvar) in selected:
                current += sp.diff(expression, dvar) * names["C" + str(dvar)[1:]]
        value = sp.expand_func(current.subs(rows)).subs({length: t + 15, isolates: s + 7})
        polynomial = sp.Poly(sp.expand(value), t, s)
        coefficients = polynomial.coeffs()
        bad = [coefficient for coefficient in coefficients if coefficient < 0]
        if bad:
            failures.append((mask, len(bad), min(bad)))
        coefficient_count += len(coefficients)
        local = min(coefficients)
        minimum = local if minimum is None else min(minimum, local)
        stream.update(sp.srepr(polynomial.as_expr()).encode())
    print("SECTORS", 1 << len(mixed), "COEFFICIENTS", coefficient_count, "MIN", minimum)
    print("FAILURES", len(failures), "FIRST", failures[:4])
    print("STREAM", stream.hexdigest().upper())
    print("PROBE_EXACT_ISO_N6_BUNDLE_G1_PATH_ENDPOINT_MARKS_PLUS_ISOLATES_SECTOR_G1_NONADJACENT")


if __name__ == "__main__":
    main()
