#!/usr/bin/env python3
"""Deterministic falsification probe for the all-rank low/high tail auxiliary.

For a target rank k, a high base row has ratio gaps

    delta_0 >= 2h, delta_1 = h, delta_i >= h (2 <= i < k),

and its low-cone perturbation multiplies coefficients of indices at least
three by lambda.  If c is the convolution with a high partner and v is the
corresponding tail convolution, write

    M(c) = c_k^2-c_(k-1)c_(k+1)-h*c_(k-1)c_k,
    d    = 2 B(c,v),
    H    = A_2 M(c) + h d.

The rank-eight proof establishes H>=0 on the complete cone.  This script asks
whether the same abstract assertion even survives at higher ranks.  Numeric
screening is used only to rank candidates; every reported obstruction is
replayed with exact Python integers.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import os
import random
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "uniform_low_high_strong_auxiliary_random_probe_root_20260826.json"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def sampled_slack(rng: random.Random) -> int:
    selector = rng.randrange(12)
    if selector < 4:
        return 0
    if selector < 7:
        return rng.randrange(1, 8)
    if selector < 10:
        return rng.randrange(8, 256)
    return rng.randrange(256, 1_000_001)


def ratios_from_gaps(gaps: list[int], terminal: int) -> list[int]:
    ratios = [0] * (len(gaps) + 1)
    ratios[-1] = terminal
    for index in range(len(gaps) - 1, -1, -1):
        ratios[index] = ratios[index + 1] + gaps[index]
    return ratios


def coefficients_float(ratios: list[int]) -> list[float]:
    coefficients = [1.0]
    for ratio in ratios:
        coefficients.append(coefficients[-1] * float(ratio))
    scale = max(coefficients)
    return [value / scale for value in coefficients]


def coefficients_exact(ratios: list[int]) -> list[int]:
    coefficients = [1]
    for ratio in ratios:
        coefficients.append(coefficients[-1] * ratio)
    return coefficients


def convolution_at(left, right, rank: int):
    return sum(
        math.comb(rank, index) * left[index] * right[rank - index]
        for index in range(rank + 1)
    )


def triple(left, right, rank: int) -> tuple:
    return tuple(convolution_at(left, right, value) for value in (rank - 1, rank, rank + 1))


def quadratic_parts(left, right, rank: int, h: int = 1) -> tuple:
    tail = [0, 0, 0, *left[3:]]
    c0, c1, c2 = triple(left, right, rank)
    v0, v1, v2 = triple(tail, right, rank)
    margin = c1 * c1 - c0 * c2 - h * c0 * c1
    derivative = (
        2 * c1 * v1 - c0 * v2 - v0 * c2
        - h * (c0 * v1 + v0 * c1)
    )
    tail_margin = v1 * v1 - v0 * v2 - h * v0 * v1
    return margin, derivative, tail_margin


def numeric_candidate(left_ratios: list[int], right_ratios: list[int], rank: int):
    left = coefficients_float(left_ratios)
    right = coefficients_float(right_ratios)
    margin, derivative, tail_margin = quadratic_parts(left, right, rank)
    capacity = left_ratios[2]
    strong = capacity * margin + derivative
    normalization = (
        abs(capacity * margin) + abs(derivative) + abs(tail_margin) + 1e-300
    )
    return strong / normalization, strong, margin, derivative, tail_margin


def exact_candidate(left_ratios: list[int], right_ratios: list[int], rank: int):
    left = coefficients_exact(left_ratios)
    right = coefficients_exact(right_ratios)
    margin, derivative, tail_margin = quadratic_parts(left, right, rank)
    capacity = left_ratios[2]
    strong = capacity * margin + derivative
    return {
        "rank": rank,
        "left_ratios": left_ratios,
        "right_ratios": right_ratios,
        "capacity_A2": capacity,
        "base_margin": margin,
        "tail_derivative": derivative,
        "tail_margin": tail_margin,
        "strong_auxiliary": strong,
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--minimum-rank", type=int, default=9)
    parser.add_argument("--maximum-rank", type=int, default=24)
    parser.add_argument("--samples-per-rank", type=int, default=20_000)
    parser.add_argument("--seed", type=int, default=993_20260826)
    parser.add_argument("--output", type=Path, default=OUTPUT)
    args = parser.parse_args()
    assert 5 <= args.minimum_rank <= args.maximum_rank
    assert args.samples_per_rank > 0

    rng = random.Random(args.seed)
    rank_rows = []
    global_best = None
    obstruction = None
    exact_checks = 0

    for rank in range(args.minimum_rank, args.maximum_rank + 1):
        rank_best = None
        for _ in range(args.samples_per_rank):
            left_gaps = [2 + sampled_slack(rng), 1] + [
                1 + sampled_slack(rng) for _ in range(2, rank)
            ]
            right_gaps = [2 + sampled_slack(rng)] + [
                1 + sampled_slack(rng) for _ in range(1, rank)
            ]
            left_terminal = 1 + sampled_slack(rng)
            right_terminal = 1 + sampled_slack(rng)
            left_ratios = ratios_from_gaps(left_gaps, left_terminal)
            right_ratios = ratios_from_gaps(right_gaps, right_terminal)
            score, strong, margin, derivative, tail_margin = numeric_candidate(
                left_ratios, right_ratios, rank
            )
            row = {
                "score": score,
                "numeric_strong": strong,
                "numeric_base_margin": margin,
                "numeric_derivative": derivative,
                "numeric_tail_margin": tail_margin,
                "left_ratios": left_ratios,
                "right_ratios": right_ratios,
            }
            if rank_best is None or score < rank_best["score"]:
                rank_best = row
            if global_best is None or score < global_best["score"]:
                global_best = {"rank": rank, **row}
            if score < -1e-10:
                exact = exact_candidate(left_ratios, right_ratios, rank)
                exact_checks += 1
                assert exact["base_margin"] >= 0
                assert exact["tail_margin"] >= 0
                if exact["strong_auxiliary"] < 0:
                    obstruction = exact
                    break
        exact_best = exact_candidate(
            rank_best["left_ratios"], rank_best["right_ratios"], rank
        )
        exact_checks += 1
        rank_rows.append({
            "rank": rank,
            "samples": args.samples_per_rank,
            "best_numeric_score": rank_best["score"],
            "best_exact": exact_best,
        })
        print(
            "RANK", rank, "BEST_SCORE", f"{rank_best['score']:.17g}",
            "EXACT_SIGN", (exact_best["strong_auxiliary"] > 0)
            - (exact_best["strong_auxiliary"] < 0),
            flush=True,
        )
        if obstruction is not None:
            break

    payload = {
        "schema": "uniform-low-high-strong-auxiliary-random-probe-root-v1",
        "status": (
            "EXACT_COUNTEREXAMPLE_TO_UNIFORM_ABSTRACT_STRONG_AUXILIARY"
            if obstruction is not None
            else "NO_COUNTEREXAMPLE_IN_DETERMINISTIC_RANDOM_PROBE_EVIDENCE_ONLY"
        ),
        "target": (
            "For every rank k, every high base with delta0>=2h, delta1=h, "
            "delta_i>=h, and every high partner, A2*M0+h*M'(1)>=0."
        ),
        "parameters": {
            "minimum_rank": args.minimum_rank,
            "maximum_rank": args.maximum_rank,
            "samples_per_rank": args.samples_per_rank,
            "seed": args.seed,
            "h": 1,
        },
        "rank_rows": rank_rows,
        "global_best_numeric": global_best,
        "exact_obstruction": obstruction,
        "exact_candidate_replays": exact_checks,
        "scope_warning": (
            "A negative exact row refutes only the abstract strong auxiliary, "
            "not Erdos Problem 993. Absence of a row is finite evidence only."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    output = args.output.resolve()
    temporary = output.with_suffix(output.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, output)
    print(payload["status"], flush=True)
    print("REPORT", sha256(output), flush=True)
    return 2 if obstruction is not None else 0


if __name__ == "__main__":
    raise SystemExit(main())
