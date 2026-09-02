#!/usr/bin/env python3
"""Exact obstruction to the direct distinguished-pair stable parent.

At the first actual endpoint N=6,d=5, let P_ij(X,Y) be the polynomial
obtained after fixing the two distinguished deletion slots and averaging the
remaining three deletions.  The tempting parent is

    F(u;X,Y) = sum_{i<j} P_ij(X,Y) u_i u_j.

At X=Y=1 its coefficient matrix is invariant under swapping the two stars.
This script proves that it has a positive direction in both the symmetric and
antisymmetric subspaces, hence at least two positive eigenvalues.  A stable
homogeneous multiaffine quadratic has at most one, so this parent is not real
stable.
"""

from __future__ import annotations

import json
from pathlib import Path

import sympy as sp


OUT = Path("distinguished_pair_parent_exact_obstruction_20260803.json")
X, r = sp.symbols("X r")


def diagonal_convolution(polynomial: sp.Expr, order: int) -> sp.Expr:
    return sp.expand(
        sum(
            sp.binomial(order, k)
            * sp.diff(polynomial, X, k).subs(X, 1)
            * sp.diff(polynomial, X, order - k).subs(X, 1)
            for k in range(order + 1)
        )
    )


def main() -> None:
    N = 6
    d = 5
    L = 2 * N - 3

    # Monic aligned seed a=g+h.  Its two zero roots have already been shown.
    a = X**2 * (X**4 + 54 * X**3 + 810 * X**2 + 3600 * X + 3240)
    g = sp.expand((X * sp.diff(a, X) + (N - 3) * a) / L)
    h = sp.expand(a - g)
    assert sp.Poly(g, X).LC() == 1

    # A nonzero root of a is -r.  Work modulo its exact equation Q(r)=0.
    root_polynomial = sp.Poly(
        r**4 - 54 * r**3 + 810 * r**2 - 3600 * r + 3240, r
    )
    quotient, remainder = sp.div(
        sp.Poly(a, X, domain=sp.QQ.frac_field(r)),
        sp.Poly(X + r, X, domain=sp.QQ.frac_field(r)),
    )
    assert sp.factor(remainder.as_expr()) == r**2 * root_polynomial.as_expr()
    a_deleted = quotient.as_expr()
    g_deleted = sp.expand(
        (X * sp.diff(a_deleted, X) + (N - 2) * a_deleted) / L
    )

    # Cross-star distinguished pair using the same leaf on both sides.  Its
    # center-edge square is (r/L)^2/2.
    cross = sp.cancel(
        diagonal_convolution(g_deleted, d - 2)
        - r**2 / (2 * L**2) * diagonal_convolution(a_deleted, d - 2)
    )
    numerator, denominator = sp.together(cross).as_numer_denom()
    reduced_numerator = sp.factor(
        sp.rem(sp.Poly(numerator, r), root_polynomial).as_expr()
    )
    expected = -8 * (
        357476 * r**3
        - 19502549 * r**2
        + 298932318 * r
        - 1252793142
    )
    assert sp.expand(reduced_numerator - expected) == 0
    assert denominator == 27

    cubic = sp.Poly(-expected / 8, r)
    # Q has one root r_* in (14,15).  The cubic has no root there and is
    # positive at 14, so cross(r_*)<0 exactly.
    root_count = root_polynomial.count_roots(14, 15)
    cubic_root_count = cubic.count_roots(14, 15)
    cubic_at_14 = cubic.eval(14)
    assert root_count == 1
    assert cubic_root_count == 0
    assert cubic_at_14 > 0

    # The all-ones symmetric direction is a positive multiple of the complete
    # endpoint polynomial.  Its value can be checked without algebraic roots.
    endpoint_value = sp.factor(
        diagonal_convolution(g, d) - diagonal_convolution(h, d - 2)
    )
    assert endpoint_value == 19609447680 > 0

    report = {
        "kind": "distinguished_pair_parent_exact_obstruction",
        "status": "PASS_EXACT_OBSTRUCTION",
        "endpoint": {"N": N, "d": d, "X": 1, "Y": 1},
        "nonzero_root_equation": str(root_polynomial.as_expr()),
        "certified_root_interval": [14, 15],
        "root_count_in_interval": int(root_count),
        "cross_prefix_mod_root_equation": str(reduced_numerator / denominator),
        "cross_prefix_sign": "strictly negative at the root in (14,15)",
        "complete_endpoint_value_at_1_1": int(endpoint_value),
        "conclusion": (
            "The quadratic coefficient form has a positive antisymmetric "
            "direction e_i^X-e_i^Y because the same-leaf cross coefficient "
            "is negative, and a positive symmetric all-ones direction because "
            "the complete endpoint value is positive.  Block-swap invariance "
            "makes these invariant orthogonal subspaces, so the form has at "
            "least two positive eigenvalues and cannot be a stable homogeneous "
            "quadratic."
        ),
    }
    OUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
