#!/usr/bin/env python3
"""Certify fixed-intersection P4 groups in the stable path range.

For output input-layer j and intersection count h, this constructs

  binom(j,h) sum_u binom(j-h,u) Q(h+u,j-u),

where Q is the exact distinguished-isolate kernel.  After the stable
shifts it divides by the positive P4 factorial factor and checks
coefficientwise positivity in r=q-5 and x=L-(2q-4).
"""

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
    parser.add_argument("--minimum-layer", type=int, default=1)
    parser.add_argument("--maximum-layer", type=int, default=2)
    parser.add_argument(
        "--only-full-intersection", action="store_true"
    )
    parser.add_argument("--intersection", type=int)
    args = parser.parse_args()
    minimum = args.minimum_layer
    maximum = args.maximum_layer
    if minimum < 1 or maximum < minimum:
        raise ValueError("require 1 <= minimum <= maximum")

    q, length, x, r = sp.symbols(
        "q L x r", integer=True, nonnegative=True
    )
    states_q = direct.terminal_series(
        q, length, maximum, return_states=True
    )
    states_lower = direct.terminal_series(
        q - 1, length, maximum, return_states=True
    )
    certificates = []
    for layer in range(minimum, maximum + 1):
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
        if args.intersection is not None:
            if not 0 <= args.intersection <= layer:
                raise ValueError(
                    "intersection must lie between 0 and layer"
                )
            intersections = [args.intersection]
        elif args.only_full_intersection:
            intersections = [layer]
        else:
            intersections = range(layer + 1)
        for intersection in intersections:
            print(
                f"normalizing j={layer}, h={intersection}",
                flush=True,
            )
            group = 0
            remaining = layer - intersection
            for left_only in range(remaining + 1):
                right_only = remaining - left_only
                a = intersection + left_only
                b = intersection + right_only
                kernel = sum(
                    sign
                    * cross_polarization(
                        states_q,
                        states_lower,
                        phase_name,
                        a,
                        b,
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
            shifted = sp.factor(
                sp.combsimp(
                    sp.expand(
                        group.subs(length, 2 * q - 4 + x)
                    )
                )
            )
            remainder = sp.factor(
                sp.cancel(shifted / positive_factor)
            )
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
            numerator_poly = sp.Poly(
                sp.expand(numerator), r, x
            )
            denominator_poly = sp.Poly(
                sp.expand(denominator), r, x
            )
            terms = numerator_poly.terms()
            negative_numerator = [
                (monomial, coefficient)
                for monomial, coefficient in terms
                if coefficient < 0
            ]
            negative_denominator = [
                (monomial, coefficient)
                for monomial, coefficient
                in denominator_poly.terms()
                if coefficient < 0
            ]
            assert not negative_numerator
            assert not negative_denominator
            canonical = "\n".join(
                f"{monomial}:{coefficient}"
                for monomial, coefficient in terms
            )
            certificates.append(
                {
                    "input_layer_j": layer,
                    "intersection_h": intersection,
                    "numerator_degree_r_x": list(
                        numerator_poly.degree_list()
                    ),
                    "numerator_nonzero_monomial_count": len(
                        terms
                    ),
                    "smallest_numerator_coefficient": min(
                        int(coefficient)
                        for _, coefficient in terms
                    ),
                    "denominator": str(denominator),
                    "canonical_numerator_sha256": (
                        hashlib.sha256(
                            canonical.encode("utf-8")
                        ).hexdigest()
                    ),
                }
            )

    report = {
        "status": (
            "PASS_PATH_ISOLATE_P4_INTERSECTION_GROUPS"
        ),
        "certified_input_layers": list(
            range(minimum, maximum + 1)
        ),
        "only_full_intersection": args.only_full_intersection,
        "requested_intersection": args.intersection,
        "domain": "q>=5, L>=2q-4",
        "shift": "q=5+r, L=2q-4+x",
        "group_definition": (
            "binom(j,h) sum_(u=0)^(j-h) "
            "binom(j-h,u) Q(h+u,j-u)"
        ),
        "certificates": certificates,
    }
    Path(
        "path_isolate_p4_intersection_group_certificates_"
        + (
            f"j{minimum}_to_{maximum}_h{args.intersection}_20260730.json"
            if args.intersection is not None
            else
            f"j{minimum}_to_{maximum}_full_20260730.json"
            if args.only_full_intersection
            else "20260730.json"
        )
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
