#!/usr/bin/env python3
"""Certify concavity in the rank-(3,4,5) defect parameter D4.

Together with concavity in c6 and h5, this justifies reducing every
Delta^2--Delta^5 residual to the eight endpoint cells checked by the
companion verifier.
"""

from __future__ import annotations

import argparse

import sympy as sp

from explore_rank4_three_halves_grouped import (
    minimum_with_index,
    tensor_bernstein_fast,
)
from verify_rank6_terminal_bundle_delta2to5 import (
    abstract_numerator,
    clear_to_unit_box,
)
from verify_rank6_terminal_bundle_reduction import (
    c,
    exact_decomposition,
    h,
    newton_coefficients,
)


def verify_outer_concavity() -> None:
    differences = newton_coefficients(exact_decomposition())
    sums = {
        2: c[2] + c[3],
        3: c[1] + c[2],
        4: c[0] + c[1],
        5: c[0],
    }
    for rank, lower_sum in sums.items():
        assert sp.expand(
            sp.diff(differences[rank], c[6], 2)
            + 144 * h[4] * lower_sum
        ) == 0
        assert sp.expand(
            sp.diff(differences[rank], h[5], 2)
            + 140 * c[5] * lower_sum
        ) == 0


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--min-difference", type=int, default=2)
    parser.add_argument("--max-difference", type=int, default=5)
    parser.add_argument(
        "--root-endpoint",
        choices=("upper", "cross", "both"),
        default="both",
    )
    parser.add_argument(
        "--d5-endpoint",
        choices=("q5", "extension", "both"),
        default="both",
    )
    args = parser.parse_args()
    assert 2 <= args.min_difference <= args.max_difference <= 5
    verify_outer_concavity()
    roots = (
        ("upper", "cross")
        if args.root_endpoint == "both"
        else (args.root_endpoint,)
    )
    d5s = (
        ("q5", "extension")
        if args.d5_endpoint == "both"
        else (args.d5_endpoint,)
    )

    total = 0
    for rank in range(
        args.min_difference, args.max_difference + 1
    ):
        for root_endpoint in roots:
            for d5_endpoint in d5s:
                abstract, denominator, variables = (
                    abstract_numerator(
                        rank,
                        root_endpoint,
                        d5_endpoint,
                        "full",
                    )
                )
                d4 = variables[-1]
                assert d4 not in denominator.free_symbols
                concavity = sp.expand(-sp.diff(abstract, d4, 2))
                polynomial, box_variables, maxima = clear_to_unit_box(
                    concavity, variables
                )
                degrees, coefficients = tensor_bernstein_fast(
                    polynomial, box_variables
                )
                minimum, index = minimum_with_index(coefficients)
                print(
                    f"Delta^{rank} {root_endpoint}/{d5_endpoint}: "
                    f"abstract_terms="
                    f"{len(sp.Poly(concavity, *variables).terms())} "
                    f"maxima={maxima} degrees={degrees} "
                    f"minimum={minimum} index={index} "
                    f"coefficients={coefficients.size:,}",
                    flush=True,
                )
                if minimum < 0:
                    raise AssertionError(
                        "D4 concavity certificate failed"
                    )
                total += coefficients.size
    print(
        "rank-6 terminal-bundle D4 concavity: CERTIFIED "
        f"coefficients={total:,}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
