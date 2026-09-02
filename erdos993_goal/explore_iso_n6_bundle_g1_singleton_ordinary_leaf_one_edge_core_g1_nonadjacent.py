#!/usr/bin/env python3
"""Exact diagnostic for one-edge post-support cores in the G1 leaf delta."""

from __future__ import annotations

import hashlib

import sympy as sp

from census_iso_n6_bundle_g1_ordinary_leaf_recursive_g2_residual_small_g1_nonadjacent import (
    build_expressions, symbolic_rows,
)
from derive_iso_n4_bundle_polynomial_root import isolate_multiply
from prove_iso_n6_bundle_g1_singleton_ordinary_leaf_edgeless_core_g1_nonadjacent import (
    choose, replace_rows, structural,
)


def row_rules(rows, order, prefix_removed, edge):
    rules = {}
    for row, marks_removed in zip(rows, (set(), {"u"}, {"v"}, {"u", "v"})):
        survives = not (set(edge) & (set(prefix_removed) | marks_removed))
        removed = len(marks_removed)
        for rank in range(2, 8):
            rules[row[rank]] = sp.expand(
                choose(order - removed, rank)
                - (choose(order - removed - 2, rank - 2) if survives else 0)
            )
    return rules


def digest(value):
    return hashlib.sha256(sp.srepr(sp.expand(value)).encode()).hexdigest().upper()


def main():
    n = sp.Symbol("n", integer=True, positive=True)
    t = sp.Symbol("t", integer=True, nonnegative=True)
    h = sp.Symbol("h", nonnegative=True)
    complete = sp.expand(sum(build_expressions().values()))
    rrows, srows, xrows, yrows = (symbolic_rows(prefix) for prefix in "RSXY")
    collision = replace_rows(
        complete,
        H=isolate_multiply(rrows, t, 7), K=srows,
        J=isolate_multiply(srows, t, 7), L=srows,
    ).subs(structural(rrows, n) | structural(srows, n - 1))
    distinct = replace_rows(
        complete,
        H=isolate_multiply(rrows, t, 7), K=srows,
        J=isolate_multiply(xrows, t, 7), L=yrows,
    ).subs(
        structural(rrows, n) | structural(srows, n - 1)
        | structural(xrows, n - 1) | structural(yrows, n - 2)
    )

    collision_edges = {
        "p_u": (("p", "u"), 3),
        "p_a": (("p", "a"), 4),
        "u_a": (("u", "a"), 4),
        "a_b": (("a", "b"), 5),
    }
    distinct_edges = {
        "p_u": (("p", "u"), 4),
        "q_u": (("q", "u"), 4),
        "p_q": (("p", "q"), 4),
        "u_a": (("u", "a"), 5),
        "p_a": (("p", "a"), 5),
        "q_a": (("q", "a"), 5),
        "a_b": (("a", "b"), 6),
    }
    for mode, expression, cases in (
        ("collision", collision, collision_edges),
        ("distinct", distinct, distinct_edges),
    ):
        for label, (edge, first) in cases.items():
            rules = row_rules(rrows, n, set(), edge)
            rules |= row_rules(srows, n - 1, {"p" if mode == "collision" else "q"}, edge)
            if mode == "distinct":
                rules |= row_rules(xrows, n - 1, {"p"}, edge)
                rules |= row_rules(yrows, n - 2, {"p", "q"}, edge)
            value = sp.factor(sp.expand(expression.subs(rules)))
            shifted = sp.Poly(sp.expand(value.subs(n, first + h)), h, t)
            coefficients = shifted.coeffs()
            print(mode, label, {
                "first": first,
                "terms": len(shifted.terms()),
                "negative": sum(1 for item in coefficients if item < 0),
                "minimum": str(min(coefficients)),
                "raw_sha256": digest(value),
                "shifted_sha256": digest(value.subs(n, first + h)),
            })
            if any(item < 0 for item in coefficients):
                print("NEGATIVE_TERMS", [
                    (powers, item) for powers, item in shifted.terms() if item < 0
                ])
    print("EXPLORATORY_ONLY_NO_SIGN_CLAIM")


if __name__ == "__main__":
    main()
