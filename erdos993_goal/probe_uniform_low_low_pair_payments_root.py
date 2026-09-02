#!/usr/bin/env python3
"""Exact probe for a local-pair proof of the uniform low/low cone.

The factorial pair identity has exactly two adverse natural terms for two
low rows: the (1,2) pair on each side.  This probe tests whether the symmetric
four-pair payment used in the low/high strong theorem pays each adverse term
separately:

  same side: (0,1), (0,3), (2,3)
  opposite side: (k-3,k-2).

A failed payment disproves only this proposed decomposition, not the full
low/low cone.  A clean probe is evidence only.
"""

from __future__ import annotations

import argparse
from fractions import Fraction
import hashlib
import json
import math
import os
from pathlib import Path
import random


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "uniform_low_low_pair_payments_probe_root_20260828.json"


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
    gaps = [2 * h + sampled_slack(rng), r, 2 * h - r + sampled_slack(rng)]
    gaps.extend(h + sampled_slack(rng) for _ in range(3, rank))
    return gaps, r


def ratios_from_gaps(gaps: list[int], terminal: int) -> list[int]:
    ratios = [0] * (len(gaps) + 1)
    ratios[-1] = terminal
    for index in range(len(gaps) - 1, -1, -1):
        ratios[index] = ratios[index + 1] + gaps[index]
    return ratios


def factorial_row(ratios: list[int]) -> list[Fraction]:
    row = [Fraction(1)]
    for index, ratio in enumerate(ratios):
        row.append(row[-1] * Fraction(ratio, index + 1))
    return row


def value(row: list[Fraction], index: int) -> Fraction:
    return row[index] if 0 <= index < len(row) else Fraction(0)


def kernel(row: list[Fraction], rank: int, first: int, second: int) -> Fraction:
    return (
        value(row, rank - 1 - first) * value(row, rank - second)
        - value(row, rank - first) * value(row, rank - 1 - second)
    )


def pair_terms(
    left: list[Fraction],
    right: list[Fraction],
    left_ratios: list[int],
    right_ratios: list[int],
    rank: int,
    h: int,
) -> tuple[dict[tuple[int, int], Fraction], dict[tuple[int, int], Fraction]]:
    adjusted_left = [Fraction(left_ratios[i] + i * h) for i in range(rank + 1)]
    adjusted_right = [Fraction(right_ratios[i] + i * h) for i in range(rank + 1)]
    left_terms = {}
    right_terms = {}
    for first in range(rank + 1):
        for second in range(first + 1, rank + 1):
            left_terms[(first, second)] = (
                left[first] * left[second]
                * (adjusted_left[first] - adjusted_left[second])
                * kernel(right, rank, first, second)
            )
            right_terms[(first, second)] = (
                right[first] * right[second]
                * (adjusted_right[first] - adjusted_right[second])
                * kernel(left, rank, first, second)
            )
    return left_terms, right_terms


def payment_case(rank: int, h: int, left_gaps, right_gaps, left_terminal, right_terminal) -> dict:
    left_ratios = ratios_from_gaps(left_gaps, left_terminal)
    right_ratios = ratios_from_gaps(right_gaps, right_terminal)
    left = factorial_row(left_ratios)
    right = factorial_row(right_ratios)
    left_terms, right_terms = pair_terms(
        left, right, left_ratios, right_ratios, rank, h
    )
    assert [key for key, value_ in left_terms.items() if value_ < 0] == [(1, 2)]
    assert [key for key, value_ in right_terms.items() if value_ < 0] == [(1, 2)]
    local = [(0, 1), (0, 3), (2, 3)]
    remote = (rank - 3, rank - 2)
    left_payment = sum(left_terms[key] for key in local) + right_terms[remote]
    right_payment = sum(right_terms[key] for key in local) + left_terms[remote]
    left_surplus = left_payment + left_terms[(1, 2)]
    right_surplus = right_payment + right_terms[(1, 2)]
    total = sum(left_terms.values()) + sum(right_terms.values())
    return {
        "rank": rank,
        "h": h,
        "left_gaps": left_gaps,
        "right_gaps": right_gaps,
        "left_terminal": left_terminal,
        "right_terminal": right_terminal,
        "left_ratios": left_ratios,
        "right_ratios": right_ratios,
        "left_adverse": str(left_terms[(1, 2)]),
        "right_adverse": str(right_terms[(1, 2)]),
        "left_selected_payment": str(left_payment),
        "right_selected_payment": str(right_payment),
        "left_surplus": str(left_surplus),
        "right_surplus": str(right_surplus),
        "left_surplus_sign": (left_surplus > 0) - (left_surplus < 0),
        "right_surplus_sign": (right_surplus > 0) - (right_surplus < 0),
        "complete_pair_margin": str(total),
        "complete_margin_sign": (total > 0) - (total < 0),
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--minimum-rank", type=int, default=8)
    parser.add_argument("--maximum-rank", type=int, default=24)
    parser.add_argument("--samples-per-rank", type=int, default=2000)
    parser.add_argument("--seed", type=int, default=993_20260828)
    parser.add_argument("--output", type=Path, default=OUTPUT)
    args = parser.parse_args()
    rng = random.Random(args.seed)
    failure = None
    cases = 0
    minimum_left = None
    minimum_right = None
    for rank in range(args.minimum_rank, args.maximum_rank + 1):
        rank_failures = 0
        for _ in range(args.samples_per_rank):
            h = rng.randrange(1, 33)
            left_gaps, _ = low_gaps(rng, rank, h)
            right_gaps, _ = low_gaps(rng, rank, h)
            row = payment_case(
                rank,
                h,
                left_gaps,
                right_gaps,
                1 + sampled_slack(rng),
                1 + sampled_slack(rng),
            )
            cases += 1
            left_surplus = Fraction(row["left_surplus"])
            right_surplus = Fraction(row["right_surplus"])
            minimum_left = left_surplus if minimum_left is None else min(minimum_left, left_surplus)
            minimum_right = right_surplus if minimum_right is None else min(minimum_right, right_surplus)
            if left_surplus < 0 or right_surplus < 0:
                rank_failures += 1
                failure = row
                break
        print("RANK", rank, "FAILURES", rank_failures, flush=True)
        if failure is not None:
            break
    payload = {
        "schema": "uniform-low-low-pair-payments-probe-root-v1",
        "status": (
            "EXACT_COUNTEREXAMPLE_TO_SELECTED_SYMMETRIC_FOUR_PAIR_PAYMENT"
            if failure is not None
            else "NO_COUNTEREXAMPLE_TO_SELECTED_PAYMENT_IN_EXACT_PROBE_EVIDENCE_ONLY"
        ),
        "parameters": vars(args) | {"output": str(args.output)},
        "exact_cases": cases,
        "minimum_left_surplus": str(minimum_left),
        "minimum_right_surplus": str(minimum_right),
        "exact_failure": failure,
        "scope_warning": (
            "A failure refutes only the selected separate payment. A clean "
            "finite probe is not a proof of the low/low cone."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    output = args.output.resolve()
    temporary = output.with_suffix(output.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, output)
    print(payload["status"], flush=True)
    print("REPORT", sha256(output), flush=True)
    return 2 if failure is not None else 0


if __name__ == "__main__":
    raise SystemExit(main())
