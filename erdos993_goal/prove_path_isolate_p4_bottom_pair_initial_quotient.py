#!/usr/bin/env python3
"""Prove initial bottom-pair quotient coefficients and recurrences.

For

  F=z(1+z)^(2m+x-1) P,

the coefficient of z^k in P is obtained from the first k+2
support values of the bottom-pair lift.  This script derives those
values by fixed-support symbolic sums, then certifies positivity of
P_k and its unnormalized m- and x-coordinate recurrences.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
from pathlib import Path

import sympy as sp

from prove_path_isolate_p4_general_layer_lift_boundary import (
    normalized_group,
    simplify_exact,
)


def boundary_group(
    c_value: sp.Expr,
    m_value: sp.Expr,
    parity: int,
) -> sp.Expr:
    if parity == 1:
        return sp.Integer(0)
    return simplify_exact(
        8
        * c_value
        * (2 * m_value + 1)
        * (
            c_value * m_value
            + m_value**2
            + 3 * m_value
            + 3
        )
        / (
            (m_value + 1)
            * (m_value + 2)
            * (m_value + 3)
        )
    )


def group_at(
    c_value: sp.Expr,
    m_value: sp.Expr,
    x_value: sp.Expr,
    parity: int,
    distance: int,
) -> sp.Expr:
    if distance <= -2:
        return sp.Integer(0)
    if distance == -1:
        return boundary_group(c_value, m_value, parity)
    return normalized_group(
        c_value, m_value, x_value, parity, distance
    )


def pair_normalized(
    m_value: sp.Expr,
    x_value: sp.Expr,
    parity: int,
    distance: int,
) -> sp.Expr:
    if parity == 0:
        return simplify_exact(
            group_at(
                sp.Integer(0),
                m_value,
                x_value,
                0,
                distance,
            )
            + m_value
            * group_at(
                sp.Integer(1),
                m_value - 1,
                x_value,
                1,
                distance,
            )
        )
    return simplify_exact(
        group_at(
            sp.Integer(0),
            m_value,
            x_value,
            1,
            distance,
        )
        + (m_value + 1)
        * group_at(
            sp.Integer(1),
            m_value,
            x_value,
            0,
            distance - 1,
        )
    )


def certificate(
    expression: sp.Expr,
    M: sp.Symbol,
    x_value: sp.Symbol,
) -> dict:
    expression = simplify_exact(expression)
    numerator, denominator = map(
        sp.factor, sp.fraction(expression)
    )
    numerator_poly = sp.Poly(sp.expand(numerator), M, x_value)
    denominator_poly = sp.Poly(
        sp.expand(denominator), M, x_value
    )
    numerator_terms = numerator_poly.terms()
    negative_numerator = [
        (monomial, coefficient)
        for monomial, coefficient in numerator_terms
        if coefficient < 0
    ]
    negative_denominator = [
        (monomial, coefficient)
        for monomial, coefficient in denominator_poly.terms()
        if coefficient < 0
    ]
    canonical = "\n".join(
        f"{monomial}:{coefficient}"
        for monomial, coefficient in numerator_terms
    )
    return {
        "expression": str(expression),
        "denominator": str(denominator),
        "degree_M_x": list(numerator_poly.degree_list()),
        "numerator_term_count": len(numerator_terms),
        "negative_numerator_coefficient_count": len(
            negative_numerator
        ),
        "negative_denominator_coefficient_count": len(
            negative_denominator
        ),
        "smallest_numerator_coefficient": min(
            int(coefficient)
            for _, coefficient in numerator_terms
        ),
        "first_negative_numerator_terms": [
            {
                "monomial_M_x": list(monomial),
                "coefficient": str(coefficient),
            }
            for monomial, coefficient in negative_numerator[:30]
        ],
        "numerator_sha256": hashlib.sha256(
            canonical.encode("utf-8")
        ).hexdigest(),
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--max-order", type=int, default=0)
    args = parser.parse_args()
    if args.max_order < 0:
        raise ValueError("max-order must be nonnegative")

    m_value, M, x_value = sp.symbols(
        "m M x", integer=True, nonnegative=True
    )
    records = []
    total_failures = 0
    for parity in (0, 1):
        central_ratio = (
            2 * (2 * m_value + 1) / (m_value + 1)
            if parity == 0
            else 2 * (2 * m_value + 3) / (m_value + 2)
        )
        print(
            f"deriving support samples epsilon={parity}",
            flush=True,
        )
        lift_samples = [sp.Integer(0)]
        for distance in range(args.max_order + 1):
            pair = pair_normalized(
                m_value, x_value, parity, distance
            )
            lifted = simplify_exact(
                central_ratio
                * pair.subs(m_value, m_value + 1)
                - pair
            )
            lift_samples.append(lifted)

        differences = list(lift_samples)
        newton_coefficients = []
        while differences:
            newton_coefficients.append(differences[0])
            differences = [
                simplify_exact(
                    differences[index + 1]
                    - differences[index]
                )
                for index in range(len(differences) - 1)
            ]

        E = 2 * m_value + x_value - 1
        quotient_coefficients = []
        for quotient_order in range(
            1, args.max_order + 2
        ):
            coefficient = sp.Integer(0)
            for index in range(quotient_order + 1):
                coefficient += (
                    (-1) ** (quotient_order - index)
                    * sp.binomial(
                        E + quotient_order,
                        quotient_order - index,
                    )
                    * newton_coefficients[index]
                )
            quotient_coefficients.append(
                simplify_exact(coefficient)
            )

        for order, normalized_coefficient in enumerate(
            quotient_coefficients
        ):
            shifted = normalized_coefficient.subs(
                m_value, M + 3
            )
            m_recurrence = simplify_exact(
                (
                    central_ratio
                    * normalized_coefficient.subs(
                        m_value, m_value + 1
                    )
                    - normalized_coefficient
                ).subs(m_value, M + 3)
            )
            x_recurrence = simplify_exact(
                (
                    normalized_coefficient.subs(
                        x_value, x_value + 1
                    )
                    - normalized_coefficient
                ).subs(m_value, M + 3)
            )
            item = {
                "parity_epsilon": parity,
                "quotient_order": order,
                "coefficient": certificate(
                    shifted, M, x_value
                ),
                "m_recurrence": certificate(
                    m_recurrence, M, x_value
                ),
                "x_recurrence": certificate(
                    x_recurrence, M, x_value
                ),
            }
            for key in (
                "coefficient",
                "m_recurrence",
                "x_recurrence",
            ):
                total_failures += (
                    item[key][
                        "negative_numerator_coefficient_count"
                    ]
                    + item[key][
                        "negative_denominator_coefficient_count"
                    ]
                )
            records.append(item)

    report = {
        "status": (
            "PASS_PATH_ISOLATE_P4_BOTTOM_PAIR_INITIAL_QUOTIENT"
            if total_failures == 0
            else "FAIL_PATH_ISOLATE_P4_BOTTOM_PAIR_INITIAL_QUOTIENT"
        ),
        "domain": "m>=3, x>=0, epsilon in {0,1}",
        "factorization": "F=z(1+z)^(2m+x-1)P",
        "proved_quotient_orders": list(
            range(args.max_order + 1)
        ),
        "negative_coefficient_count": total_failures,
        "records": records,
    }
    Path(
        "path_isolate_p4_bottom_pair_initial_quotient_"
        f"order0_to_{args.max_order}_20260730.json"
    ).write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(report, indent=2))
    if total_failures:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
