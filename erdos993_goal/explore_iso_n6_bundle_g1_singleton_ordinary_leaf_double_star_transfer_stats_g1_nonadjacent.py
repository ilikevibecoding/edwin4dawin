#!/usr/bin/env python3
"""Exact degree-concentration probe on double-star cores (marks isolated)."""

from __future__ import annotations

import hashlib

import sympy as sp

from census_iso_n6_bundle_g1_ordinary_leaf_recursive_g2_residual_small_g1_nonadjacent import (
    symbolic_rows,
)
from explore_iso_n6_bundle_g1_singleton_ordinary_leaf_motif_ie_cutoff_g1_nonadjacent import (
    build_mode,
)


def double_star_row(left, right, isolates, rank):
    # Central edge, left/right pendant leaves, and isolates.
    return (
        sp.binomial(left + right + isolates, rank)
        + sp.binomial(right + isolates, rank - 1)
        + sp.binomial(left + isolates, rank - 1)
    )


def row_rules(rows, left, right, isolates):
    rules = {}
    for row, deleted_marks in zip(rows, (0, 1, 1, 2)):
        rules.update({
            variable: sp.expand_func(double_star_row(
                left, right, isolates - deleted_marks, rank
            ))
            for rank, variable in enumerate(row)
        })
    return rules


def mode_value(mode, left, right, isolates, n, t):
    rrows, srows, xrows, yrows = (symbolic_rows(prefix) for prefix in "RSXY")
    mark_count = 3 if mode == "collision" else 4
    expression = build_mode(mode, n, t)
    rules = row_rules(rrows, left, right, isolates + mark_count)
    rules |= row_rules(srows, left, right, isolates + mark_count - 1)
    if mode == "distinct":
        rules |= row_rules(xrows, left, right, isolates + mark_count - 1)
        rules |= row_rules(yrows, left, right, isolates + mark_count - 2)
    order = left + right + 2 + isolates + mark_count
    return sp.expand(sp.expand_func(expression.xreplace(rules).subs(n, order)))


