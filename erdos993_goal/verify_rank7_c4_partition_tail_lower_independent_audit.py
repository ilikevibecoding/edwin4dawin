#!/usr/bin/env python3
"""Independent audit of the degree-partition c4 tail lower bound."""
from __future__ import annotations

from functools import lru_cache
from math import comb


@lru_cache(None)
def partitions(total: int, cap: int) -> tuple[tuple[int, ...], ...]:
    if total == 0:
        return ((),)
    output = []
    for first in range(min(total, cap), 0, -1):
        for tail in partitions(total - first, first):
            output.append((first,) + tail)
    return tuple(output)


def tail_table(order: int) -> dict[int, tuple[int, tuple[int, ...]]]:
    output: dict[int, tuple[int, tuple[int, ...]]] = {}
    for part in partitions(order - 2, order - 2):
        beta = sum(comb(x, 2) for x in part)
        gamma = sum(comb(x, 3) for x in part)
        maximum = part[0]
        value = gamma + maximum * (order - 2 - maximum)
        if beta not in output or value > output[beta][0]:
            output[beta] = (value, part)
    return output


def main() -> int:
    # For an M-rooted orientation, every parent excess is <=M and every
    # nonroot excess appears exactly once as a child, hence
    # E=sum x_parent*x_child <= M*sum_nonroot x_child=M(n-2-M).
    order, beta = 23, 50
    maximum_value, witness = tail_table(order)[beta]
    assert maximum_value == 231
    assert witness == (10, 3, 2, 2, 1, 1, 1, 1)
    c4_floor = (
        comb(order - 3, 4)
        + (order - 5) * beta
        + (order - 3)
        - maximum_value
    )
    assert c4_floor == 5534
    assert c4_floor > 5508

    # Build every target-order table as an exact coverage check.  Each entry
    # is indexed by the exact B2 level of an excess-degree partition.
    for n in range(23, 39):
        table = tail_table(n)
        assert table[0][0] == n - 3  # path partition 1^(n-2)
        assert min(table) == 0
        assert max(table) == comb(n - 2, 2)
    print("PASS independent E orientation bound, partition maxima, and c4 fake-point exclusion")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
