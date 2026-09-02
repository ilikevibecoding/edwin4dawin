#!/usr/bin/env python3
"""All-order proof replay for the unsigned path-slice gamma factors.

Put

    P_M(u) = sum_i binom(2M-i-1,i) u^i.

This is the matching generating polynomial of the path on ``2M-1``
vertices, hence ``P_M(u)=prod_r(1+lambda_r u)`` with ``lambda_r>0``.
The binary homogenization of

    A_{M,s}(z)=sum_i [u^i]P_M(u) [u^(s-i)]P_M(u) z^i

is therefore

    e_s(lambda_1 x,lambda_1 y,...,lambda_{M-1}x,lambda_{M-1}y).

Elementary symmetric polynomials are real stable, and positive scaling and
diagonalization preserve stability.  Thus A_{M,s} is negative-rooted.  It
is palindromic, so reciprocal negative roots pair; under
``t=z/(1+z)^2`` its gamma polynomial is also negative-rooted.

The proof is algebraic and all order.  This script independently replays
the coefficient identities and exact Sturm conclusions on a finite range.
"""

from __future__ import annotations

import argparse
import json
import math
from pathlib import Path

from flint import fmpq, fmpq_poly

from probe_group_selector_gamma_root_pattern import (
    gamma_coefficients,
    root_count,
    sturm_chain,
)


HERE = Path(__file__).resolve().parent
REPORT = HERE / "path_slice_gamma_negative_rooted_theorem_20260805.json"


def choose(n: int, k: int) -> int:
    return math.comb(n, k) if 0 <= k <= n else 0


def path_matching_row(order: int) -> list[int]:
    return [choose(2 * order - i - 1, i) for i in range(order)]


def slice_row(order: int, layer: int) -> list[int]:
    matching = path_matching_row(order)
    return [
        (matching[i] if i < len(matching) else 0)
        * (matching[layer - i] if layer - i < len(matching) else 0)
        for i in range(layer + 1)
    ]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-order", type=int, default=50)
    parser.add_argument("--max-layer", type=int, default=30)
    parser.add_argument("--output", type=Path, default=REPORT)
    args = parser.parse_args()

    coefficient_checks = 0
    sturm_checks = 0
    maximum_gamma_degree = 0
    records = []
    for order in range(3, args.max_order + 1):
        checked_layers = 0
        # The forest application only needs the full-support range s<=M-1.
        for layer in range(min(args.max_layer, order - 1) + 1):
            row = slice_row(order, layer)
            assert row == list(reversed(row))
            for i, coefficient in enumerate(row):
                expected = choose(2 * order - i - 1, i) * choose(
                    2 * order - layer + i - 1, layer - i
                )
                assert coefficient == expected
                coefficient_checks += 1

            gamma = gamma_coefficients(row, layer)
            chain = sturm_chain(gamma)
            polynomial = fmpq_poly(gamma)
            negative = root_count(chain, "-inf", fmpq(0))
            assert negative == polynomial.degree()
            sturm_checks += 1
            checked_layers += 1
            maximum_gamma_degree = max(maximum_gamma_degree, polynomial.degree())
        records.append({"order": order, "checked_layers": checked_layers})

    report = {
        "status": "ALL_ORDER_PATH_SLICE_GAMMA_NEGATIVE_ROOTED_THEOREM",
        "theorem": (
            "A_{M,s} is the stable specialization of an elementary "
            "symmetric polynomial in duplicated positive path-matching "
            "eigenvalues; hence A_{M,s} and its palindromic gamma "
            "polynomial G_{M,s} are negative-rooted."
        ),
        "proof_dependencies": [
            "the matching polynomial of a path has only negative zeros",
            "multivariate elementary symmetric polynomials are real stable",
            "positive scaling and diagonalization preserve real stability",
            "palindromic negative roots occur in reciprocal pairs",
        ],
        "exact_replay": {
            "max_order": args.max_order,
            "max_layer": args.max_layer,
            "coefficient_checks": coefficient_checks,
            "exact_sturm_checks": sturm_checks,
            "maximum_gamma_degree": maximum_gamma_degree,
            "records": records,
        },
        "consequence": (
            "In the selector combination Gamma_s=G_{N,s}-2tG_{N-1,s}"
            "+t^2G_{N-2,s}, every unsigned component is now proved "
            "negative-rooted in all orders; only the signed three-size "
            "coupling remains."
        ),
    }
    args.output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report["exact_replay"], indent=2))
    print(args.output)


if __name__ == "__main__":
    main()
