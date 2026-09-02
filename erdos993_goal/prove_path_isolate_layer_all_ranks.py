#!/usr/bin/env python3
"""Prove one isolate-binomial layer on the stable path range.

For

    T_q(P_(L+1) + t K1) = sum_j c_(q,j)(L) binom(t,j),

this derives a requested fixed layer j symbolically in q and L.  It
then sets L=2q-4+x and q=4+r, extracts the standard positive
factorial ratio, and certifies coefficientwise positivity of the
remaining polynomial in r,x.  Fixed-rank formulas are replayed when
available.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

import sympy as sp

from prove_path_isolate_terminal_fixed_ranks import terminal_gap


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--layer", type=int, required=True)
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    layer = args.layer
    if layer < 0:
        raise ValueError("layer must be nonnegative")
    output = args.output or Path(
        f"path_isolate_layer_{layer}_all_ranks_20260730.json"
    )

    q, length, x, r = sp.symbols(
        "q L x r", integer=True, nonnegative=True
    )
    print(f"deriving values t=0..{layer}", flush=True)
    values = [
        terminal_gap(q, length, isolates, direct=False)
        for isolates in range(layer + 1)
    ]
    coefficient = sp.factor(
        sp.combsimp(
            sp.expand(
                sum(
                    (-1) ** (layer - index)
                    * sp.binomial(layer, index)
                    * values[index]
                    for index in range(layer + 1)
                )
            )
        )
    )
    print("shifting stable path range", flush=True)
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
            * sp.factorial(x + 2 * layer)
            * sp.factorial(x + 2 * layer + 2)
        )
    )
    remainder = sp.factor(sp.cancel(shifted / positive_factor))
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
    print("checking coefficient signs", flush=True)
    numerator_polynomial = sp.Poly(sp.expand(numerator), r, x)
    denominator_polynomial = sp.Poly(
        sp.expand(denominator), r, x
    )
    numerator_terms = numerator_polynomial.terms()
    denominator_terms = denominator_polynomial.terms()
    negative = [
        (monomial, value)
        for monomial, value in numerator_terms
        if value < 0
    ]
    denominator_negative = [
        (monomial, value)
        for monomial, value in denominator_terms
        if value < 0
    ]

    specialization_checks = []
    fixed_path = Path(
        "path_isolate_terminal_fixed_rank_theorem_20260730.json"
    )
    if fixed_path.exists():
        fixed_certificate = json.loads(
            fixed_path.read_text(encoding="utf-8")
        )
        for rank_certificate in fixed_certificate["certificates"]:
            stable = rank_certificate["stable_coefficients"]
            if layer >= len(stable):
                continue
            rank_q = int(rank_certificate["rank_q"])
            stored = sp.sympify(
                stable[layer]["coefficient_in_L"]
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
        f"{monomial}:{value}"
        for monomial, value in numerator_terms
    )
    passed = not negative and not denominator_negative
    report = {
        "status": (
            f"PASS_PATH_ISOLATE_LAYER_{layer}_ALL_RANKS"
            if passed
            else f"FAIL_PATH_ISOLATE_LAYER_{layer}_ALL_RANKS"
        ),
        "isolate_binomial_layer": layer,
        "theorem_if_pass": (
            f"c_(q,{layer})(L)>=0 for q>=4 and L>=2q-4"
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
        "numerator_nonzero_monomial_count": len(
            numerator_terms
        ),
        "negative_numerator_coefficient_count": len(negative),
        "negative_numerator_coefficients": [
            {
                "monomial": list(monomial),
                "coefficient": str(value),
            }
            for monomial, value in negative[:30]
        ],
        "negative_denominator_coefficient_count": len(
            denominator_negative
        ),
        "negative_denominator_coefficients": [
            {
                "monomial": list(monomial),
                "coefficient": str(value),
            }
            for monomial, value in denominator_negative[:30]
        ],
        "smallest_numerator_coefficient": (
            min(int(value) for _, value in numerator_terms)
            if numerator_terms
            else None
        ),
        "canonical_numerator_sha256": hashlib.sha256(
            canonical.encode("utf-8")
        ).hexdigest(),
        "fixed_rank_specializations_replayed": (
            specialization_checks
        ),
    }
    output.write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
