#!/usr/bin/env python3
"""Certify H(j,0)+H(j,1) on a fixed stable-path layer."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

import sympy as sp

import derive_path_isolate_layer_direct as direct
from stress_path_isolate_p4_cross_polarizations import (
    cross_polarization,
)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--layer", type=int, default=7)
    args = parser.parse_args()
    layer = args.layer
    if layer < 1:
        raise ValueError("layer must be positive")

    q, length, x, r = sp.symbols(
        "q L x r", integer=True, nonnegative=True
    )
    states_q = direct.terminal_series(
        q, length, layer, return_states=True
    )
    states_lower = direct.terminal_series(
        q - 1, length, layer, return_states=True
    )

    def fixed_group(intersection: int) -> sp.Expr:
        remaining = layer - intersection
        group = 0
        for left_only in range(remaining + 1):
            right_only = remaining - left_only
            a_value = intersection + left_only
            b_value = intersection + right_only
            kernel = sum(
                sign
                * cross_polarization(
                    states_q,
                    states_lower,
                    phase_name,
                    a_value,
                    b_value,
                )
                for phase_name, sign in (
                    ("new", 1),
                    ("old", -1),
                    ("lower", -1),
                )
            )
            group += (
                sp.binomial(layer, intersection)
                * sp.binomial(remaining, left_only)
                * kernel
            )
        return group

    print(f"assembling j={layer} bottom pair", flush=True)
    bottom_pair = fixed_group(0) + fixed_group(1)
    positive_factor = (
        2
        * sp.factorial(q + x - 4)
        * sp.factorial(q + x - 2)
        / (
            sp.factorial(q)
            * sp.factorial(q - 2)
            * sp.factorial(x + 2 * layer + 2)
            * sp.factorial(x + 2 * layer + 4)
        )
    )
    print("normalizing stable range", flush=True)
    shifted = sp.factor(
        sp.combsimp(
            sp.expand(
                bottom_pair.subs(length, 2 * q - 4 + x)
            )
        )
    )
    remainder = sp.factor(sp.cancel(shifted / positive_factor))
    rank_shifted = sp.factor(
        sp.cancel(
            sp.expand_func(
                sp.combsimp(
                    sp.gammasimp(
                        remainder.subs(q, r + 5)
                    )
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
    negative_numerator = [
        (monomial, coefficient)
        for monomial, coefficient in numerator_terms
        if coefficient < 0
    ]
    negative_denominator = [
        (monomial, coefficient)
        for monomial, coefficient in denominator_terms
        if coefficient < 0
    ]
    canonical = "\n".join(
        f"{monomial}:{coefficient}"
        for monomial, coefficient in numerator_terms
    )
    passed = not negative_numerator and not negative_denominator
    report = {
        "status": (
            "PASS_PATH_ISOLATE_P4_BOTTOM_PAIR_FIXED_LAYER"
            if passed
            else "FAIL_PATH_ISOLATE_P4_BOTTOM_PAIR_FIXED_LAYER"
        ),
        "input_layer_j": layer,
        "quantity": "H(j,0)+H(j,1)",
        "domain": "q>=5, L>=2q-4",
        "shift": "q=5+r, L=2q-4+x",
        "positive_factor": str(positive_factor),
        "remainder": str(rank_shifted),
        "numerator_degree_r_x": list(
            numerator_poly.degree_list()
        ),
        "numerator_nonzero_monomial_count": len(
            numerator_terms
        ),
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
                "monomial_r_x": list(monomial),
                "coefficient": str(coefficient),
            }
            for monomial, coefficient in negative_numerator[:30]
        ],
        "numerator_sha256": hashlib.sha256(
            canonical.encode("utf-8")
        ).hexdigest(),
    }
    Path(
        "path_isolate_p4_bottom_pair_fixed_layer_"
        f"j{layer}_20260730.json"
    ).write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(report, indent=2))
    if not passed:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