def main():
    n = sp.Symbol("n", integer=True, positive=True)
    t = sp.Symbol("t", integer=True, nonnegative=True)
    c = sp.Symbol("c", integer=True, nonnegative=True)
    d = sp.Symbol("d", integer=True, nonnegative=True)
    h = sp.Symbol("h", integer=True, nonnegative=True)
    k = sp.Symbol("k", integer=True, nonnegative=True)
    # right=c+1>=1, left=right+d. Move one right leaf to the left.
    right = c + 1
    left = c + 1 + d
    for mode in ("collision", "distinct"):
        before = mode_value(mode, left, right, h, n, t)
        after = mode_value(mode, left + 1, right - 1, h, n, t)
        general = sp.Poly(before, c, d, h, t)
        general_coefficients = general.coeffs()
        print(
            "GENERAL_DOUBLE_STAR",
            "MODE", mode,
            "TERMS", len(general.terms()),
            "NEGATIVE", sum(1 for value in general_coefficients if value < 0),
            "MINIMUM", min(general_coefficients),
            "SHA256", hashlib.sha256(sp.srepr(before).encode()).hexdigest().upper(),
        )
        difference = sp.expand(after - before)
        polynomial = sp.Poly(difference, c, d, h, t)
        coefficients = polynomial.coeffs()
        negative = [value for value in coefficients if value < 0]
        positive = [value for value in coefficients if value > 0]
        print(
            "MODE", mode,
            "TRANSFER", "(a,b)->(a+1,b-1), a>=b>=1",
            "TERMS", len(polynomial.terms()),
            "POSITIVE", len(positive),
            "NEGATIVE", len(negative),
            "MINIMUM", min(coefficients),
            "MAXIMUM", max(coefficients),
            "SHA256", hashlib.sha256(sp.srepr(difference).encode()).hexdigest().upper(),
        )
        if positive:
            print("FIRST_POSITIVE", next(
                item for item in polynomial.terms() if item[1] > 0
            ))
        scale = sp.ilcm(*(sp.denom(value) for value in coefficients))
        scaled = sp.Poly(sp.expand(scale * difference), c, d, h, t)
        evaluate = sp.lambdify((c, d, h, t), scaled.as_expr(), "math")
        minimum = None
        maximum = None
        first_positive = None
        for c_value in range(13):
            for d_value in range(13):
                for h_value in range(13):
                    order = 2 * c_value + d_value + 4 + h_value + (3 if mode == "collision" else 4)
                    for t_value in range((11 * order - 1) // 10 + 1):
                        value = int(evaluate(c_value, d_value, h_value, t_value))
                        record = (value, c_value, d_value, h_value, t_value, order)
                        minimum = record if minimum is None or record < minimum else minimum
                        maximum = record if maximum is None or record > maximum else maximum
                        if value > 0 and first_positive is None:
                            first_positive = record
        print(
            "LOW_SIBLING_GRID_SCALE", scale,
            "MINIMUM", minimum,
            "MAXIMUM", maximum,
            "FIRST_POSITIVE", first_positive,
        )
        # Along repeated concentration, (c,d)->(c-1,d+2).  A
        # nonpositive second transfer difference makes the whole sequence
        # concave, so its minimum lies at the balanced or star endpoint.
        next_difference = difference.xreplace({c: k, d: d + 2})
        current_difference = difference.xreplace({c: k + 1})
        curvature = sp.expand(next_difference - current_difference)
        curvature_poly = sp.Poly(curvature, k, d, h, t)
        curvature_coefficients = curvature_poly.coeffs()
        print(
            "TRANSFER_CURVATURE",
            "TERMS", len(curvature_poly.terms()),
            "POSITIVE", sum(1 for value in curvature_coefficients if value > 0),
            "NEGATIVE", sum(1 for value in curvature_coefficients if value < 0),
            "MINIMUM", min(curvature_coefficients),
            "MAXIMUM", max(curvature_coefficients),
            "SHA256", hashlib.sha256(sp.srepr(curvature).encode()).hexdigest().upper(),
        )
        curvature_scale = sp.ilcm(*(
            sp.denom(value) for value in curvature_coefficients
        ))
        curvature_eval = sp.lambdify(
            (k, d, h, t), curvature_scale * curvature, "math"
        )
        curvature_minimum = None
        curvature_maximum = None
        for k_value in range(13):
            for d_value in range(13):
                for h_value in range(13):
                    order = 2 * k_value + d_value + 6 + h_value + (3 if mode == "collision" else 4)
                    for t_value in range((11 * order - 1) // 10 + 1):
                        value = int(curvature_eval(
                            k_value, d_value, h_value, t_value
                        ))
                        record = (value, k_value, d_value, h_value, t_value, order)
                        curvature_minimum = (
                            record if curvature_minimum is None or record < curvature_minimum
                            else curvature_minimum
                        )
                        curvature_maximum = (
                            record if curvature_maximum is None or record > curvature_maximum
                            else curvature_maximum
                        )
        print(
            "TRANSFER_CURVATURE_LOW_SIBLING_GRID_SCALE", curvature_scale,
            "MINIMUM", curvature_minimum,
            "MAXIMUM", curvature_maximum,
        )
        for parity, balanced in (
            ("odd_edges", before.xreplace({c: k + 1, d: sp.Integer(0)})),
            ("even_edges", before.xreplace({c: k + 1, d: sp.Integer(1)})),
        ):
            balanced = sp.expand(balanced)
            balanced_poly = sp.Poly(balanced, k, h, t)
            balanced_coefficients = balanced_poly.coeffs()
            print(
                "BALANCED_ENDPOINT", parity,
                "TERMS", len(balanced_poly.terms()),
                "NEGATIVE", sum(1 for value in balanced_coefficients if value < 0),
                "MINIMUM", min(balanced_coefficients),
                "SHA256", hashlib.sha256(sp.srepr(balanced).encode()).hexdigest().upper(),
            )
    print("EXPLORATORY_ONLY_NO_DEGREE_MAJORISATION_CLAIM")


if __name__ == "__main__":
    main()
