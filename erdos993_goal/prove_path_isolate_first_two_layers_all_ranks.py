#!/usr/bin/env python3
"""Prove the first two isolate layers of the terminal gap at all ranks.

On the stable path range write

    T_q(P_(L+1)+tK1) = sum_j c_(q,j)(L) binom(t,j).

The bare-path theorem proves j=0.  This script proves j=1 and j=2
simultaneously for every q>=4 and L>=2q-4.  It derives the
coefficients from the exact symbolic phase moments, extracts a
positive factorial factor, and checks that the remaining polynomial
has nonnegative coefficients after

    q=4+r,  L=2q-4+x.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from prove_path_isolate_terminal_fixed_ranks import terminal_gap


def canonical_polynomial(poly: sp.Poly) -> str:
    return "\n".join(
        f"{','.join(map(str, monomial))}:{coefficient}"
        for monomial, coefficient in poly.terms()
    )


def main() -> None:
    q, length, x, r = sp.symbols(
        "q L x r", integer=True, nonnegative=True
    )
    values = [
        terminal_gap(q, length, isolates, direct=False)
        for isolates in range(3)
    ]
    isolate_coefficients = {
        1: sp.factor(
            sp.combsimp(sp.expand(values[1] - values[0]))
        ),
        2: sp.factor(
            sp.combsimp(
                sp.expand(values[2] - 2 * values[1] + values[0])
            )
        ),
    }

    certificates = []
    fixed_certificate = json.loads(
        Path(
            "path_isolate_terminal_fixed_rank_theorem_20260730.json"
        ).read_text(encoding="utf-8")
    )
    for layer, coefficient in isolate_coefficients.items():
        shifted = sp.factor(
            sp.combsimp(
                coefficient.subs(length, 2 * q - 4 + x)
            )
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
        assert sp.denom(remainder) == 1
        shifted_remainder = sp.Poly(
            sp.expand(remainder.subs(q, r + 4)), r, x
        )
        terms = shifted_remainder.terms()
        assert terms
        assert all(value > 0 for _, value in terms)

        specialization_checks = []
        for rank_certificate in fixed_certificate["certificates"]:
            rank_q = int(rank_certificate["rank_q"])
            stored = sp.sympify(
                rank_certificate["stable_coefficients"][layer][
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

        canonical = canonical_polynomial(shifted_remainder)
        certificates.append(
            {
                "isolate_binomial_layer": layer,
                "coefficient_c_qj": str(coefficient),
                "stable_shift": "L=2q-4+x",
                "positive_factor": str(positive_factor),
                "remainder_in_q_x": str(remainder),
                "rank_shift": "q=4+r",
                "remainder_degree_r_x": list(
                    shifted_remainder.degree_list()
                ),
                "nonzero_monomial_count": len(terms),
                "negative_coefficient_count": 0,
                "smallest_coefficient": min(
                    int(value) for _, value in terms
                ),
                "canonical_coefficient_sha256": hashlib.sha256(
                    canonical.encode("utf-8")
                ).hexdigest(),
                "fixed_rank_specializations_replayed": (
                    specialization_checks
                ),
            }
        )

    report = {
        "status": (
            "PASS_PATH_ISOLATE_FIRST_TWO_LAYERS_ALL_RANKS"
        ),
        "theorem": (
            "c_(q,1)(L)>=0 and c_(q,2)(L)>=0 for every q>=4 "
            "and L>=2q-4"
        ),
        "binomial_expansion": (
            "T_q(P_(L+1)+tK1)=sum_j c_(q,j)(L) binom(t,j)"
        ),
        "rank_zero_layer": (
            "j=0 is the all-rank bare-path theorem proved in "
            "derive_bare_path_terminal_phase_gap.py"
        ),
        "certificates": certificates,
        "proof_summary": (
            "After L=2q-4+x and q=4+r, each coefficient is a "
            "strictly positive factorial ratio times a polynomial "
            "whose every nonzero monomial coefficient is positive."
        ),
    }
    Path(
        "path_isolate_first_two_layers_all_ranks_20260730.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
