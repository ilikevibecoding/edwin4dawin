#!/usr/bin/env python3
"""Prove the stable path-P4 group h=j-1 for every input layer."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from derive_path_isolate_p4_symbolic_kernel import (
    distinguished_kernel,
)


def main() -> None:
    k, s, x = sp.symbols(
        "k s x", integer=True, nonnegative=True
    )
    j = k + 4
    q = k + s + 5
    length = 2 * q - 4 + x

    # For h=j-1, the binomial group is
    # j*(Q(j-1,j)+Q(j,j-1)).  Simplifying the two orientations
    # separately avoids a large intermediate-expression blow-up.
    print("simplifying first orientation", flush=True)
    first = sp.factor(
        sp.combsimp(
            sp.expand(
                distinguished_kernel(
                    q, length, j - 1, j
                )
            )
        )
    )
    print("simplifying second orientation", flush=True)
    second = sp.factor(
        sp.combsimp(
            sp.expand(
                distinguished_kernel(
                    q, length, j, j - 1
                )
            )
        )
    )
    group = sp.factor(sp.cancel(j * (first + second)))

    positive_p4_factor = (
        2
        * sp.factorial(q + x - 4)
        * sp.factorial(q + x - 2)
        / (
            sp.factorial(q)
            * sp.factorial(q - 2)
            * sp.factorial(x + 2 * j + 2)
            * sp.factorial(x + 2 * j + 4)
        )
    )
    remainder = sp.factor(
        sp.cancel(
            sp.expand_func(
                sp.combsimp(
                    sp.gammasimp(
                        group / positive_p4_factor
                    )
                )
            )
        )
    )
    numerator, denominator = map(
        sp.factor, sp.fraction(remainder)
    )
    positive_factorials = []
    polynomial_part = sp.Integer(1)
    for factor in sp.Mul.make_args(numerator):
        if factor.func == sp.factorial or (
            factor.is_Pow
            and factor.base.func == sp.factorial
            and factor.exp.is_integer
            and factor.exp > 0
        ):
            positive_factorials.append(factor)
        else:
            polynomial_part *= factor

    expected_denominator = (
        sp.factorial(s)
        * sp.factorial(s + 4)
        * sp.factorial(k + s + x + 1)
        * sp.factorial(k + s + x + 3)
    )
    assert sp.simplify(
        denominator / expected_denominator
    ) == 1
    polynomial = sp.Poly(
        sp.expand(polynomial_part), k, s, x
    )
    terms = polynomial.terms()
    negative = [
        (monomial, coefficient)
        for monomial, coefficient in terms
        if coefficient < 0
    ]
    assert not negative
    canonical = "\n".join(
        f"{monomial}:{coefficient}"
        for monomial, coefficient in terms
    )
    report = {
        "status": (
            "PASS_PATH_ISOLATE_P4_NEAR_FULL_INTERSECTION_"
            "ALL_LAYERS"
        ),
        "group": "h=j-1",
        "zero_range": "q<=j",
        "nonzero_domain": (
            "j>=4, q>=j+1, L>=2q-4"
        ),
        "substitution": (
            "j=4+k, q=j+1+s=5+k+s, L=2q-4+x"
        ),
        "positive_p4_factor": str(positive_p4_factor),
        "additional_positive_factorials": [
            str(value) for value in positive_factorials
        ],
        "positive_denominator": str(denominator),
        "polynomial_variables": ["k", "s", "x"],
        "polynomial_degree": list(polynomial.degree_list()),
        "polynomial_nonzero_monomial_count": len(terms),
        "smallest_polynomial_coefficient": min(
            int(coefficient) for _, coefficient in terms
        ),
        "negative_coefficient_count": len(negative),
        "canonical_polynomial_sha256": hashlib.sha256(
            canonical.encode("utf-8")
        ).hexdigest(),
        "small_layers": (
            "j=1,2 are in the fixed intersection-group "
            "certificate; j=3 is replayed separately."
        ),
    }
    Path(
        "path_isolate_p4_near_full_intersection_all_layers_"
        "20260730.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
