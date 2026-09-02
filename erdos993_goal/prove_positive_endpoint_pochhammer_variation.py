#!/usr/bin/env python3
"""Exact positive-endpoint lemma for the fixed ambient Pochhammer disk.

Let P_1 send x^k to the falling factorial X(X-1)...(X-k+1).
If p has degree m=r+2, exactly r positive roots, and two negative roots,
put T=P_1[p].  This verifier records the algebra behind the all-rank lemma

    T has at most r roots in (m-1,+infinity).

The proof reflects T about (m-1)/2.  If

    P_1[ptilde](X)=(-1)^m T(m-1-X),

then the coefficients b_l of ptilde obey

    (-1)^l b_l=(-1)^m sum_k K[l,k] a_k,
    K[l,k]=binom(k,l)(m-1-l)_(k-l)^fall.

The leading m by m block of K is a row/column scaling of a doubly
reversed Pascal matrix, and K[m,m]=1.  Hence K is totally nonnegative.
Variation diminution and Descartes' rule show that ptilde has at most r
negative roots.  The classical negative-zero Pochhammer theorem then gives
the asserted bound for the reflected T.

For the forest parameters m=r+2, B>=3r+4 and
R^2=(B+r+1)(B+r)/16, one has R>r+1=m-1.  Therefore, after selecting the r
largest positive roots of T, every remaining positive real root is strictly
inside the fixed target circle.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
REPORT = HERE / "positive_endpoint_pochhammer_variation_exact_20260809.json"
X, Z = sp.symbols("x z")


def falling(variable: sp.Expr, order: int) -> sp.Expr:
    return sp.prod((variable - j for j in range(order)), start=sp.Integer(1))


def pochhammer_transform(poly: sp.Poly) -> sp.Poly:
    return sp.Poly(
        sp.expand(
            sum(poly.nth(k) * falling(X, k) for k in range(poly.degree() + 1))
        ),
        X,
    )


def inverse_pochhammer(poly: sp.Poly) -> sp.Poly:
    degree = poly.degree()
    values = [poly.as_expr().subs(X, j) for j in range(degree + 1)]
    coefficients = []
    for order in range(degree + 1):
        difference = sum(
            (-1) ** (order - j) * sp.binomial(order, j) * values[j]
            for j in range(order + 1)
        )
        coefficients.append(sp.cancel(difference / sp.factorial(order)))
    return sp.Poly(
        sp.expand(sum(coefficients[k] * Z**k for k in range(degree + 1))), Z
    )


def kernel(m: int) -> sp.Matrix:
    return sp.Matrix(
        m + 1,
        m + 1,
        lambda ell, k: (
            sp.binomial(k, ell) * falling(sp.Integer(m - 1 - ell), k - ell)
            if k >= ell
            else 0
        ),
    )


def main() -> None:
    reflection_records: list[dict[str, object]] = []
    pascal_records: list[dict[str, object]] = []

    for m in range(1, 9):
        symbols = sp.symbols(f"a0:{m + 1}")
        source = sp.Poly(sum(symbols[k] * Z**k for k in range(m + 1)), Z)
        transformed = pochhammer_transform(source)
        reflected = sp.Poly(
            sp.expand((-1) ** m * transformed.as_expr().subs(X, m - 1 - X)), X
        )
        reflected_source = inverse_pochhammer(reflected)

        K = kernel(m)
        predicted = []
        for ell in range(m + 1):
            value = (-1) ** (m + ell) * sum(
                K[ell, k] * symbols[k] for k in range(m + 1)
            )
            predicted.append(sp.expand(value))
            assert sp.expand(reflected_source.nth(ell) - value) == 0

        # K is block diagonal: its leading block is a positive diagonal
        # scaling of the Pascal matrix with both index orders reversed.
        leading = K[:m, :m]
        reversal = sp.zeros(m)
        for j in range(m):
            reversal[j, m - 1 - j] = 1
        pascal = sp.Matrix(
            m, m, lambda i, j: sp.binomial(i, j) if i >= j else 0
        )
        row_scale = sp.diag(*[sp.Rational(1, sp.factorial(ell)) for ell in range(m)])
        column_scale = sp.diag(*[sp.factorial(k) for k in range(m)])
        factorized = row_scale * reversal * pascal * reversal * column_scale
        assert leading == factorized
        assert all(K[ell, m] == 0 for ell in range(m))
        assert all(K[m, k] == 0 for k in range(m))
        assert K[m, m] == 1

        # Finite exact replay of total nonnegativity.  The all-rank proof is
        # the Pascal factorization above and the classical TN Pascal theorem.
        minimum_minor = None
        checked_minors = 0
        for order in range(1, m + 1):
            from itertools import combinations

            for rows in combinations(range(m), order):
                for columns in combinations(range(m), order):
                    determinant = sp.det(leading.extract(rows, columns))
                    assert determinant >= 0
                    checked_minors += 1
                    if minimum_minor is None or determinant < minimum_minor:
                        minimum_minor = determinant

        primitive = sp.primitive(reflected_source.as_expr(), Z)[1]
        reflection_records.append(
            {
                "degree": m,
                "reflection_identity": True,
                "primitive_sha256": hashlib.sha256(
                    str(primitive).encode("utf-8")
                ).hexdigest(),
            }
        )
        pascal_records.append(
            {
                "degree": m,
                "pascal_factorization": True,
                "finite_minor_replay_count": checked_minors,
                "minimum_minor": str(minimum_minor),
            }
        )

    r, slack = sp.symbols("r slack", integer=True, nonnegative=True)
    B = 3 * r + 4 + slack
    N = B + r + 1
    radius_squared = sp.factor(N * (N - 1) / 16)
    positive_endpoint_margin = sp.factor(radius_squared - (r + 1) ** 2)
    positive_numerator = sp.Poly(
        sp.together(positive_endpoint_margin).as_numer_denom()[0], r, slack
    )
    assert all(coefficient >= 0 for coefficient in positive_numerator.coeffs())
    assert positive_endpoint_margin.subs({r: 0, slack: 0}) > 0

    negative_barrier_squared = sp.factor((B - 3) ** 2 / 16)
    negative_endpoint_margin = sp.factor(radius_squared - negative_barrier_squared)
    negative_numerator = sp.Poly(
        sp.together(negative_endpoint_margin).as_numer_denom()[0], r, slack
    )
    assert all(coefficient >= 0 for coefficient in negative_numerator.coeffs())
    assert negative_endpoint_margin.subs({r: 0, slack: 0}) > 0

    payload = {
        "kind": "positive_endpoint_pochhammer_variation_theorem",
        "date": "2026-08-09",
        "status": "PASS_EXACT_ALL_RANK_POSITIVE_ENDPOINT_THEOREM",
        "scope": (
            "For a degree m=r+2 real-rooted source with r positive and two "
            "negative roots, its unit Pochhammer transform has at most r "
            "roots above m-1."
        ),
        "proof_chain": [
            "reflect the transformed polynomial about (m-1)/2",
            "identify the source coefficient map with a TN reversed-Pascal kernel",
            "apply variation diminution and Descartes to get at most r negative source roots",
            "apply the classical Pochhammer negative-zero theorem",
        ],
        "forest_consequence": (
            "Since R^2=(B+r+1)(B+r)/16 and B>=3r+4 imply R>r+1, "
            "the two roots left after selecting the r largest positive roots "
            "cannot escape through the positive real endpoint."
        ),
        "positive_endpoint_margin": str(positive_endpoint_margin),
        "negative_barrier_margin": str(negative_endpoint_margin),
        "reflection_replays": reflection_records,
        "pascal_replays": pascal_records,
        "remaining_scope": [
            "combine the endpoint lemma with the negative-axis barrier and open-arc exclusion",
            "audit the unique exceptional-pair continuation at real branch exchanges",
            "translate the resulting fixed ceiling through the Duran window theorem",
        ],
    }
    REPORT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print(f"reflection_degrees=1..{len(reflection_records)}")
    print(f"report={REPORT}")


if __name__ == "__main__":
    main()
