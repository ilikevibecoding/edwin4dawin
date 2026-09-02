#!/usr/bin/env python3
"""Exact-integer random search for the four pending low/low auxiliaries.

Exploration only.  A negative output is an abstract cone/auxiliary obstruction,
not a tree counterexample.  A positive search is not a proof.
"""

from __future__ import annotations

import argparse
import math
import random


def coefficients_from_gaps(terminal: int, gaps: list[int]) -> tuple[list[int], list[int]]:
    ratios = [0] * 9
    ratios[8] = terminal
    for index in range(7, -1, -1):
        ratios[index] = ratios[index + 1] + gaps[index]
    coefficients = [1]
    for ratio in ratios:
        coefficients.append(coefficients[-1] * ratio)
    return ratios, coefficients


def convolution(left: list[int], right: list[int], rank: int) -> int:
    return sum(
        math.comb(rank, index) * left[index] * right[rank - index]
        for index in range(rank + 1)
    )


def tail_data(left: list[int], right: list[int], h: int) -> tuple[int, int, int, int]:
    head = left[:3] + [0] * 7
    tail = [0] * 3 + left[3:]
    u7, u8, u9 = (convolution(head, right, rank) for rank in (7, 8, 9))
    v7, v8, v9 = (convolution(tail, right, rank) for rank in (7, 8, 9))
    m0 = (u8 + v8) ** 2 - (u7 + v7) * (u9 + v9) - h * (u7 + v7) * (u8 + v8)
    derivative = 2 * (u8 + v8) * v8 - v7 * (u9 + v9) - (u7 + v7) * v9
    derivative -= h * (v7 * (u8 + v8) + (u7 + v7) * v8)
    curvature = v8 * v8 - v7 * v9 - h * v7 * v8
    return m0, derivative, curvature, u7 + v7


def log_integer(rng: random.Random) -> int:
    # Includes exact zero and large separated scales.
    if rng.randrange(6) == 0:
        return 0
    return rng.randrange(1, 10) * 10 ** rng.randrange(0, 7)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--samples", type=int, default=200_000)
    parser.add_argument("--seed", type=int, default=993_8_82)
    args = parser.parse_args()
    rng = random.Random(args.seed)
    minima = {"curvature": None, "strong": None}
    witnesses = {}
    for sample in range(args.samples):
        h = rng.randrange(1, 10)
        left_slacks = [log_integer(rng) for _ in range(7)]
        right_slacks = [log_integer(rng) for _ in range(7)]
        t = rng.randrange(h + 1)
        left_gaps = [2 * h + left_slacks[0], h, h + left_slacks[1]]
        left_gaps.extend(h + value for value in left_slacks[2:])
        right_gaps = [2 * h + right_slacks[0], h - t, h + t + right_slacks[1]]
        right_gaps.extend(h + value for value in right_slacks[2:])
        ta, tb = log_integer(rng), log_integer(rng)
        left_ratios, left = coefficients_from_gaps(ta, left_gaps)
        right_ratios, right = coefficients_from_gaps(tb, right_gaps)
        m0, derivative, curvature, _ = tail_data(left, right, h)
        strong = left_ratios[2] * m0 + h * derivative
        for label, value in (("curvature", curvature), ("strong", strong)):
            scale = max(1, abs(m0))
            score = value / scale
            if minima[label] is None or score < minima[label]:
                minima[label] = score
                witnesses[label] = {
                    "sample": sample,
                    "h": h,
                    "t": t,
                    "left_terminal": ta,
                    "right_terminal": tb,
                    "left_slacks": left_slacks,
                    "right_slacks": right_slacks,
                    "left_ratios": left_ratios,
                    "right_ratios": right_ratios,
                    "M0": m0,
                    "derivative": derivative,
                    "curvature": curvature,
                    "strong": strong,
                    "normalized_score": score,
                }
            if value < 0:
                print("NEGATIVE_AUXILIARY_NOT_TREE_COUNTEREXAMPLE", label)
                print(witnesses[label])
                return
    print("NO_NEGATIVE_IN_EXACT_INTEGER_RANDOM_SEARCH_NOT_PROOF")
    print({"samples": args.samples, "minima": minima, "witnesses": witnesses})


if __name__ == "__main__":
    main()
