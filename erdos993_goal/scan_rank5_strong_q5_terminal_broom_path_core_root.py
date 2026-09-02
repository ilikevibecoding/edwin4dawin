#!/usr/bin/env python3
"""Scan exact strong-Q5 payments for terminal brooms with path cores."""

from __future__ import annotations

import argparse
import math

from verify_rank5_leaf_induction_reduction import rooted_payment


def path_polynomial(order: int, rank: int = 6) -> list[int]:
    return [
        math.comb(order - degree + 1, degree)
        if order - degree + 1 >= degree
        else 0
        for degree in range(rank + 1)
    ]


def convolve(left: list[int], right: list[int], rank: int = 6) -> list[int]:
    out = [0] * (rank + 1)
    for i, first in enumerate(left):
        for j, second in enumerate(right):
            if i + j <= rank:
                out[i + j] += first * second
    return out


def add(left: list[int], right: list[int]) -> list[int]:
    return [first + second for first, second in zip(left, right)]


def shift(polynomial: list[int]) -> list[int]:
    return [0] + polynomial[:-1]


def q5(polynomial: list[int]) -> int:
    return (
        10 * polynomial[5] ** 2
        - polynomial[4] * polynomial[5]
        - 12 * polynomial[4] * polynomial[6]
    )


def five_strong_reserve(polynomial: list[int]) -> int:
    return 5 * q5(polynomial) - polynomial[4] * polynomial[5]


def row(core_order: int, siblings: int, root: int) -> dict[str, int]:
    core = path_polynomial(core_order)
    isolates = [math.comb(siblings, rank) for rank in range(7)]
    deleted_root = convolve(
        path_polynomial(root),
        path_polynomial(core_order - root - 1),
    )
    support_deleted = convolve(core, isolates)
    B = add(support_deleted, shift(deleted_root))
    G = add(B, shift(support_deleted))
    d, e, f = support_deleted[3:6]
    h, k = deleted_root[3:5]
    a, b = B[4:6]
    payment = rooted_payment(a, b, d, e, f)
    target = a * d * e * (a + d)
    margin = payment - target
    old_reserve = five_strong_reserve(B)
    new_reserve = five_strong_reserve(G)
    identity_numerator = d * (a + d) * old_reserve + margin
    assert identity_numerator == a * d * new_reserve
    assert new_reserve >= 0
    return {
        "core_order": core_order,
        "siblings": siblings,
        "root": root,
        "payment_margin": margin,
        "old_five_reserve": old_reserve,
        "new_five_reserve": new_reserve,
        "i3_support_deleted": d,
        "i4_support_deleted": e,
        "i4_B": a,
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--minimum-core", type=int, default=20)
    parser.add_argument("--maximum-core", type=int, default=500)
    parser.add_argument("--siblings", type=int, default=13)
    args = parser.parse_args()
    minimum_margin = None
    minimum_margin_row = None
    minimum_new = None
    minimum_new_row = None
    negative_margins = 0
    rows = 0
    for core_order in range(args.minimum_core, args.maximum_core + 1):
        for root in range((core_order + 1) // 2):
            item = row(core_order, args.siblings, root)
            rows += 1
            if item["payment_margin"] < 0:
                negative_margins += 1
            if minimum_margin is None or item["payment_margin"] < minimum_margin:
                minimum_margin = item["payment_margin"]
                minimum_margin_row = item
            if minimum_new is None or item["new_five_reserve"] < minimum_new:
                minimum_new = item["new_five_reserve"]
                minimum_new_row = item
    print("ROWS", rows)
    print("NEGATIVE_PAYMENT_MARGINS", negative_margins)
    print("MINIMUM_PAYMENT_MARGIN", minimum_margin_row)
    print("MINIMUM_NEW_FIVE_RESERVE", minimum_new_row)
    print("PASS_EXACT_PATH_CORE_SCAN_NOT_ALL_TREE_PROOF")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
