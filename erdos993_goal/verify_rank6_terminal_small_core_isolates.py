#!/usr/bin/env python3
"""Exact finite certificate for terminal-broom cores of orders 1--19.

The large-core symbolic certificate handles every tree core of order
at least 20.  This script enumerates every distinct truncated rooted
tree polynomial state through order 19.  For a core of order m it
starts at s=max(0,16-m), exactly the first sibling count compatible
with a terminal tree of order at least 18, and verifies that all ten
Newton forward differences of the terminal rank-6 margin are
nonnegative.  Hence the entire remaining tail is certified.
"""

from __future__ import annotations

from math import comb

from enumerate_rank6_rooted_polynomial_states import enumerate_states


EXPECTED_STATE_COUNTS = {
    1: 1,
    2: 1,
    3: 2,
    4: 4,
    5: 9,
    6: 20,
    7: 48,
    8: 114,
    9: 283,
    10: 699,
    11: 1756,
    12: 4379,
    13: 10853,
    14: 26615,
    15: 64046,
    16: 150850,
    17: 346187,
    18: 773337,
    19: 1678367,
}


def coefficient(polynomial, rank):
    return polynomial[rank] if rank < len(polynomial) else 0


def smoothed_coefficient(core, rank, smoothing):
    return sum(
        comb(smoothing, offset) * core[rank - offset]
        for offset in range(min(smoothing, rank) + 1)
    )


def reduced_margin(x, y, z, u, v):
    t = y + u
    total_next = z + v
    return (
        x * x
        + t * t
        + 2 * x * (t + y)
        + (26 * x + 2 * t) * total_next
        - 22 * y * t
    )


def margin_values(rooted_state, initial_smoothing):
    core, root_deleted = rooted_state
    u = coefficient(root_deleted, 3)
    v = coefficient(root_deleted, 4)
    values = []
    for smoothing in range(
        initial_smoothing, initial_smoothing + 11
    ):
        x, y, z = (
            smoothed_coefficient(core, rank, smoothing)
            for rank in (3, 4, 5)
        )
        values.append(reduced_margin(x, y, z, u, v))
    return values


def forward_differences(values):
    differences = []
    row = list(values)
    for _ in range(1, 11):
        row = [
            row[index + 1] - row[index]
            for index in range(len(row) - 1)
        ]
        differences.append(row[0])
    assert len(row) == 1
    return differences


def main() -> int:
    rooted_by_order, _ = enumerate_states(19)

    for order in range(1, 20):
        states = rooted_by_order[order]
        assert len(states) == EXPECTED_STATE_COUNTS[order]
        initial_smoothing = max(0, 16 - order)
        minima = [None] * 10
        witnesses = [None] * 10
        minimum_base = None
        base_witness = None

        for state in states:
            values = margin_values(state, initial_smoothing)
            if minimum_base is None or values[0] < minimum_base:
                minimum_base = values[0]
                base_witness = state
            for index, value in enumerate(
                forward_differences(values)
            ):
                if minima[index] is None or value < minima[index]:
                    minima[index] = value
                    witnesses[index] = state

        assert minimum_base is not None
        assert minimum_base > 0
        assert all(value >= 0 for value in minima)
        print(
            f"core_order={order} initial_s={initial_smoothing} "
            f"states={len(states):,} "
            f"minimum_S0={minimum_base} "
            f"forward_difference_minima={minima}",
            flush=True,
        )
        print(
            f"  base_witness={base_witness} "
            f"difference_witnesses={witnesses}",
            flush=True,
        )

    print(
        "rank-6 terminal small-core isolate certificate: PASS "
        "(all rooted polynomial states through core order 19)"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
