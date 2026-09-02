#!/usr/bin/env python3
"""Derive the cross-orientation Q+D coupling at fixed low ranks.

For four-minor rows U,V,W, vertex deletion at the two marks gives

    U = W + x X,   V = W + x Y.

The coupling exposed by the direct-rank bypass is

    C_k = Q_k(U+xW) + D_k(V,W).

This script expands both C_k and the residual after paying Q_k with the
proved three-halves reserve.  It is algebra/diagnostic unless the residual
expansion is coefficientwise nonnegative.
"""

from __future__ import annotations

import json

import sympy as sp


def derive(rank: int) -> dict[str, object]:
    w = sp.symbols(f"w0:{rank + 2}", nonnegative=True)
    x = sp.symbols(f"x0:{rank + 1}", nonnegative=True)
    y = sp.symbols(f"y0:{rank + 1}", nonnegative=True)

    def at(row: tuple[sp.Expr, ...], index: int) -> sp.Expr:
        return row[index] if 0 <= index < len(row) else sp.Integer(0)

    # Every independence polynomial has constant coefficient one.
    W = tuple(sp.Integer(1) if i == 0 else w[i] for i in range(rank + 2))
    X = tuple(sp.Integer(1) if i == 0 else x[i] for i in range(rank + 1))
    Y = tuple(sp.Integer(1) if i == 0 else y[i] for i in range(rank + 1))
    U = tuple(at(W, i) + at(X, i - 1) for i in range(rank + 2))
    V = tuple(at(W, i) + at(Y, i - 1) for i in range(rank + 2))
    P = tuple(at(U, i) + at(W, i - 1) for i in range(rank + 2))

    q = (
        rank * P[rank] ** 2
        + P[rank - 1] ** 2
        - (rank + 1) * P[rank - 1] * P[rank + 1]
    )
    d = (
        W[rank - 1] ** 2
        + 2 * rank * V[rank] * W[rank - 1]
        + 2 * V[rank - 1] * W[rank - 2]
        - (rank + 1) * V[rank - 1] * W[rank]
        - (rank + 1) * W[rank - 2] * V[rank + 1]
        - W[rank - 2] * W[rank]
    )
    coupling = sp.expand(q + d)

    # S_k=2k p_k^2-p_(k-1)p_k-2(k+1)p_(k-1)p_(k+1).
    reserve = (
        2 * rank * P[rank] ** 2
        - P[rank - 1] * P[rank]
        - 2 * (rank + 1) * P[rank - 1] * P[rank + 1]
    )
    payment_twice = sp.expand(2 * coupling - reserve)
    expected = sp.expand(2 * P[rank - 1] ** 2 + P[rank - 1] * P[rank] + 2 * d)
    assert payment_twice == expected

    polynomial = sp.Poly(payment_twice, *(w[1:] + x[1:] + y[1:]))
    terms = polynomial.terms()
    negatives = [(monomial, int(coefficient)) for monomial, coefficient in terms if coefficient < 0]
    return {
        "rank": rank,
        "identity": (
            "2C_k=S_k(P)+[2P_(k-1)^2+P_(k-1)P_k+2D_k(V,W)]"
        ),
        "payment_term_count": len(terms),
        "payment_negative_count": len(negatives),
        "payment_minimum_coefficient": min(int(coefficient) for _, coefficient in terms),
        "negative_terms": negatives,
        "payment_twice": str(payment_twice),
    }


def main() -> None:
    report = {
        "marker": "DERIVED_EXACT_ISO_CROSS_ORIENTATION_COUPLING_LOW_RANK",
        "substitution": "U=W+xX, V=W+xY, P=U+xW",
        "coupling": "C_k=Q_k(P)+D_k(V,W)",
        "ranks": [derive(4), derive(5)],
        "scope": (
            "Exact operator derivation.  Coefficientwise failure, if present, "
            "requires forest inequalities or a counterexample search."
        ),
    }
    print(json.dumps(report, indent=2, sort_keys=True))
    print(report["marker"])


if __name__ == "__main__":
    main()
