#!/usr/bin/env python3
"""Verify the binomially normalized central convolution theorem."""

from __future__ import annotations

import argparse
import json
import math
import random
from pathlib import Path

import sympy as sp


def symbolic_rooted_cascade_identity() -> bool:
    k = sp.symbols("k", positive=True, integer=True)
    a, b, c, q0, q1, q2 = sp.symbols(
        "a b c q0 q1 q2"
    )
    p0, p1, p2 = a + q0, b + q1, c + q2

    def gsb(previous, current, following):
        return (
            k * current**2
            + previous * current
            - (k + 1) * previous * following
        )

    diagonal = b * b + 2 * b * q1
    off_diagonal = a * c + q0 * c + a * q2
    left = k * diagonal - (k + 1) * off_diagonal
    right = (
        gsb(p0, p1, p2)
        - gsb(q0, q1, q2)
        - b * p0
        - a * q1
    )
    return sp.expand(left - right) == 0


def band(order: int, cutoff: int) -> list[int]:
    return [
        math.comb(order, rank)
        if cutoff <= rank <= order - cutoff
        else 0
        for rank in range(order + 1)
    ]


def convolution(a: list[int], b: list[int]) -> list[int]:
    out = [0] * (len(a) + len(b) - 1)
    for i, left in enumerate(a):
        for j, right in enumerate(b):
            out[i + j] += left * right
    return out


def is_binomially_central(sequence: list[int]) -> bool:
    order = len(sequence) - 1
    if sequence != sequence[::-1]:
        return False
    return all(
        (order - rank) * sequence[rank]
        <= (rank + 1) * sequence[rank + 1]
        for rank in range(order // 2)
    )


def boundary_flow(
    m: int,
    s: int,
    n: int,
    t: int,
    k: int,
    h: list[int],
) -> tuple[int, int, int]:
    def choose(order: int, rank: int) -> int:
        return (
            math.comb(order, rank)
            if 0 <= rank <= order
            else 0
        )

    def good_y(y: int) -> bool:
        return t <= y <= n - t

    def good_x(x: int) -> bool:
        return s <= x <= m - s

    y_enter = k - s + 1
    y_leave = k - m + s
    x_enter = k - t + 1
    x_leave = k - n + t

    entering = (
        s
        * choose(m, s)
        * choose(n, y_enter)
        * int(good_y(y_enter))
        + t
        * choose(n, t)
        * choose(m, x_enter)
        * int(good_x(x_enter))
    )
    leaving = (
        s
        * choose(m, s)
        * choose(n, y_leave)
        * int(good_y(y_leave))
        + t
        * choose(n, t)
        * choose(m, x_leave)
        * int(good_x(x_leave))
    )

    edge_identity = (
        (k + 1) * h[k + 1]
        - (m + n - k) * h[k]
        == entering - leaving
    )
    return entering, leaving, int(edge_identity)


def random_central_sequence(
    order: int, rng: random.Random
) -> list[int]:
    deltas = [
        rng.randrange(0, 11) for _ in range(order // 2 + 1)
    ]
    sequence = [0] * (order + 1)
    for cutoff, weight in enumerate(deltas):
        if weight:
            piece = band(order, cutoff)
            for rank, value in enumerate(piece):
                sequence[rank] += weight * value
    return sequence


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--max-order", type=int, default=30)
    parser.add_argument("--random-trials", type=int, default=20_000)
    parser.add_argument("--seed", type=int, default=993_20260729)
    parser.add_argument(
        "--output",
        type=Path,
        default=Path(
            "binomial_central_convolution_certificate_20260729.json"
        ),
    )
    args = parser.parse_args()

    symbolic = symbolic_rooted_cascade_identity()
    band_pairs = 0
    rank_checks = 0
    flow_checks = 0
    first_failure = None

    for m in range(args.max_order + 1):
        for s in range(m // 2 + 1):
            a = band(m, s)
            for n in range(args.max_order + 1):
                for t in range(n // 2 + 1):
                    b = band(n, t)
                    h = convolution(a, b)
                    band_pairs += 1
                    for k in range((m + n) // 2):
                        rank_checks += 1
                        entering, leaving, identity = boundary_flow(
                            m, s, n, t, k, h
                        )
                        flow_checks += 1
                        if (
                            not identity
                            or entering < leaving
                            or (m + n - k) * h[k]
                            > (k + 1) * h[k + 1]
                        ):
                            first_failure = {
                                "m": m,
                                "s": s,
                                "n": n,
                                "t": t,
                                "k": k,
                                "entering": entering,
                                "leaving": leaving,
                                "edge_identity": bool(identity),
                            }
                            break
                    if first_failure:
                        break
                if first_failure:
                    break
            if first_failure:
                break
        if first_failure:
            break

    rng = random.Random(args.seed)
    random_checks = 0
    random_failure = None
    if first_failure is None:
        for trial in range(args.random_trials):
            m = rng.randrange(args.max_order + 1)
            n = rng.randrange(args.max_order + 1)
            a = random_central_sequence(m, rng)
            b = random_central_sequence(n, rng)
            h = convolution(a, b)
            random_checks += 1
            if (
                not is_binomially_central(a)
                or not is_binomially_central(b)
                or not is_binomially_central(h)
            ):
                random_failure = {
                    "trial": trial,
                    "m": m,
                    "n": n,
                }
                break

    passed = (
        symbolic
        and first_failure is None
        and random_failure is None
    )
    report = {
        "status": "PASS" if passed else "FAIL",
        "symbolic_rooted_cascade_identity": symbolic,
        "max_order": args.max_order,
        "central_band_pairs": band_pairs,
        "rank_checks": rank_checks,
        "boundary_flow_checks": flow_checks,
        "random_conic_checks": random_checks,
        "first_band_failure": first_failure,
        "first_random_failure": random_failure,
    }
    args.output.write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
