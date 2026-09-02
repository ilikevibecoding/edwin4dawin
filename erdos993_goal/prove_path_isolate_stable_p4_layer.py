#!/usr/bin/env python3
"""Prove one stable-range coefficient of the path-specific P4 gap.

If

  T_q(P_(L+1)+tK1)=sum_j c_(q,j)(L) binom(t,j),

then the isolated-vertex recurrence has binomial coefficients

  c_(q,j+1)(L)-c_(q-1,j)(L).

This script derives a requested transition j directly from the
binomial-series engine and proves it nonnegative on

  q>=5, L>=2q-4

by a positive factorial factor and coefficientwise positivity after
q=5+r, L=2q-4+x.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

import sympy as sp

from derive_path_isolate_layer_direct import terminal_series


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input-layer", type=int, required=True)
    args = parser.parse_args()
    layer = args.input_layer
    if layer < 0:
        raise ValueError("input layer must be nonnegative")
    output_layer = layer + 1

    q, length, x, r = sp.symbols(
        "q L x r", integer=True, nonnegative=True
    )
    print("deriving adjacent-rank coefficients", flush=True)
    upper = terminal_series(q, length, output_layer)[
        output_layer
    ]
    lower = terminal_series(q - 1, length, layer)[layer]
    shifted = sp.factor(
        sp.combsimp(
            sp.expand(
                (upper - lower).subs(
                    length, 2 * q - 4 + x
                )
            )
        )
    )
    print("normalizing recurrence margin", flush=True)
    positive_factor = (
        2
        * sp.factorial(q + x - 4)
        * sp.factorial(q + x - 2)
        / (
            sp.factorial(q)
            * sp.factorial(q - 2)
            * sp.factorial(x + 2 * output_layer)
            * sp.factorial(x + 2 * output_layer + 2)
        )
    )
    remainder = sp.factor(sp.cancel(shifted / positive_factor))
    rank_shifted = sp.factor(
        sp.cancel(
            sp.expand_func(
                sp.combsimp(
                    sp.gammasimp(remainder.subs(q, r + 5))
                )
            )
        )
    )
    numerator, denominator = map(
        sp.factor, sp.fraction(rank_shifted)
    )
    numerator_poly = sp.Poly(sp.expand(numerator), r, x)
    denominator_poly = sp.Poly(sp.expand(denominator), r, x)
    numerator_terms = numerator_poly.terms()
    denominator_terms = denominator_poly.terms()
    numerator_negative = [
        (monomial, value)
        for monomial, value in numerator_terms
        if value < 0
    ]
    denominator_negative = [
        (monomial, value)
        for monomial, value in denominator_terms
        if value < 0
    ]
    canonical = "\n".join(
        f"{monomial}:{value}"
        for monomial, value in numerator_terms
    )
    passed = not numerator_negative and not denominator_negative
    report = {
        "status": (
            f"PASS_PATH_ISOLATE_STABLE_P4_LAYER_{layer}"
            if passed
            else f"FAIL_PATH_ISOLATE_STABLE_P4_LAYER_{layer}"
        ),
        "input_layer_j": layer,
        "output_layer_j_plus_one": output_layer,
        "quantity": (
            f"c_(q,{output_layer})(L)-c_(q-1,{layer})(L)"
        ),
        "domain": "q>=5, L>=2q-4",
        "stable_shift": "L=2q-4+x",
        "positive_factor": str(positive_factor),
        "remainder_in_q_x": str(remainder),
        "rank_shift": "q=5+r",
        "remainder_numerator_in_r_x": str(numerator),
        "remainder_denominator_in_r_x": str(denominator),
        "numerator_degree_r_x": list(
            numerator_poly.degree_list()
        ),
        "numerator_nonzero_monomial_count": len(
            numerator_terms
        ),
        "negative_numerator_coefficient_count": len(
            numerator_negative
        ),
        "negative_denominator_coefficient_count": len(
            denominator_negative
        ),
        "smallest_numerator_coefficient": min(
            int(value) for _, value in numerator_terms
        ),
        "canonical_numerator_sha256": hashlib.sha256(
            canonical.encode("utf-8")
        ).hexdigest(),
    }
    Path(
        f"path_isolate_stable_p4_layer_{layer}_20260730.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
