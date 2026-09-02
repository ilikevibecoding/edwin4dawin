#!/usr/bin/env python3
"""Deterministic exact falsification probe for the uniform low/low cone.

For a fixed rank k and scale h>0, a low factorial-ratio row has gaps

    delta_0 >= 2h,
    0 <= delta_1 < h,
    delta_1 + delta_2 >= 2h,
    delta_i >= h  (3 <= i < k).

The target is closure of

    M_k(c)=c_k^2-c_(k-1)c_(k+1)-h*c_(k-1)c_k

under binomial convolution of two such rows.  A negative exact row refutes
only this abstract cone assertion, not the forest conjecture.  Absence of a
negative row is finite evidence only.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import os
from pathlib import Path
import random


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "uniform_low_low_convolution_random_probe_root_20260828.json"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def sampled_slack(rng: random.Random) -> int:
    selector = rng.randrange(16)
    if selector < 6:
        return 0
    if selector < 10:
        return rng.randrange(1, 8)
    if selector < 13:
        return rng.randrange(8, 256)
    if selector < 15:
        return rng.randrange(256, 65536)
    return rng.randrange(65536, 1_000_001)


def low_gaps(rng: random.Random, rank: int, h: int) -> tuple[list[int], int]:
    r = rng.randrange(h)
    gaps = [2 * h + sampled_slack(rng), r]
    if rank >= 3:
        gaps.append(2 * h - r + sampled_slack(rng))
    gaps.extend(h + sampled_slack(rng) for _ in range(3, rank))
    assert len(gaps) == rank
    return gaps, r


def ratios_from_gaps(gaps: list[int], terminal: int) -> list[int]:
    ratios = [0] * (len(gaps) + 1)
    ratios[-1] = terminal
    for index in range(len(gaps) - 1, -1, -1):
        ratios[index] = ratios[index + 1] + gaps[index]
    return ratios


def coefficients(ratios: list[int]) -> list[int]:
    row = [1]
    for ratio in ratios:
        row.append(row[-1] * ratio)
    return row


def convolution_at(left: list[int], right: list[int], degree: int) -> int:
    return sum(
        math.comb(degree, index) * left[index] * right[degree - index]
        for index in range(degree + 1)
    )


def exact_case(
    rank: int,
    h: int,
    left_gaps: list[int],
    right_gaps: list[int],
    left_terminal: int,
    right_terminal: int,
) -> dict:
    left_ratios = ratios_from_gaps(left_gaps, left_terminal)
    right_ratios = ratios_from_gaps(right_gaps, right_terminal)
    left = coefficients(left_ratios)
    right = coefficients(right_ratios)
    c_previous = convolution_at(left, right, rank - 1)
    c_rank = convolution_at(left, right, rank)
    c_next = convolution_at(left, right, rank + 1)
    margin = c_rank * c_rank - c_previous * c_next - h * c_previous * c_rank
    denominator = c_previous * c_rank
    return {
        "rank": rank,
        "h": h,
        "left_gaps": left_gaps,
        "right_gaps": right_gaps,
        "left_terminal": left_terminal,
        "right_terminal": right_terminal,
        "left_ratios": left_ratios,
        "right_ratios": right_ratios,
        "c_previous": c_previous,
        "c_rank": c_rank,
        "c_next": c_next,
        "margin": margin,
        "normalized_numerator": margin,
        "normalized_denominator": denominator,
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--minimum-rank", type=int, default=8)
    parser.add_argument("--maximum-rank", type=int, default=32)
    parser.add_argument("--samples-per-rank", type=int, default=4000)
    parser.add_argument("--seed", type=int, default=993_20260828)
    parser.add_argument("--output", type=Path, default=OUTPUT)
    args = parser.parse_args()
    assert 3 <= args.minimum_rank <= args.maximum_rank
    assert args.samples_per_rank > 0

    rng = random.Random(args.seed)
    rank_rows = []
    global_best = None
    obstruction = None
    cases = 0
    for rank in range(args.minimum_rank, args.maximum_rank + 1):
        rank_best = None
        for _ in range(args.samples_per_rank):
            h = rng.randrange(1, 33)
            left_gaps, left_r = low_gaps(rng, rank, h)
            right_gaps, right_r = low_gaps(rng, rank, h)
            left_terminal = 1 + sampled_slack(rng)
            right_terminal = 1 + sampled_slack(rng)
            row = exact_case(
                rank,
                h,
                left_gaps,
                right_gaps,
                left_terminal,
                right_terminal,
            )
            cases += 1
            score = row["margin"] / row["normalized_denominator"]
            summary = {
                "score": score,
                "left_r": left_r,
                "right_r": right_r,
                "case": row,
            }
            if rank_best is None or score < rank_best["score"]:
                rank_best = summary
            if global_best is None or score < global_best["score"]:
                global_best = {"rank": rank, **summary}
            if row["margin"] < 0:
                obstruction = row
                break
        assert rank_best is not None
        rank_rows.append({
            "rank": rank,
            "cases": min(args.samples_per_rank, cases),
            "minimum_normalized_margin": repr(rank_best["score"]),
            "minimum_case": rank_best["case"],
        })
        print(
            "RANK", rank,
            "MIN_NORMALIZED_MARGIN", f"{rank_best['score']:.17g}",
            "SIGN", (rank_best["case"]["margin"] > 0) - (rank_best["case"]["margin"] < 0),
            flush=True,
        )
        if obstruction is not None:
            break

    payload = {
        "schema": "uniform-low-low-convolution-random-probe-root-v1",
        "status": (
            "EXACT_COUNTEREXAMPLE_TO_UNIFORM_ABSTRACT_LOW_LOW_CONVOLUTION_CONE"
            if obstruction is not None
            else "NO_COUNTEREXAMPLE_IN_DETERMINISTIC_EXACT_PROBE_EVIDENCE_ONLY"
        ),
        "target": (
            "For every k>=8, binomial convolution preserves the h-adjusted "
            "margin for two low rows satisfying delta0>=2h, 0<=delta1<h, "
            "delta1+delta2>=2h, and delta_i>=h for i>=3."
        ),
        "parameters": {
            "minimum_rank": args.minimum_rank,
            "maximum_rank": args.maximum_rank,
            "samples_per_rank": args.samples_per_rank,
            "seed": args.seed,
        },
        "exact_cases": cases,
        "rank_rows": rank_rows,
        "global_best": global_best,
        "exact_obstruction": obstruction,
        "scope_warning": (
            "A negative exact row refutes only the abstract low/low cone, not "
            "Erdos Problem 993. A clean finite probe is not a proof."
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
