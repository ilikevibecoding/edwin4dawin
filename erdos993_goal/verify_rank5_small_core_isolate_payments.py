#!/usr/bin/env python3
"""Exact small-core certificate for terminal-broom rank-5 payments.

For every rooted tree C of order at most 12, put H=C-root and
D_s=(1+x)^s C.  This verifier checks that the rooted payment M_s has
M_1>=0 and nonnegative forward differences at s=0.  Newton's formula
then gives M_s>=0 for every integer s>=1.
"""

from __future__ import annotations

import math

import sympy as sp

from scan_fixed_rank_leaf_curvature_fast import all_root_states
from scan_rank4_three_halves_leaf_finite import trees_of_order
from verify_rank5_leaf_induction_reduction import rooted_payment


ROOTED_COUNTS = {
    1: 1,
    2: 2,
    3: 3,
    4: 8,
    5: 15,
    6: 36,
    7: 77,
    8: 184,
    9: 423,
    10: 1060,
    11: 2585,
    12: 6612,
}

MINIMUM_M1 = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 70,
    6: 28_350,
    7: 760_050,
    8: 16_476_600,
    9: 200_420_800,
    10: 1_828_678_750,
    11: 12_116_460_900,
    12: 65_733_447_780,
}


def coefficient(polynomial, rank: int) -> int:
    return polynomial[rank] if rank < len(polynomial) else 0


def payment_values(core, deleted, count: int = 17):
    h = coefficient(deleted, 3)
    k = coefficient(deleted, 4)
    values = []
    for smoothing in range(count):
        smoothed = [
            sum(
                math.comb(smoothing, offset)
                * coefficient(core, rank - offset)
                for offset in range(min(smoothing, rank) + 1)
            )
            for rank in range(6)
        ]
        d, e, f = smoothed[3:6]
        values.append(rooted_payment(e + h, f + k, d, e, f))
    return values


def star_center_case() -> None:
    leaves = sp.symbols("leaves", integer=True, nonnegative=True)

    def choose(rank):
        return sp.prod(leaves - j for j in range(rank)) / sp.factorial(rank)

    d, e, f = choose(3), choose(4), choose(5)
    payment = sp.factor(rooted_payment(e, f, d, e, f))
    expected = (
        5
        * leaves**4
        * (leaves - 3) ** 2
        * (leaves - 2) ** 4
        * (leaves - 1) ** 4
        * (leaves + 1)
        / 82_944
    )
    assert sp.factor(payment - expected) == 0


def main() -> int:
    star_center_case()
    total = 0
    for order in range(1, 13):
        rooted = 0
        minimum_m1 = None
        minimum_differences = [None] * 15
        for tree in trees_of_order(order):
            deleted_by_root, core = all_root_states(tree, 5)
            for deleted in deleted_by_root.values():
                rooted += 1
                values = payment_values(core, deleted)
                m1 = values[1]
                minimum_m1 = (
                    m1 if minimum_m1 is None else min(minimum_m1, m1)
                )
                for difference_order in range(15):
                    values = [
                        values[index + 1] - values[index]
                        for index in range(len(values) - 1)
                    ]
                    value = values[0]
                    current = minimum_differences[difference_order]
                    minimum_differences[difference_order] = (
                        value if current is None else min(current, value)
                    )
        assert rooted == ROOTED_COUNTS[order]
        assert minimum_m1 == MINIMUM_M1[order]
        assert minimum_m1 >= 0
        assert all(value >= 0 for value in minimum_differences)
        total += rooted
        print(
            f"core_n={order} rooted={rooted:,} "
            f"min_M1={minimum_m1} "
            f"min_Delta1={minimum_differences[0]}",
            flush=True,
        )
    print(
        "small-core isolate-payment certificate: PASS "
        f"rooted_cores={total:,}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
