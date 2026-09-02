#!/usr/bin/env python3
"""Probe/prove the third isolate binomial layer at all ranks."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from prove_path_isolate_terminal_fixed_ranks import terminal_gap


def main() -> None:
    q, length, x, r = sp.symbols(
        "q L x r", integer=True, nonnegative=True
    )
    values = [
        terminal_gap(q, length, isolates, direct=False)
        for isolates in range(4)
    ]
    coefficient = sp.factor(
        sp.combsimp(
            sp.expand(
                values[3]
                - 3 * values[2]
                + 3 * values[1]
                - values[0]
            )
        )
    )
    shifted = sp.factor(
        sp.combsimp(coefficient.subs(length, 2 * q - 4 + x))
    )
    positive_factor = (
        2
        * sp.factorial(q + x - 4)
        * sp.factorial(q + x - 2)
        / (
            sp.factorial(q)
            * sp.factorial(q - 2)
            * sp.factorial(x + 6)
            * sp.factorial(x + 8)
        )
    )
    remainder = sp.factor(sp.cancel(shifted / positive_factor))
    # The third layer leaves longer factorial quotients than the first
    # two.  Shift the rank before taking the rational numerator and
    # denominator, then make consecutive-factorial cancellations
    # explicit.  This prevents factorial(r+k) from being mistaken for a
    # polynomial generator by Poly.
    shifted_remainder = sp.factor(
        sp.cancel(
            sp.combsimp(
                sp.gammasimp(remainder.subs(q, r + 4))
            )
        )
    )
    shifted_remainder = sp.factor(
        sp.cancel(sp.expand_func(shifted_remainder))
    )
    numerator, denominator = map(
        sp.factor, sp.fraction(shifted_remainder)
    )
    numerator_polynomial = sp.Poly(
        sp.expand(numerator), r, x
    )
    denominator_polynomial = sp.Poly(
        sp.expand(denominator), r, x
    )
    terms = numerator_polynomial.terms()
    negative = [
        (monomial, value)
        for monomial, value in terms
        if value < 0
    ]
    denominator_negative = [
        (monomial, value)
        for monomial, value in denominator_polynomial.terms()
        if value < 0
    ]
    fixed_certificate = json.loads(
        Path(
            "path_isolate_terminal_fixed_rank_theorem_20260730.json"
        ).read_text(encoding="utf-8")
    )
    specialization_checks = []
    for rank_certificate in fixed_certificate["certificates"]:
        rank_q = int(rank_certificate["rank_q"])
        stored = sp.sympify(
            rank_certificate["stable_coefficients"][3][
                "coefficient_in_L"
            ]
        )
        stored = stored.subs(
            {
                symbol: length
                for symbol in stored.free_symbols
                if symbol.name == "L"
            }
        )
        specialized = sp.factor(
            sp.combsimp(coefficient.subs(q, rank_q))
        )
        assert sp.simplify(specialized - stored) == 0
        specialization_checks.append(rank_q)

    canonical = "\n".join(
        f"{monomial}:{value}" for monomial, value in terms
    )
    report = {
        "status": (
            "PASS_PATH_ISOLATE_THIRD_LAYER_ALL_RANKS"
            if not negative and not denominator_negative
            else "FAIL_PATH_ISOLATE_THIRD_LAYER_ALL_RANKS"
        ),
        "theorem_if_pass": (
            "c_(q,3)(L)>=0 for q>=4 and L>=2q-4"
        ),
        "positive_factor": str(positive_factor),
        "remainder_in_q_x": str(remainder),
        "rank_shift": "q=4+r",
        "remainder_numerator_in_r_x": str(numerator),
        "remainder_denominator_in_r_x": str(denominator),
        "numerator_degree_r_x": list(
            numerator_polynomial.degree_list()
        ),
        "denominator_degree_r_x": list(
            denominator_polynomial.degree_list()
        ),
        "nonzero_monomial_count": len(terms),
        "negative_coefficient_count": len(negative),
        "negative_coefficients": [
            {"monomial": list(monomial), "coefficient": str(value)}
            for monomial, value in negative[:30]
        ],
        "denominator_negative_coefficient_count": len(
            denominator_negative
        ),
        "denominator_negative_coefficients": [
            {"monomial": list(monomial), "coefficient": str(value)}
            for monomial, value in denominator_negative[:30]
        ],
        "smallest_coefficient": (
            min(int(value) for _, value in terms)
            if terms
            else None
        ),
        "canonical_coefficient_sha256": hashlib.sha256(
            canonical.encode("utf-8")
        ).hexdigest(),
        "fixed_rank_specializations_replayed": specialization_checks,
    }
    Path(
        "path_isolate_third_layer_all_ranks_20260730.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
