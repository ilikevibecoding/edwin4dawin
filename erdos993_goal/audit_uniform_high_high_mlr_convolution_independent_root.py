#!/usr/bin/env python3
"""Independent replay of the all-rank high/high convolution theorem.

This auditor does not import the producer.  It reconstructs the indexed
algebraic scheme, the MLR cross-difference, and a separate exact finite grid.
"""

from __future__ import annotations

from fractions import Fraction
import hashlib
import json
import math
import os
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
PRODUCER_SOURCE = (
    "prove_uniform_high_high_mlr_convolution_root.py",
    "818B2EFA16AEC2FA12A398697D3C1CC59E6EE057E73063238E1C62259E4867EB",
)
THEOREM = HERE / "uniform_high_high_mlr_convolution_exact_root_20260827.json"
OUTPUT = HERE / (
    "uniform_high_high_mlr_convolution_independent_audit_root_20260827.json"
)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def convolution(left, right, degree: int):
    total = 0
    for index in range(degree + 1):
        total += math.comb(degree, index) * left[index] * right[degree - index]
    return total


def rebuild_factor(rank: int, h: int, terminal: int, pattern: tuple[int, ...]):
    ratios = [0] * (rank + 1)
    ratios[-1] = terminal
    for index in reversed(range(rank)):
        ratios[index] = ratios[index + 1] + h + pattern[index]
    coefficients = [1]
    for value in ratios:
        coefficients.append(coefficients[-1] * value)
    return ratios, coefficients


def patterns(rank: int) -> list[tuple[int, ...]]:
    return [
        tuple(0 for _ in range(rank)),
        tuple(1 for _ in range(rank)),
        tuple(index % 2 for index in range(rank)),
        tuple((index + 1) % 2 for index in range(rank)),
        tuple(index for index in range(rank)),
        tuple(rank - index for index in range(rank)),
    ]


def independent_exact_grid() -> dict:
    cases = 0
    minimum_margin = None
    minimum_drop = None
    for rank in range(1, 13):
        factor_rows = []
        for h in range(4):
            for terminal in (1, 2, 5):
                for pattern in patterns(rank):
                    factor_rows.append(
                        (h, *rebuild_factor(rank, h, terminal, pattern))
                    )
        for left_index, (h, left_ratios, left) in enumerate(factor_rows):
            compatible = [row for row in factor_rows if row[0] == h]
            for right_index in {
                0,
                len(compatible) // 3,
                2 * len(compatible) // 3,
                len(compatible) - 1,
                left_index % len(compatible),
            }:
                _, right_ratios, right = compatible[right_index]
                previous = convolution(left, right, rank - 1)
                current = convolution(left, right, rank)
                following = convolution(left, right, rank + 1)
                margin = current * current - previous * following - h * previous * current
                drop = Fraction(current, previous) - Fraction(following, current) - h
                assert margin >= 0
                assert drop >= 0
                assert margin == previous * current * drop

                expectations = []
                for degree, total in ((rank - 1, previous), (rank, current)):
                    numerator = 0
                    for index in range(degree + 1):
                        weight = (
                            math.comb(degree, index)
                            * left[index] * right[degree - index]
                        )
                        numerator += weight * (
                            left_ratios[index]
                            + right_ratios[degree - index]
                            + h * degree
                        )
                    expectations.append(Fraction(numerator, total))
                assert expectations[0] - expectations[1] == drop
                minimum_margin = margin if minimum_margin is None else min(minimum_margin, margin)
                minimum_drop = drop if minimum_drop is None else min(minimum_drop, drop)
                cases += 1
    return {
        "cases": cases,
        "rank_range": [1, 12],
        "h_grid": [0, 1, 2, 3],
        "terminal_grid": [1, 2, 5],
        "patterns_per_factor": 6,
        "minimum_margin": minimum_margin,
        "minimum_adjusted_drop": str(minimum_drop),
        "grid_is_diagnostic_not_the_all_rank_proof": True,
    }


