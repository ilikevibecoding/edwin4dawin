#!/usr/bin/env python3
"""Exact diagnostic marked-partition algebra for rank-six bundle g1."""

from __future__ import annotations

import sympy as sp

from explore_iso_n6_bundle_g2_marked_cone_g1_bernstein import reconstruct
from explore_iso_n6_bundle_g3_marked_partition_g1_nonadjacent import partition_substitution


def partitioned_g1():
    generic = reconstruct(1)
    rows = {
        family: {
            rank: sp.symbols(f"{family}{rank}", nonnegative=True)
            for rank in range(2, 8)
        }
        for family in "WABZ"
    }
    rules = {}
    for rank in range(2, 8):
        w, a, b, z = (rows[family][rank] for family in "WABZ")
        rules.update({
            sp.Symbol(f"cW{rank}"): w,
            sp.Symbol(f"cU{rank}"): w + a,
            sp.Symbol(f"cV{rank}"): w + b,
            sp.Symbol(f"cE{rank}"): w + a + b + z,
        })
    structural = {
        sp.Symbol(f"{prefix}{family}0"): 1
        for prefix in ("c", "d") for family in "EUVW"
    }
    expression = sp.expand(generic.subs(structural).subs(rules))
    return generic, expression, rows


def doubly_partitioned_g1():
    generic = reconstruct(1)
    structural = {
        sp.Symbol(f"{prefix}{family}0"): 1
        for prefix in ("c", "d") for family in "EUVW"
    }
    cpart, crows = partition_substitution("C", "c", 7)
    dpart, drows = partition_substitution("D", "d", 6)
    expression = sp.expand(generic.subs(structural).subs(cpart).subs(dpart))
    return generic, expression, crows, drows


def main():
    generic, expression, rows = partitioned_g1()
    symbols = sorted(expression.free_symbols, key=str)
    polynomial = sp.Poly(expression, *symbols)
    dvars = [
        symbol for symbol in symbols
        if str(symbol).startswith("d") and str(symbol)[1] in "EUVW"
    ]
    print("GENERIC_TERMS", len(sp.Poly(generic, *sorted(generic.free_symbols, key=str)).terms()))
    print("PARTITION_TERMS", len(polynomial.terms()))
    print("NEGATIVE_SCALARS", sum(
        coefficient.is_negative is True for coefficient in polynomial.coeffs()
    ))
    print("D_VARIABLES", list(map(str, dvars)))
    for symbol in dvars:
        print("D_COEFFICIENT", symbol, sp.factor(sp.diff(expression, symbol)))
    cpart = sp.expand(expression.subs({symbol: 0 for symbol in dvars}))
    print("C_PART_TERMS", len(sp.Poly(cpart, *sorted(cpart.free_symbols, key=str)).terms()))
    for family in "WABZ":
        for rank in range(7, 2, -1):
            variable = rows[family][rank]
            if variable in cpart.free_symbols:
                print("C_DERIVATIVE", variable, sp.factor(sp.diff(cpart, variable)))

    _, double, _, drows = doubly_partitioned_g1()
    print("DOUBLE_PARTITION_TERMS", len(sp.Poly(
        double, *sorted(double.free_symbols, key=str)
    ).terms()))
    for family_index, family in enumerate("WABZ"):
        for rank in range(2, 7):
            variable = drows[rank][family_index]
            if variable in double.free_symbols:
                print("D_CATEGORY_DERIVATIVE", variable, sp.factor(sp.diff(double, variable)))


if __name__ == "__main__":
    main()
