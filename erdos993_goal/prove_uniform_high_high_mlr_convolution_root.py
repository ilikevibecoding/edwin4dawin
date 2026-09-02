#!/usr/bin/env python3
"""All-rank high/high factorial-convolution margin by conditional MLR.

The finite exact replays are diagnostics.  The theorem is the indexed
likelihood-ratio argument recorded in the report and companion proof note.
"""

from __future__ import annotations

from fractions import Fraction
import hashlib
import json
import math
import os
from pathlib import Path
import random

import sympy as sp


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "uniform_high_high_mlr_convolution_exact_root_20260827.json"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def convolution(left, right, degree: int):
    return sum(
        math.comb(degree, index) * left[index] * right[degree - index]
        for index in range(degree + 1)
    )


def symbolic_scheme_replay(maximum_rank: int = 12) -> dict:
    a = sp.symbols(f"a0:{maximum_rank + 2}", nonzero=True)
    b = sp.symbols(f"b0:{maximum_rank + 2}", nonzero=True)
    h = sp.Symbol("h")
    projection_rows = []
    margin_rows = []
    for rank in range(1, maximum_rank + 1):
        for degree in (rank - 1, rank):
            c_degree = convolution(a, b, degree)
            projected = sum(
                math.comb(degree, index) * a[index] * b[degree - index]
                * (a[index + 1] / a[index]
                   + b[degree - index + 1] / b[degree - index])
                for index in range(degree + 1)
            )
            assert sp.cancel(projected - convolution(a, b, degree + 1)) == 0
        c_previous = convolution(a, b, rank - 1)
        c_rank = convolution(a, b, rank)
        c_next = convolution(a, b, rank + 1)
        margin = c_rank**2 - c_previous * c_next - h * c_previous * c_rank
        ratio = c_previous * c_rank * (
            c_rank / c_previous - c_next / c_rank - h
        )
        assert sp.cancel(margin - ratio) == 0
        projection_rows.append(rank)
        margin_rows.append(rank)

    n, ratio, gap = sp.symbols("n ratio gap", nonnegative=True)
    factor_lc = sp.expand((n + 2) * (ratio + gap) - (n + 1) * ratio)
    assert sp.expand(factor_lc - (ratio + (n + 2) * gap)) == 0
    adjusted_drop = sp.expand((h + gap) - h)
    assert adjusted_drop == gap

    q_previous, q_current, q_next = sp.symbols(
        "q_previous q_current q_next", positive=True
    )
    likelihood_cross_difference = sp.expand(
        q_current**2 - q_previous * q_next
    )
    return {
        "symbolic_projection_ranks": projection_rows,
        "symbolic_margin_ranks": margin_rows,
        "generic_factor_log_concavity_gap_form": str(factor_lc),
        "generic_adjusted_ratio_drop": str(adjusted_drop),
        "generic_conditional_mlr_cross_difference": str(
            likelihood_cross_difference
        ),
        "finite_symbolic_range_is_scheme_replay_not_rank_bound": True,
    }


def high_factor(rank: int, h: int, terminal: int, slacks: list[int]):
    assert len(slacks) == rank
    ratios = [0] * (rank + 1)
    ratios[rank] = terminal
    for index in range(rank - 1, -1, -1):
        ratios[index] = ratios[index + 1] + h + slacks[index]
    coefficients = [1]
    for value in ratios:
        coefficients.append(coefficients[-1] * value)
    return ratios, coefficients


def exact_diagnostic(cases: int = 2048) -> dict:
    rng = random.Random(993_20260827)
    minimum_margin = None
    minimum_drop = None
    per_rank = {rank: 0 for rank in range(1, 33)}
    for _ in range(cases):
        rank = rng.randint(1, 32)
        h = rng.randint(0, 20)
        left_ratios, left = high_factor(
            rank, h, rng.randint(1, 20),
            [rng.randint(0, 30) for _ in range(rank)],
        )
        right_ratios, right = high_factor(
            rank, h, rng.randint(1, 20),
            [rng.randint(0, 30) for _ in range(rank)],
        )
        c_previous = convolution(left, right, rank - 1)
        c_rank = convolution(left, right, rank)
        c_next = convolution(left, right, rank + 1)
        margin = c_rank * c_rank - c_previous * c_next - h * c_previous * c_rank
        assert margin >= 0
        drop = Fraction(c_rank, c_previous) - Fraction(c_next, c_rank) - h
        assert drop >= 0

        conditional = []
        for degree, total in ((rank - 1, c_previous), (rank, c_rank)):
            value = Fraction(0)
            for index in range(degree + 1):
                weight = (
                    math.comb(degree, index)
                    * left[index] * right[degree - index]
                )
                value += Fraction(
                    weight * (
                        left_ratios[index]
                        + right_ratios[degree - index]
                        + h * degree
                    ),
                    total,
                )
            conditional.append(value)
        assert conditional[0] - conditional[1] == drop
        minimum_margin = margin if minimum_margin is None else min(minimum_margin, margin)
        minimum_drop = drop if minimum_drop is None else min(minimum_drop, drop)
        per_rank[rank] += 1
    return {
        "cases": cases,
        "seed": 993_20260827,
        "rank_range": [1, 32],
        "per_rank_counts": per_rank,
        "minimum_margin": minimum_margin,
        "minimum_adjusted_drop": str(minimum_drop),
        "diagnostic_only": True,
    }


def main() -> None:
    symbolic = symbolic_scheme_replay()
    diagnostic = exact_diagnostic()
    payload = {
        "schema": "uniform-high-high-mlr-convolution-root-v1",
        "status": "PASS_EXACT_ANALYTIC_ALL_RANK_HIGH_HIGH_CONVOLUTION_MARGIN",
        "theorem": {
            "rank": "every integer k>=1",
            "assumptions": (
                "positive factorial rows a,b with A_i-A_(i+1)>=h and "
                "B_i-B_(i+1)>=h for 0<=i<k, h>=0"
            ),
            "conclusion": "c_k^2-c_(k-1)c_(k+1)-h*c_(k-1)c_k>=0",
        },
        "proof_chain": [
            "Put p_i=a_i/i! and q_i=b_i/i!; their adjacent ratios are nonincreasing, so p and q are log-concave.",
            "For W_z(i) proportional to p_i q_(z-i), W_(z+1)/W_z is nondecreasing in i because its adjacent cross-differences are q-log-concavity minors; hence X|X+Y=z+1 MLR-dominates X|X+Y=z, and symmetrically for Y.",
            "F_i=A_i+i*h and G_i=B_i+i*h are nonincreasing because each adjacent drop is the assumed ratio gap minus h.",
            "The binomial-convolution projection identity is c_(z+1)/c_z+h*z=E[F_X+G_Y|X+Y=z].",
            "Apply the two MLR comparisons to the decreasing F and G from z=k-1 to z=k, obtaining c_k/c_(k-1)-c_(k+1)/c_k>=h; clear the positive denominator.",
            "Zero terminal entries follow by truncation or continuity.",
        ],
        "symbolic_scheme_replay": symbolic,
        "exact_diagnostic": diagnostic,
        "scope_warning": (
            "This closes the high/high convolution cone uniformly in rank. "
            "It does not prove the low/high or low/low cones, connected Q_k, "
            "the pendant cascade, unimodality, or Erdos Problem 993."
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
