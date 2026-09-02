#!/usr/bin/env python3
"""Diagnostic collision recurrence when p misses both protected marks.

For p=q and p nonadjacent to u,v, R=S+xT with T=R-N[p] as a genuine
marked forest.  This script substitutes that exact recurrence into the low
sibling coefficients.  It is exploratory only.
"""

from __future__ import annotations

import hashlib

import sympy as sp

from census_iso_n6_bundle_g1_ordinary_leaf_recursive_g2_residual_small_g1_nonadjacent import (
    build_expressions, symbolic_rows,
)
from derive_iso_n4_bundle_polynomial_root import binomial_basis, isolate_multiply
from explore_iso_n6_bundle_g1_singleton_ordinary_leaf_sibling_isolates_g1_nonadjacent import (
    replace_rows, structural,
)


def main():
    t = sp.Symbol("t", integer=True, nonnegative=True)
    n = sp.Symbol("n", integer=True, positive=True)
    m = sp.Symbol("m", integer=True, nonnegative=True)
    components = build_expressions()
    complete = sp.expand(sum(components.values()))
    rrows, srows, trows = (symbolic_rows(prefix) for prefix in "RST")
    collision = replace_rows(
        complete,
        H=isolate_multiply(rrows, t, 7), K=srows,
        J=isolate_multiply(srows, t, 7), L=srows,
    )
    collision = sp.expand(collision.subs(
        structural(rrows, n) | structural(srows, n - 1)
    ))
    coefficients = binomial_basis(collision, t)
    recurrence = {
        rrow[rank]: srow[rank] + trow[rank - 1]
        for rrow, srow, trow in zip(rrows, srows, trows)
        for rank in range(2, 8)
    }
    t_structural = structural(trows, m)
    for index in range(4):
        value = sp.expand(coefficients[index].subs(recurrence).subs(t_structural))
        variables = tuple(sorted(value.free_symbols, key=str))
        poly = sp.Poly(value, *variables)
        coeffs = poly.coeffs()
        print(index, {
            "terms": len(poly.terms()),
            "variables": len(variables),
            "negative": sum(1 for item in coeffs if item < 0),
            "minimum": str(min(coeffs)),
            "sha256": hashlib.sha256(sp.srepr(value).encode()).hexdigest().upper(),
        })
        if len(poly.terms()) <= 180:
            print("FACTOR", index, sp.factor(value))
    print("EXPLORATORY_ONLY_NO_SIGN_CLAIM")


if __name__ == "__main__":
    main()
