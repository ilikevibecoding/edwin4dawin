#!/usr/bin/env python3
"""Test whether two arbitrary partially synchronized pairs cross-convolve."""

from __future__ import annotations

import argparse
import json
import random
from math import comb
from pathlib import Path

from toeplitz_pair_closure_search import (
    add,
    is_log_concave,
    mul,
    partial_failure,
    random_log_concave_polynomial,
)


def random_partial_pair(rng: random.Random):
    while True:
        a = random_log_concave_polynomial(rng, rng.randint(0, 9))
        b = random_log_concave_polynomial(rng, rng.randint(0, 9))
        if partial_failure(a, b) is None:
            return a, b


def strongly_synchronized(a: list[int], b: list[int]) -> bool:
    upper = max(len(a), len(b))
    for k in range(1, upper):
        center = min(
            a[k] if k < len(a) else 0,
            b[k] if k < len(b) else 0,
        )
        previous = max(
            a[k - 1] if k - 1 < len(a) else 0,
            b[k - 1] if k - 1 < len(b) else 0,
        )
        following = max(
            a[k + 1] if k + 1 < len(a) else 0,
            b[k + 1] if k + 1 < len(b) else 0,
        )
        if center * center < previous * following:
            return False
    return True


def random_strong_pair(rng: random.Random):
    while True:
        degree = rng.randint(0, 7)
        a = random_log_concave_polynomial(rng, degree)
        # Nearby multiplicative perturbations give a useful acceptance rate.
        b = [
            max(0, value + rng.randint(-max(1, value // 8), max(1, value // 8)))
            for value in a
        ]
        if b:
            b[0] = 1
        if (
            is_log_concave(b)
            and strongly_synchronized(a, b)
        ):
            return a, b


def random_ordered_partial_pair(
    rng: random.Random,
    normalized: bool = False,
    normalized_gap: int = 2,
):
    while True:
        u = random_log_concave_polynomial(rng, rng.randint(0, 10))
        w = [0]
        for value in u[1:]:
            w.append(rng.randint(0, max(2, 2 * value)))
        if normalized:
            if len(w) == 1:
                w.append(normalized_gap)
                if len(u) == 1:
                    u.append(rng.randint(1, 80))
            else:
                w[1] = normalized_gap
        # Occasionally extend V beyond U's support.
        for _ in range(rng.randint(0, 3)):
            w.append(rng.randint(0, max(2, w[-1] if w else 2)))
        v = add(u, w)
        if is_log_concave(v) and partial_failure(u, v) is None:
            return u, v


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--trials", type=int, default=100_000)
    parser.add_argument("--seed", type=int, default=993)
    parser.add_argument("--first-strong", action="store_true")
    parser.add_argument("--special-kernel-r", type=int)
    parser.add_argument("--ordered-second", action="store_true")
    parser.add_argument("--normalized-second", action="store_true")
    parser.add_argument("--normalized-both", action="store_true")
    parser.add_argument("--normalized-gap", type=int, default=2)
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("cross_partial_convolution_falsifier.json"),
    )
    args = parser.parse_args()
    rng = random.Random(args.seed)
    failure = None
    for trial in range(args.trials):
        if args.normalized_both:
            a, b = random_ordered_partial_pair(
                rng, True, args.normalized_gap
            )
        elif args.special_kernel_r is not None:
            b = [
                comb(args.special_kernel_r, i)
                for i in range(args.special_kernel_r + 1)
            ]
            a = b[:]
            a[1] += 2
        else:
            a, b = (
                random_strong_pair(rng)
                if args.first_strong
                else random_partial_pair(rng)
            )
        if args.normalized_both:
            c, d = random_ordered_partial_pair(
                rng, True, args.normalized_gap
            )
        else:
            c, d = (
                random_ordered_partial_pair(
                    rng, args.normalized_second, args.normalized_gap
                )
                if args.ordered_second
                else random_partial_pair(rng)
            )
        ac = mul(a, c)
        bd = mul(b, d)
        found = partial_failure(ac, bd)
        if found:
            failure = {
                "trial": trial,
                "A": a,
                "B": b,
                "C": c,
                "D": d,
                "A_times_C": ac,
                "B_times_D": bd,
                **found,
            }
            break
    report = {
        "status": "counterexample" if failure else "no_failure",
        "trials_requested": args.trials,
        "first_pair_strong": args.first_strong,
        "special_kernel_r": args.special_kernel_r,
        "second_pair_ordered": args.ordered_second,
        "second_pair_normalized": args.normalized_second,
        "both_pairs_normalized": args.normalized_both,
        "normalized_gap": args.normalized_gap,
        "trials_completed": (
            failure["trial"] + 1 if failure else args.trials
        ),
        "first_failure": failure,
    }
    args.output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
