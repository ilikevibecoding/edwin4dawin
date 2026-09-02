#!/usr/bin/env python3
"""Enumerate products made solely from rank-5 small tree factors."""

from __future__ import annotations

from explore_rank5_fixed_small_convolution import (
    small_tree_polynomials,
)
from scan_pgc_all_forest_polynomials import multiply
from scan_q_cascade_all_forest_polynomials import q_reserve


def main() -> int:
    small = small_tree_polynomials()
    states: list[set[tuple[int, ...]]] = [set() for _ in range(11)]
    states[0].add((1,))
    changed = True
    rounds = 0
    while changed:
        rounds += 1
        changed = False
        for alpha in range(11):
            for left in tuple(states[alpha]):
                for factor in small:
                    new_alpha = alpha + len(factor) - 1
                    if new_alpha > 10:
                        continue
                    product = multiply(left, factor)
                    if product not in states[new_alpha]:
                        states[new_alpha].add(product)
                        changed = True
        print(
            f"round={rounds} counts={tuple(len(level) for level in states)}",
            flush=True,
        )
    for alpha in range(6, 11):
        values = [q_reserve(poly, 5) for poly in states[alpha]]
        print(
            f"alpha={alpha} count={len(values)} "
            f"minimum={min(values)} negative={sum(value < 0 for value in values)}",
            flush=True,
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