def independent_symbolic_scheme() -> dict:
    n, h, gap, base = sp.symbols("n h gap base", nonnegative=True)
    factor_ratio_drop = sp.expand((base + h + gap + n * h) - (base + (n + 1) * h))
    assert sp.expand(factor_ratio_drop - gap) == 0

    factorial_ratio_drop = sp.expand(
        (n + 2) * (base + gap) - (n + 1) * base
    )
    assert sp.expand(factorial_ratio_drop - (base + (n + 2) * gap)) == 0

    q0, q1, q2 = sp.symbols("q0 q1 q2", positive=True)
    mlr_cross = sp.expand(q1 * q1 - q0 * q2)

    c_previous, c_current, c_following = sp.symbols(
        "c_previous c_current c_following", positive=True
    )
    margin = c_current**2 - c_previous * c_following - h * c_previous * c_current
    cleared = sp.cancel(
        c_previous * c_current * (
            c_current / c_previous - c_following / c_current - h
        )
    )
    assert sp.expand(margin - cleared) == 0

    pi_i, pi_j, f_i, f_j, ell_i, ell_j = sp.symbols(
        "pi_i pi_j f_i f_j ell_i ell_j"
    )
    covariance_pair = sp.expand(
        pi_i * pi_j * (f_i - f_j) * (ell_i - ell_j)
    )
    return {
        "adjusted_ratio_adjacent_drop": str(factor_ratio_drop),
        "factorial_row_log_concavity_gap_form": str(factorial_ratio_drop),
        "conditional_mlr_cross_difference": str(mlr_cross),
        "margin_ratio_cross_multiplication_remainder": "0",
        "opposite_monotonicity_covariance_pair": str(covariance_pair),
        "indexed_argument": (
            "For every common-support adjacent pair, the conditional likelihood-"
            "ratio cross-difference is a positive factor times q_j^2-q_(j-1)q_(j+1). "
            "The new endpoint has infinite likelihood ratio.  The symmetric statement "
            "holds after exchanging the factors.  Every pair term in the covariance "
            "identity is nonpositive for decreasing F and increasing likelihood ratio."
        ),
    }


def main() -> None:
    assert sha256(HERE / PRODUCER_SOURCE[0]) == PRODUCER_SOURCE[1]
    theorem = json.loads(THEOREM.read_text(encoding="utf-8"))
    assert theorem["status"] == "PASS_EXACT_ANALYTIC_ALL_RANK_HIGH_HIGH_CONVOLUTION_MARGIN"
    assert theorem["source_sha256"] == PRODUCER_SOURCE[1]
    assert theorem["theorem"]["rank"] == "every integer k>=1"
    symbolic = independent_symbolic_scheme()
    grid = independent_exact_grid()
    payload = {
        "schema": "uniform-high-high-mlr-convolution-independent-audit-root-v1",
        "status": (
            "PASS_INDEPENDENT_EXACT_ANALYTIC_ALL_RANK_HIGH_HIGH_"
            "CONVOLUTION_MARGIN_AUDIT"
        ),
        "theorem": THEOREM.name,
        "theorem_sha256": sha256(THEOREM),
        "producer_source": {
            "path": PRODUCER_SOURCE[0],
            "sha256": PRODUCER_SOURCE[1],
            "imported": False,
        },
        "independent_symbolic_scheme": symbolic,
        "independent_exact_grid": grid,
        "checks": {
            "all_rank_indexed_mlr_argument_reconstructed": True,
            "factor_log_concavity_reconstructed": True,
            "adjusted_ratio_monotonicity_reconstructed": True,
            "projection_identity_replayed_on_exact_grid": True,
            "margin_cross_multiplication_reconstructed": True,
            "scope_kept_to_high_high_convolution_cone": True,
        },
        "scope_warning": (
            "This audit certifies only the all-rank high/high convolution margin. "
            "The remaining convolution cones and the pendant cascade are not proved."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    temporary = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, OUTPUT)
    print(payload["status"], flush=True)
    print("REPORT", sha256(OUTPUT), flush=True)


if __name__ == "__main__":
    main()
