#!/usr/bin/env python3
"""Exact finite extension of the quartic discriminant cone to p=15,16.

This is a finite probe, not an all-order propagation theorem.  It reuses the
same exact construction and tensor Bernstein conversion as the two minimal
boundary certificates, now at the first nonminimal odd and even orders.
"""

from __future__ import annotations

import argparse
import json
import time
from collections import defaultdict
from pathlib import Path

from flint import fmpq

from prove_two_outlier_two_negative_minimal_boundary import (
    bernstein_uv,
    exact_replay,
    polynomial_digest,
    transformed_polynomial,
)


HERE = Path(__file__).resolve().parent
REPORT = HERE / "two_outlier_two_negative_next_boundaries_probe_20260805.json"
EXPECTED = {
    (15, 2): {
        "power_terms": 25082,
        "power_negative": 12489,
        "bernstein_positive": 28054,
        "strict_support": 169,
    },
    (16, 3): {
        "power_terms": 46074,
        "power_negative": 22885,
        "bernstein_positive": 49950,
        "strict_support": 225,
    },
}


def derive(p: int, alpha: int, random_trials: int) -> dict[str, object]:
    expected = EXPECTED[p, alpha]
    started = time.perf_counter()
    transformed = transformed_polynomial(p, alpha)
    discriminant = transformed.discriminant(0)
    discriminant_seconds = time.perf_counter() - started
    coefficients = {
        (monomial[1], monomial[2], monomial[3], monomial[4]): coefficient
        for monomial, coefficient in discriminant.to_dict().items()
    }
    degrees = tuple(discriminant.degrees()[index] for index in range(1, 5))
    assert degrees == (
        2 * (p // 2) - 2,
        2 * (p // 2) - 2,
        4 * (p // 2) - 4,
        2 * (p // 2) - 2,
    )
    assert len(coefficients) == expected["power_terms"]
    assert sum(value < 0 for value in coefficients.values()) == expected["power_negative"]

    started_bernstein = time.perf_counter()
    bernstein = bernstein_uv(coefficients, degrees[0], degrees[1])
    bernstein_seconds = time.perf_counter() - started_bernstein
    assert len(bernstein) == expected["bernstein_positive"]
    assert all(value > 0 for value in bernstein.values())

    strict_support: dict[tuple[int, int], list[int]] = defaultdict(list)
    for (i, j, q_degree, z_degree), coefficient in bernstein.items():
        if z_degree == 0 and coefficient > 0:
            strict_support[i, j].append(q_degree)
    assert len(strict_support) == expected["strict_support"]
    assert all(
        bernstein.get((j, i, q_degree, z_degree), fmpq(0)) == coefficient
        for (i, j, q_degree, z_degree), coefficient in bernstein.items()
    )

    replay = exact_replay(
        transformed, coefficients, p, alpha, random_trials
    )
    return {
        "window": {"p": p, "alpha": alpha, "degree": p // 2},
        "discriminant_degrees_u_v_q_z": list(degrees),
        "power_basis_term_count": len(coefficients),
        "power_basis_negative_coefficient_count": sum(
            value < 0 for value in coefficients.values()
        ),
        "bernstein_positive_coefficient_count": len(bernstein),
        "bernstein_negative_coefficient_count": 0,
        "strict_z_zero_support_index_count": len(strict_support),
        "discriminant_scale_invariant_digest": polynomial_digest(
            coefficients, scale_invariant=True
        ),
        "bernstein_scale_invariant_digest": polynomial_digest(
            bernstein, scale_invariant=True
        ),
        "exact_replay": replay,
        "timings_seconds_non_certificate_metadata": {
            "transform_and_discriminant": discriminant_seconds,
            "bernstein_conversion": bernstein_seconds,
        },
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--random-trials", type=int, default=8)
    parser.add_argument("--output", type=Path, default=REPORT)
    parser.add_argument(
        "--case", choices=("15", "16", "both"), default="both"
    )
    args = parser.parse_args()
    cases = {
        "15": [(15, 2)],
        "16": [(16, 3)],
        "both": [(15, 2), (16, 3)],
    }[args.case]
    records = [derive(p, alpha, args.random_trials) for p, alpha in cases]
    report = {
        "status": "PASS_EXACT_FINITE_QUARTIC_BOUNDARY_EXTENSION",
        "records": records,
        "scope": (
            "These exact finite orders support, but do not prove, propagation "
            "along the infinite p-alpha=13 boundary."
        ),
    }
    args.output.write_text(
        json.dumps(report, indent=2, default=int) + "\n", encoding="utf-8"
    )
    print(
        json.dumps(
            {
                "status": report["status"],
                "records": [
                    {
                        "window": record["window"],
                        "bernstein_positive": record[
                            "bernstein_positive_coefficient_count"
                        ],
                        "bernstein_negative": record[
                            "bernstein_negative_coefficient_count"
                        ],
                        "digest": record["bernstein_scale_invariant_digest"],
                    }
                    for record in records
                ],
            },
            indent=2,
            default=int,
        ),
        flush=True,
    )
    print(args.output, flush=True)


if __name__ == "__main__":
    main()
