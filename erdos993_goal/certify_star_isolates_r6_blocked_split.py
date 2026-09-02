#!/usr/bin/env python3
"""Coefficient certificate for the rank-6 star-plus-isolates case.

The input expressions are produced by
``derive_star_isolates_r6_blocked_split.py``.  This verifier proves both
half-blocked state margins positive throughout the prefix branch
b_6 >= b_5 for a star K_{1,m} together with t isolated vertices, rooted
at the star center.

The proof is by translating each numerator to a nonnegative orthant.
Every translated polynomial has strictly positive coefficients, while
the denominators are positive on the covered domain.
"""

from __future__ import annotations

import json
from pathlib import Path

import sympy as sp


INPUT = Path(
    "star_isolates_r6_blocked_split_symbolic_20260728.json"
)
OUTPUT = Path(
    "star_isolates_r6_blocked_split_certificate_20260728.json"
)

m, t, x, y = sp.symbols(
    "m t x y", integer=True, nonnegative=True
)


def choose(value, rank):
    if rank < 0:
        return sp.Integer(0)
    product = sp.Integer(1)
    for offset in range(rank):
        product *= value - offset
    return sp.cancel(product / sp.factorial(rank))


def positive_coefficient_record(
    name,
    numerator,
    substitutions,
    variables,
):
    translated = sp.Poly(
        sp.expand(numerator.subs(substitutions)),
        *variables,
    )
    coefficients = translated.coeffs()
    assert coefficients
    assert all(
        coefficient.is_positive
        for coefficient in coefficients
    ), (name, [
        coefficient
        for coefficient in coefficients
        if not coefficient.is_positive
    ])
    return {
        "case": name,
        "term_count": len(coefficients),
        "minimum_coefficient": str(min(coefficients)),
        "degree_list": list(translated.degree_list()),
    }


def main():
    payload = json.loads(INPUT.read_text(encoding="utf-8"))
    expressions = {
        name: sp.sympify(
            payload[name], locals={"m": m, "t": t}
        )
        for name in (
            "selected_plus_half_blocked",
            "open_plus_half_blocked",
            "selected_nmh",
            "open_nmh",
        )
    }

    b5 = choose(m + t, 5) + choose(t, 4)
    b6 = choose(m + t, 6) + choose(t, 5)
    prefix = sp.cancel(b6 - b5)
    recorded_prefix = sp.sympify(
        payload["prefix_condition_b6_minus_b5"],
        locals={"m": m, "t": t},
    )
    assert sp.cancel(prefix - recorded_prefix) == 0
    transparent_prefix = sp.cancel(
        choose(m + t, 5) * (m + t - 11) / 6
        + choose(t, 4) * (t - 9) / 5
    )
    assert sp.cancel(prefix - transparent_prefix) == 0

    records = []
    for margin_name, expression in expressions.items():
        numerator, denominator = sp.fraction(
            sp.cancel(expression)
        )
        expected_denominator = 2 * (120 * b5) ** 3
        if margin_name in (
            "open_plus_half_blocked",
            "open_nmh",
        ):
            expected_denominator *= m + t - 3
        assert sp.cancel(
            denominator / expected_denominator
        ) == 1

        # If t >= 9 and m >= 1, put t=9+y and m=1+x.
        records.append(
            {
                "margin": margin_name,
                **positive_coefficient_record(
                    "t>=9,m>=1",
                    numerator,
                    {t: 9 + y, m: 1 + x},
                    (x, y),
                ),
            }
        )

        # If m=0, the graph is edgeless on t+1 vertices.  Its prefix
        # branch starts at t=10.
        records.append(
            {
                "margin": margin_name,
                **positive_coefficient_record(
                    "m=0,t>=10",
                    numerator,
                    {m: 0, t: 10 + x},
                    (x,),
                ),
            }
        )

        # For t<=3 the prefix identity forces m+t>=11.
        for fixed_t in range(4):
            threshold = 11 - fixed_t
            records.append(
                {
                    "margin": margin_name,
                    **positive_coefficient_record(
                        f"t={fixed_t},m>={threshold}",
                        numerator,
                        {t: fixed_t, m: threshold + x},
                        (x,),
                    ),
                }
            )

        # For 4<=t<=8 it forces m+t>=12: at total 11 the
        # first prefix term is zero and the second is negative.
        for fixed_t in range(4, 9):
            threshold = 12 - fixed_t
            records.append(
                {
                    "margin": margin_name,
                    **positive_coefficient_record(
                        f"t={fixed_t},m>={threshold}",
                        numerator,
                        {t: fixed_t, m: threshold + x},
                        (x,),
                    ),
                }
            )

    certificate = {
        "claim": (
            "At r=6, both half-blocked and both "
            "neighbor-multiplicity-half state margins are "
            "strictly positive for center-rooted "
            "K_{1,m} disjoint union tK_1 whenever b_5>0 "
            "and b_6>=b_5."
        ),
        "prefix_identity": str(sp.factor(transparent_prefix)),
        "denominators": {
            "selected_plus_half_blocked": (
                "2*(120*b5)^3"
            ),
            "open_plus_half_blocked": (
                "2*(m+t-3)*(120*b5)^3"
            ),
            "selected_nmh": "2*(120*b5)^3",
            "open_nmh": (
                "2*(m+t-3)*(120*b5)^3"
            ),
        },
        "orthant_certificates": records,
        "certificate_count": len(records),
        "all_coefficients_strictly_positive": True,
    }
    OUTPUT.write_text(
        json.dumps(certificate, indent=2),
        encoding="utf-8",
    )
    print(
        "PASS:",
        len(records),
        "positive-coefficient certificates",
    )
    print("prefix identity:", sp.factor(transparent_prefix))
    print("wrote", OUTPUT)


if __name__ == "__main__":
    main()
