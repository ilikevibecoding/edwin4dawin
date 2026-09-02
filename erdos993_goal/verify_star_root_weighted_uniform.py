#!/usr/bin/env python3
"""Verify the identities in the weighted-subset/uniform-branch note."""

from __future__ import annotations

from fractions import Fraction
from itertools import combinations, product
from math import comb

from find_min_star_root_pird_failure import build


def verify_weight_formula(branches: tuple[int, ...]) -> None:
    offsets: list[tuple[tuple[int, ...], int]] = []
    start = 0
    for leaves in branches:
        block = tuple(range(start, start + leaves))
        offsets.append((block, start))
        start += leaves
    k_poly, l_poly, _ = build(branches)
    assert l_poly == [comb(start, j) for j in range(start + 1)]
    for j in range(start + 1):
        weighted = 0
        for chosen in combinations(range(start), j):
            selected = set(chosen)
            m = sum(
                selected.intersection(block) == {canonical}
                for block, canonical in offsets
            )
            weighted += 2**m
        assert weighted == k_poly[j], (branches, j, weighted, k_poly[j])


def verify_uniform(s: int) -> None:
    k_poly, _, b_poly = build((1,) * s)
    for k in range(s + 1):
        delta = (
            b_poly[k + 1] * k_poly[k]
            - b_poly[k] * (k_poly[k + 1] if k < s else 0)
        )
        if k == 0:
            assert delta == 2
        elif k < s:
            q = Fraction(
                1,
                1,
            ) + Fraction(1, 2**k) * (
                (k + 1) - Fraction(2 * k * (s - k), s - k + 2)
            )
            predicted = (
                Fraction(k_poly[k] ** 2 * (s + 1),
                         (k + 1) * (s - k + 1))
                * q
            )
            assert predicted.denominator == 1
            assert delta == predicted.numerator, (s, k, delta, predicted)
            assert q > 0
        else:
            assert delta > 0


def main() -> int:
    for branch_count in range(1, 5):
        for branches in product(range(1, 5), repeat=branch_count):
            verify_weight_formula(branches)
    for s in range(1, 201):
        verify_uniform(s)
    print(
        "PASS: weighted-subset identity for 340 labelled branch lists; "
        "uniform-branch factorization for 1 <= s <= 200"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
