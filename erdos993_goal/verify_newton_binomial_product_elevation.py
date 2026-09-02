#!/usr/bin/env python3
"""Verify the Newton binomial-product elevation lemma.

For N[f](z)=sum_k Delta^k f(0) z^k, prove coefficientwise that

  N[binom(n+1,r+1) binom(n+1,s+1)]
    >= (1+z)(1+2z) N[binom(n,r) binom(n,s)].

The proof reduces every interior coefficient to an explicitly
positive polynomial in a=r-k, b=s-k, and k.  Two terminal
coefficients are checked separately.
"""

from __future__ import annotations

import hashlib
import json
import math
from pathlib import Path

import sympy as sp


def coefficient(r: int, s: int, j: int) -> int:
    if j < 0 or j > min(r, s):
        return 0
    return math.factorial(r + s - j) // (
        math.factorial(j)
        * math.factorial(r - j)
        * math.factorial(s - j)
    )


def main() -> None:
    a, b, k = sp.symbols(
        "a b k", integer=True, nonnegative=True
    )
    r = a + k
    s = b + k
    d = r + s - k
    old = sp.factorial(d) / (
        sp.factorial(k)
        * sp.factorial(r - k)
        * sp.factorial(s - k)
    )
    elevated = (
        sp.factorial(d + 2)
        / (
            sp.factorial(k)
            * sp.factorial(r + 1 - k)
            * sp.factorial(s + 1 - k)
        )
        + sp.factorial(d + 2)
        / (
            sp.factorial(k - 1)
            * sp.factorial(r + 2 - k)
            * sp.factorial(s + 1 - k)
        )
        + sp.factorial(d + 2)
        / (
            sp.factorial(k - 1)
            * sp.factorial(r + 1 - k)
            * sp.factorial(s + 2 - k)
        )
    )
    previous = sp.factorial(d + 1) / (
        sp.factorial(k - 1)
        * sp.factorial(r + 1 - k)
        * sp.factorial(s + 1 - k)
    )
    ratio = sp.factor(
        sp.combsimp((elevated - 2 * old - 3 * previous) / old)
    )
    numerator, denominator = map(
        sp.factor, sp.fraction(ratio)
    )
    numerator_poly = sp.Poly(
        sp.expand(numerator), a, b, k
    )
    denominator_poly = sp.Poly(
        sp.expand(denominator), a, b, k
    )
    negative_numerator = [
        (monomial, value)
        for monomial, value in numerator_poly.terms()
        if value < 0
    ]
    negative_denominator = [
        (monomial, value)
        for monomial, value in denominator_poly.terms()
        if value < 0
    ]

    # If r<=s, write s=r+b.  The two remaining coefficients
    # correspond to k=r+1 and k=r+2.
    r0, gap = sp.symbols(
        "r gap", integer=True, nonnegative=True
    )
    terminal1_ratio = sp.factor(
        (
            gap**2 * r0
            + 2 * gap**2
            + gap * r0**2
            + 2 * gap * r0
            + 2 * gap
            + 2 * r0**2
            + 2 * r0
        )
        / ((gap + 1) * (r0 + 1))
    )
    terminal2 = sp.factor(
        sp.factorial(gap + r0)
        / (
            sp.factorial(gap - 1)
            * sp.factorial(r0 + 1)
        )
    )

    exhaustive_failures = []
    exhaustive_checks = 0
    for r_value in range(13):
        for s_value in range(13):
            maximum_k = min(r_value, s_value) + 2
            for k_value in range(maximum_k + 1):
                degree = r_value + s_value + 2 - k_value
                residual = (
                    coefficient(
                        r_value + 1, s_value + 1, k_value
                    )
                    + coefficient(
                        r_value + 1, s_value, k_value - 1
                    )
                    + coefficient(
                        r_value, s_value + 1, k_value - 1
                    )
                    - 2
                    * coefficient(
                        r_value, s_value, k_value
                    )
                    - 3
                    * coefficient(
                        r_value, s_value, k_value - 1
                    )
                )
                exhaustive_checks += 1
                if residual < 0:
                    exhaustive_failures.append(
                        {
                            "r": r_value,
                            "s": s_value,
                            "coefficient_degree": degree,
                            "residual": residual,
                        }
                    )

    canonical = "\n".join(
        f"{monomial}:{value}"
        for monomial, value in numerator_poly.terms()
    )
    passed = (
        not negative_numerator
        and not negative_denominator
        and not exhaustive_failures
    )
    report = {
        "status": (
            "PASS_NEWTON_BINOMIAL_PRODUCT_ELEVATION"
            if passed
            else "FAIL_NEWTON_BINOMIAL_PRODUCT_ELEVATION"
        ),
        "transform": (
            "N[f](z)=sum_k Delta^k f(0) z^k"
        ),
        "theorem": (
            "N[C(n+1,r+1)C(n+1,s+1)] >= "
            "(1+z)(1+2z)N[C(n,r)C(n,s)] "
            "coefficientwise"
        ),
        "interior_ratio_denominator": str(denominator),
        "interior_positive_numerator": str(numerator),
        "interior_numerator_term_count": len(
            numerator_poly.terms()
        ),
        "interior_negative_numerator_count": len(
            negative_numerator
        ),
        "interior_negative_denominator_count": len(
            negative_denominator
        ),
        "interior_numerator_sha256": hashlib.sha256(
            canonical.encode("utf-8")
        ).hexdigest(),
        "terminal_r_le_s": {
            "k_equals_r_plus_1_ratio_over_old_terminal": str(
                terminal1_ratio
            ),
            "k_equals_r_plus_2_coefficient": str(terminal2),
            "interpretation": (
                "The second expression is used only for gap>=1; "
                "it is zero when gap=0."
            ),
        },
        "symmetry": "The case s<=r follows by exchanging r and s.",
        "exhaustive_audit": {
            "domain": "0<=r,s<=12",
            "coefficient_checks": exhaustive_checks,
            "failure_count": len(exhaustive_failures),
            "first_failures": exhaustive_failures[:20],
        },
    }
    Path(
        "newton_binomial_product_elevation_20260730.json"
    ).write_text(
        json.dumps(report, indent=2) + "\n",
        encoding="utf-8",
    )
    print(json.dumps(report, indent=2))
    if not passed:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
