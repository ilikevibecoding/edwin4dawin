#!/usr/bin/env python3
"""Test whether adding the first core edge is coefficientwise monotone."""

from __future__ import annotations

import sympy as sp

from census_iso_n6_bundle_g1_ordinary_leaf_recursive_g2_residual_small_g1_nonadjacent import (
    build_expressions,
    symbolic_rows,
)
from derive_iso_n4_bundle_polynomial_root import isolate_multiply
from prove_iso_n6_bundle_g1_singleton_ordinary_leaf_edgeless_core_g1_nonadjacent import (
    edgeless_rules,
)
from prove_iso_n6_bundle_g1_singleton_ordinary_leaf_one_edge_core_g1_nonadjacent import (
    one_edge_rules,
    replace_rows,
    structural,
)


def main():
    n = sp.Symbol("n", integer=True, positive=True)
    t = sp.Symbol("t", integer=True, nonnegative=True)
    h = sp.Symbol("h", nonnegative=True)
    components = build_expressions()
    complete = sp.expand(sum(components[label] for label in (
        "g2", "F", "QHL", "QHJ", "QKJ", "T"
    )))
    rrows, srows, xrows, yrows = (symbolic_rows(prefix) for prefix in "RSXY")
    base = {
        "collision": replace_rows(
            complete,
            H=isolate_multiply(rrows, t, 7), K=srows,
            J=isolate_multiply(srows, t, 7), L=srows,
        ).subs(structural(rrows, n) | structural(srows, n - 1)),
        "distinct": replace_rows(
            complete,
            H=isolate_multiply(rrows, t, 7), K=srows,
            J=isolate_multiply(xrows, t, 7), L=yrows,
        ).subs(
            structural(rrows, n) | structural(srows, n - 1)
            | structural(xrows, n - 1) | structural(yrows, n - 2)
        ),
    }
    cases = {
        "collision": {
            "p_u": (("p", "u"), 3), "p_a": (("p", "a"), 4),
            "u_a": (("u", "a"), 4), "a_b": (("a", "b"), 5),
        },
        "distinct": {
            "p_u": (("p", "u"), 4), "q_u": (("q", "u"), 4),
            "p_q": (("p", "q"), 4), "u_a": (("u", "a"), 5),
            "p_a": (("p", "a"), 5), "q_a": (("q", "a"), 5),
            "a_b": (("a", "b"), 6),
        },
    }
    for mode, orbit_cases in cases.items():
        edgeless = edgeless_rules(rrows, n) | edgeless_rules(srows, n - 1)
        if mode == "distinct":
            edgeless |= edgeless_rules(xrows, n - 1) | edgeless_rules(yrows, n - 2)
        zero_edge = sp.expand(base[mode].xreplace(edgeless))
        for label, (edge, first) in orbit_cases.items():
            rules = one_edge_rules(rrows, n, set(), edge)
            rules |= one_edge_rules(
                srows, n - 1, {"p" if mode == "collision" else "q"}, edge
            )
            if mode == "distinct":
                rules |= one_edge_rules(xrows, n - 1, {"p"}, edge)
                rules |= one_edge_rules(yrows, n - 2, {"p", "q"}, edge)
            one_edge = sp.expand(base[mode].xreplace(rules))
            difference = sp.Poly(
                sp.expand((one_edge - zero_edge).subs(n, first + h)), h, t
            )
            negative = [
                (powers, value) for powers, value in difference.terms() if value < 0
            ]
            print(mode, label, {
                "terms": len(difference.terms()),
                "negative": len(negative),
                "minimum": str(min(difference.coeffs(), default=0)),
                "negative_terms": negative,
            })
    print("EXPLORATORY_ONLY_NO_MONOTONICITY_CLAIM")


if __name__ == "__main__":
    main()
