#!/usr/bin/env python3
"""Exact replay for the stable matched-column injection selector.

For two endpoint labels z1,z2 and N column variables c, put

    M_N(z;c) = 1-(z1+z2)e1(c)+2 z1 z2 e2(c).

This is, up to the standard upper-half-plane inversion, the multivariate
matching polynomial of K_(2,N), hence is real stable.  Its degree-two signed
reversal in z is stable as well.  Grace apolarity (equivalently the top
squarefree coefficient theorem) applied to two copies gives

    J_N(c,d) = 1-2 e1(c)e1(d)+4 e2(c)e2(d),

which is therefore real stable.  On c=d=1 its three endpoint grades have
weights 1,-2N^2,N^2(N-1)^2, exactly the zero-, one-, and two-endpoint
without-replacement column factors for the two Wishart copies.

The theorem is all-order; finite symbolic calculations below replay the
matching reversal and apolar coefficient identities.
"""

from __future__ import annotations

import json
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent


def elementary(variables: tuple[sp.Symbol, ...], degree: int) -> sp.Expr:
    if degree == 0:
        return sp.S.One
    return sp.expand(sum(
        sp.prod(variables[index] for index in subset)
        for subset in __import__("itertools").combinations(
            range(len(variables)), degree
        )
    ))


def matching_polynomial(
    z1: sp.Symbol,
    z2: sp.Symbol,
    columns: tuple[sp.Symbol, ...],
) -> sp.Expr:
    product = sp.prod(columns)
    return sp.expand(
        z1 * z2 * product
        - (z1 + z2) * elementary(columns, len(columns) - 1)
        + 2 * elementary(columns, len(columns) - 2)
    )


def injection_polynomial(
    z1: sp.Symbol,
    z2: sp.Symbol,
    columns: tuple[sp.Symbol, ...],
) -> sp.Expr:
    return sp.expand(
        1
        - (z1 + z2) * elementary(columns, 1)
        + 2 * z1 * z2 * elementary(columns, 2)
    )


def squarefree_top_pair(
    left: sp.Expr,
    right: sp.Expr,
    z1: sp.Symbol,
    z2: sp.Symbol,
) -> sp.Expr:
    answer = sp.S.Zero
    left_poly = sp.Poly(left, z1, z2)
    right_poly = sp.Poly(right, z1, z2)
    for left_powers, left_coefficient in left_poly.terms():
        for right_powers, right_coefficient in right_poly.terms():
            if all(a + b == 1 for a, b in zip(left_powers, right_powers)):
                answer += left_coefficient * right_coefficient
    return sp.expand(answer)


def main() -> None:
    z1, z2 = sp.symbols("z1 z2")
    records = []
    for n in range(2, 9):
        c = sp.symbols(f"c0:{n}")
        d = sp.symbols(f"d0:{n}")
        mu = matching_polynomial(z1, z2, c)
        inverted = sp.expand(
            (-1) ** n
            * z1 * z2 * sp.prod(c)
            * mu.subs({
                z1: -1 / z1,
                z2: -1 / z2,
                **{variable: -1 / variable for variable in c},
            })
        )
        left = injection_polynomial(z1, z2, c)
        assert sp.cancel(inverted - left) == 0

        # Signed coefficient reversal B2-B1(z1+z2)+B0 z1z2.
        right = sp.expand(
            2 * elementary(d, 2)
            + elementary(d, 1) * (z1 + z2)
            + z1 * z2
        )
        paired = squarefree_top_pair(left, right, z1, z2)
        expected = sp.expand(
            1
            - 2 * elementary(c, 1) * elementary(d, 1)
            + 4 * elementary(c, 2) * elementary(d, 2)
        )
        assert sp.expand(paired - expected) == 0

        diagonal = sp.expand(expected.subs({
            **{variable: 1 for variable in c},
            **{variable: 1 for variable in d},
        }))
        expected_diagonal = 1 - 2 * n**2 + n**2 * (n - 1) ** 2
        assert diagonal == expected_diagonal
        records.append({
            "N": n,
            "matching_terms": len(sp.Poly(mu, z1, z2, *c).terms()),
            "paired_terms": len(sp.Poly(expected, *c, *d).terms()),
            "diagonal_weights": [1, -2 * n**2, n**2 * (n - 1) ** 2],
        })

    report = {
        "status": "ALL_ORDER_MATCHED_COLUMN_APOLAR_SELECTOR_STABLE",
        "single_copy_selector": "1-(z1+z2)e1(c)+2*z1*z2*e2(c)",
        "matched_two_copy_selector": "1-2*e1(c)*e1(d)+4*e2(c)*e2(d)",
        "proof": (
            "The single-copy polynomial is the upper-half-plane inversion "
            "of the multivariate matching polynomial of K_(2,N). Its signed "
            "endpoint reversal is stable. Grace apolarity/top squarefree "
            "coefficient closure proves stability of the matched selector."
        ),
        "records": records,
        "scope": (
            "This proves the all-order distinct-column matching half of the "
            "Wishart endpoint contraction. Coupling it to the row deletion "
            "and fixed derivative grade remains required."
        ),
    }
    out = HERE / "matched_column_injection_apolar_stability_20260804.json"
    out.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))
    print(out)


if __name__ == "__main__":
    main()
