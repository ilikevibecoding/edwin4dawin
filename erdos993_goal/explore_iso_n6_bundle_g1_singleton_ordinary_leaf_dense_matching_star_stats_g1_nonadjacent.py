#!/usr/bin/env python3
"""Exact arbitrary-size matching/star stress test for the dense-core route.

All distinguished vertices are isolated in the core.  This is exploratory:
the point is to test the two extremal degree profiles before choosing a
universal forest-statistic inequality.
"""

from __future__ import annotations

import hashlib

import sympy as sp

from census_iso_n6_bundle_g1_ordinary_leaf_recursive_g2_residual_small_g1_nonadjacent import (
    symbolic_rows,
)
from explore_iso_n6_bundle_g1_singleton_ordinary_leaf_motif_ie_cutoff_g1_nonadjacent import (
    build_mode,
)


def matching_row(edges, isolates, rank):
    return sp.expand(sum(
        2 ** chosen_edges * sp.binomial(edges, chosen_edges)
        * sp.binomial(isolates, rank - chosen_edges)
        for chosen_edges in range(rank + 1)
    ))


def star_row(edges, isolates, rank):
    # I(K_1,edges;x)=(1+x)^edges+x.
    return sp.binomial(edges + isolates, rank) + sp.binomial(isolates, rank - 1)


def row_rules(rows, family, edges, isolates):
    formula = matching_row if family == "matching" else star_row
    rules = {}
    for row, deleted_marks in zip(rows, (0, 1, 1, 2)):
        rules.update({
            variable: sp.expand_func(formula(
                edges, isolates - deleted_marks, rank
            ))
            for rank, variable in enumerate(row)
        })
    return rules


def main():
    n = sp.Symbol("n", integer=True, positive=True)
    t = sp.Symbol("t", integer=True, nonnegative=True)
    m = sp.Symbol("m", integer=True, nonnegative=True)
    h = sp.Symbol("h", integer=True, nonnegative=True)
    g = sp.Symbol("g", integer=True, nonnegative=True)
    rrows, srows, xrows, yrows = (symbolic_rows(prefix) for prefix in "RSXY")
    values = {}

    for family in ("matching", "star"):
        for mode in ("collision", "distinct"):
            expression = build_mode(mode, n, t)
            mark_count = 3 if mode == "collision" else 4
            rules = row_rules(rrows, family, m, h + mark_count)
            rules |= row_rules(srows, family, m, h + mark_count - 1)
            if mode == "distinct":
                rules |= row_rules(xrows, family, m, h + mark_count - 1)
                rules |= row_rules(yrows, family, m, h + mark_count - 2)
            order = (2 * m if family == "matching" else m + 1) + h + mark_count
            value = sp.expand_func(expression.xreplace(rules).subs(n, order))
            value = sp.expand(value)
            values[(family, mode)] = value
            shifted = sp.expand(value.subs(m, g + 5))
            polynomial = sp.Poly(shifted, g, h, t)
            coefficients = polynomial.coeffs()
            negative = [coefficient for coefficient in coefficients if coefficient < 0]
            print(
                "FAMILY", family,
                "MODE", mode,
                "TERMS", len(polynomial.terms()),
                "NEGATIVE", len(negative),
                "MINIMUM", min(coefficients),
                "SHA256", hashlib.sha256(sp.srepr(shifted).encode()).hexdigest().upper(),
            )
            if negative:
                print("FIRST_NEGATIVE", next(
                    (powers, coefficient)
                    for powers, coefficient in polynomial.terms()
                    if coefficient < 0
                ))
    for mode in ("collision", "distinct"):
        same_order_star = sp.expand(values[("star", mode)].subs(h, h + m - 1))
        difference = sp.expand(same_order_star - values[("matching", mode)])
        shifted = sp.expand(difference.subs(m, g + 5))
        polynomial = sp.Poly(shifted, g, h, t)
        negative = [coefficient for coefficient in polynomial.coeffs() if coefficient < 0]
        print(
            "SAME_ORDER_STAR_MINUS_MATCHING",
            "MODE", mode,
            "TERMS", len(polynomial.terms()),
            "NEGATIVE", len(negative),
            "MINIMUM", min(polynomial.coeffs()),
            "SHA256", hashlib.sha256(sp.srepr(shifted).encode()).hexdigest().upper(),
        )
    print("EXPLORATORY_ONLY_NO_UNIVERSAL_DENSE_CORE_CLAIM")


if __name__ == "__main__":
    main()
